#include "PluginEditor.h"
#include "CloudFileReader.h"
#include <WebUIData.h>
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstring>

namespace MidiPreviewer
{

namespace
{
    juce::WebBrowserComponent::Resource makeWebResource(const char* data, int size, const char* mimeType)
    {
        std::vector<std::byte> bytes(static_cast<size_t>(std::max(0, size)));
        if (size > 0 && data != nullptr)
            std::memcpy(bytes.data(), data, static_cast<size_t>(size));

        return juce::WebBrowserComponent::Resource { std::move(bytes), juce::String(mimeType) };
    }

    juce::var unwrapPayload(const juce::var& v)
    {
        if (v.isArray() && v.size() == 1 && v[0].isObject())
            return v[0];
        return v;
    }

    juce::String maskHomeDirectoryPath(const juce::File& file)
    {
        const juce::File homeDir = juce::File::getSpecialLocation(juce::File::userHomeDirectory);
        if (homeDir.exists() && file.isAChildOf(homeDir))
            return "~/" + file.getRelativePathFrom(homeDir).replaceCharacter('\\', '/');
        return file.getFileName();
    }

    void pruneTempExportsDirectory(const juce::File& tempDir)
    {
        if (!tempDir.isDirectory())
            return;
        const juce::Time cutoff = juce::Time::getCurrentTime() - juce::RelativeTime::hours(24);
        for (const auto& existing : tempDir.findChildFiles(juce::File::findFiles, false, "*.mid"))
        {
            if (existing.getLastModificationTime() < cutoff)
                existing.deleteFile();
        }
    }

    juce::String loadFileToBase64(const juce::File& file, int cloudTimeoutMs, juce::String& outError)
    {
        constexpr juce::int64 maxMidiBytes = 16 * 1024 * 1024;
        if (file.existsAsFile() && file.getSize() > maxMidiBytes)
        {
            outError = "MIDI file exceeds the 16 MB safety limit.";
            return {};
        }

       #if defined(__APPLE__)
        auto res = readFileWithCloudHydration(file, cloudTimeoutMs);
        if (res.success && !res.bytes.empty())
            return juce::Base64::toBase64(res.bytes.data(), res.bytes.size());

        outError = res.errorMessage;
        return {};
       #else
        juce::ignoreUnused(cloudTimeoutMs);
        if (!file.existsAsFile())
        {
            outError = "File not found or folder permission was denied by the host.";
            return {};
        }
        juce::MemoryBlock mb;
        if (!file.loadFileAsData(mb) || mb.getSize() == 0)
        {
            outError = "File is empty or could not be read from disk.";
            return {};
        }
        return juce::Base64::toBase64(mb.getData(), mb.getSize());
       #endif
    }
} // namespace

MidiPreviewerAudioProcessorEditor::MidiPreviewerAudioProcessorEditor(MidiPreviewerAudioProcessor& p)
    : AudioProcessorEditor(&p),
      audioProcessor(p)
{
    auto options = juce::WebBrowserComponent::Options{}
        .withNativeIntegrationEnabled()
        .withResourceProvider(
            [this](const juce::String& url) -> std::optional<juce::WebBrowserComponent::Resource>
            {
                return getResource(url);
            })
        .withEventListener("frontendReady", [this](juce::var) { handleFrontendReady(); })
        .withEventListener("syncSequence", [this](juce::var payload) { handleSyncSequence(payload); })
        .withEventListener("syncParams", [this](juce::var payload) { handleSyncParams(payload); })
        .withEventListener("transportCommand", [this](juce::var payload) { handleTransportCommand(payload); })
        .withEventListener("auditionNote", [this](juce::var payload) { handleAuditionNote(payload); })
        .withEventListener("nativeScanFolder", [this](juce::var) { handleNativeScanFolder(); })
        .withEventListener("nativeOpenFile", [this](juce::var) { handleNativeOpenFile(); })
        .withEventListener("nativeLoadFile", [this](juce::var payload) { handleNativeLoadFile(payload); })
        .withEventListener("nativeSaveMidi", [this](juce::var payload) { handleNativeSaveMidi(payload); })
        .withEventListener("nativeDragMidiToDaw", [this](juce::var payload) { handleNativeDragMidiToDaw(payload); })
        .withEventListener("saveUiState", [this](juce::var payload) { handleSaveUiState(payload); })
        .withEventListener("clearScannedLibrary", [this](juce::var) { handleClearScannedLibrary(); })
        .withEventListener("rescanSavedFolders", [this](juce::var) { handleRescanSavedFolders(); });

    webBrowser = std::make_unique<juce::WebBrowserComponent>(options);
    addAndMakeVisible(*webBrowser);

    setResizable(true, true);
    setResizeLimits(920, 620, 2560, 1600);
    setSize(1200, 760);

    webBrowser->goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
    startTimerHz(30);
}

MidiPreviewerAudioProcessorEditor::~MidiPreviewerAudioProcessorEditor()
{
    stopTimer();
    isFrontendReady = false;
    if (libraryStreamCancelFlag != nullptr)
        libraryStreamCancelFlag->store(true, std::memory_order_relaxed);
    activeFileChooser.reset();
    webBrowser.reset();
}

void MidiPreviewerAudioProcessorEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour(0xff141618));
}

void MidiPreviewerAudioProcessorEditor::resized()
{
    if (webBrowser != nullptr)
        webBrowser->setBounds(getLocalBounds());
}

std::optional<juce::WebBrowserComponent::Resource> MidiPreviewerAudioProcessorEditor::getResource(const juce::String& url)
{
    juce::String path = url;

    const int queryIdx = path.indexOfChar('?');
    if (queryIdx >= 0)
        path = path.substring(0, queryIdx);

    const int hashIdx = path.indexOfChar('#');
    if (hashIdx >= 0)
        path = path.substring(0, hashIdx);

    if (path.contains("://"))
    {
        const int schemeEnd = path.indexOf("://") + 3;
        const int slashIdx = path.indexOf(schemeEnd, "/");
        path = (slashIdx >= 0) ? path.substring(slashIdx) : "/";
    }

    while (path.startsWithChar('/'))
        path = path.substring(1);

    if (path.isEmpty() || path.equalsIgnoreCase("index.html"))
        return makeWebResource(WebUIData::index_html, WebUIData::index_htmlSize, "text/html; charset=utf-8");

    if (path.equalsIgnoreCase("app.css") || path.endsWithIgnoreCase("/app.css"))
        return makeWebResource(WebUIData::app_css, WebUIData::app_cssSize, "text/css; charset=utf-8");

    if (path.equalsIgnoreCase("app.js") || path.endsWithIgnoreCase("/app.js"))
        return makeWebResource(WebUIData::app_js, WebUIData::app_jsSize, "text/javascript; charset=utf-8");

    if (path.equalsIgnoreCase("icon.svg") || path.endsWithIgnoreCase("/icon.svg"))
        return makeWebResource(WebUIData::icon_svg, WebUIData::icon_svgSize, "image/svg+xml");

    return std::nullopt;
}

void MidiPreviewerAudioProcessorEditor::handleFrontendReady()
{
    isFrontendReady = true;

    // Immediately restore UI sequence/params & known folder list without touching disk or walking folders
    const juce::String savedJson = audioProcessor.getSavedUiStateJson();
    const auto folders = audioProcessor.getScannedFolders();

    if (savedJson.isNotEmpty() || !folders.empty())
    {
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("stateJson", savedJson);

        juce::Array<juce::var> foldersArr;
        for (const auto& folderPath : folders)
            foldersArr.add(folderPath);
        obj->setProperty("scannedFolders", foldersArr);

        if (webBrowser != nullptr)
            webBrowser->emitEventIfBrowserIsVisible("restorePluginState", juce::var(obj.get()));
    }

    // Load cached global library asynchronously in background (or instant memory hit) & stream in chunks
    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    audioProcessor.loadGlobalLibraryAsync([safeThis]()
    {
        if (safeThis == nullptr || !safeThis->isFrontendReady || safeThis->webBrowser == nullptr)
            return;

        safeThis->streamLibraryToWebView(false);
    });
}

void MidiPreviewerAudioProcessorEditor::handleSyncSequence(const juce::var& rawPayload)
{
    const juce::var payload = unwrapPayload(rawPayload);
    if (!payload.isObject())
        return;

    auto snapshot = std::make_shared<SequenceSnapshot>();
    snapshot->sequenceName = payload.getProperty("name", "MidiLens Pattern").toString();
    snapshot->nativeBpm = std::clamp(static_cast<double>(payload.getProperty("bpm", 120.0)), 20.0, 320.0);
    snapshot->totalLengthPpq = std::max(0.25, static_cast<double>(payload.getProperty("totalLengthPpq", 16.0)));
    snapshot->timeSigNumerator = std::max(1, static_cast<int>(payload.getProperty("timeSigNumerator", 4)));
    snapshot->timeSigDenominator = std::max(1, static_cast<int>(payload.getProperty("timeSigDenominator", 4)));

    const bool resetPlayhead = static_cast<bool>(payload.getProperty("resetPlayhead", false));
    const juce::var notesVar = payload.getProperty("notes", juce::var());

    if (notesVar.isArray())
    {
        if (const auto* arr = notesVar.getArray())
        {
            snapshot->events.reserve(static_cast<size_t>(arr->size()));
            for (const auto& n : *arr)
            {
                if (!n.isObject())
                    continue;

                const int pitch = juce::jlimit(0, 127, static_cast<int>(n.getProperty("pitch", 60)));
                const double startPpq = std::max(0.0, static_cast<double>(n.getProperty("startPpq", 0.0)));
                const double durationPpq = std::max(0.02, static_cast<double>(n.getProperty("durationPpq", 0.25)));
                const float velocity = juce::jlimit(0.01f, 1.0f, static_cast<float>(n.getProperty("velocity", 0.8)));
                const int channel = juce::jlimit(1, 16, static_cast<int>(n.getProperty("channel", 1)));
                const int noteId = static_cast<int>(n.getProperty("id", 0));

                PlaybackEvent ev;
                ev.ppqPosition = startPpq;
                ev.ppqDuration = durationPpq;
                ev.message = juce::MidiMessage::noteOn(channel, pitch, velocity);
                ev.noteId = noteId;
                snapshot->events.push_back(ev);
            }
        }
    }

    std::sort(snapshot->events.begin(), snapshot->events.end(),
              [](const PlaybackEvent& a, const PlaybackEvent& b)
              {
                  return a.ppqPosition < b.ppqPosition;
              });

    audioProcessor.setSequenceSnapshot(snapshot, resetPlayhead);
}

void MidiPreviewerAudioProcessorEditor::handleSyncParams(const juce::var& rawPayload)
{
    const juce::var payload = unwrapPayload(rawPayload);
    if (!payload.isObject())
        return;

    auto setParam = [this](const char* paramId, float plainValue)
    {
        if (auto* param = audioProcessor.apvts.getParameter(paramId))
        {
            const float norm = param->convertTo0to1(plainValue);
            if (std::abs(param->getValue() - norm) > 1.0e-5f)
                param->setValueNotifyingHost(norm);
        }
    };

    if (payload.hasProperty("transpose"))
        setParam(MidiPreviewerAudioProcessor::paramTranspose, static_cast<float>(payload["transpose"]));

    if (payload.hasProperty("speedMultiplier"))
        setParam(MidiPreviewerAudioProcessor::paramSpeedMult, static_cast<float>(payload["speedMultiplier"]));

    if (payload.hasProperty("velocityScale"))
        setParam(MidiPreviewerAudioProcessor::paramVelocityScale, static_cast<float>(payload["velocityScale"]));

    if (payload.hasProperty("velocityOffset"))
        setParam(MidiPreviewerAudioProcessor::paramVelocityOffset, static_cast<float>(payload["velocityOffset"]));

    if (payload.hasProperty("syncMode"))
    {
        const juce::String mode = payload["syncMode"].toString();
        setParam(MidiPreviewerAudioProcessor::paramSyncMode, mode == "daw" ? 0.0f : 1.0f);
    }

    if (payload.hasProperty("loop"))
        setParam(MidiPreviewerAudioProcessor::paramLoop, static_cast<bool>(payload["loop"]) ? 1.0f : 0.0f);

    if (payload.hasProperty("manualTempo"))
        setParam(MidiPreviewerAudioProcessor::paramManualTempo, static_cast<float>(payload["manualTempo"]));

    if (payload.hasProperty("loopStartPpq") || payload.hasProperty("loopEndPpq"))
    {
        const double lStart = static_cast<double>(payload.getProperty("loopStartPpq", 0.0));
        const double lEnd = static_cast<double>(payload.getProperty("loopEndPpq", -1.0));
        audioProcessor.setLoopRangePpq(lStart, lEnd);
    }
}

void MidiPreviewerAudioProcessorEditor::handleTransportCommand(const juce::var& rawPayload)
{
    const juce::var payload = unwrapPayload(rawPayload);
    if (!payload.isObject())
        return;

    const juce::String action = payload.getProperty("action", "").toString();
    AudioCommand cmd;

    if (action == "play")
    {
        cmd.type = AudioCommandType::StartPlayback;
        audioProcessor.sendAudioCommand(cmd);
    }
    else if (action == "pause")
    {
        cmd.type = AudioCommandType::PausePlayback;
        audioProcessor.sendAudioCommand(cmd);
    }
    else if (action == "stop")
    {
        cmd.type = AudioCommandType::StopPlayback;
        audioProcessor.sendAudioCommand(cmd);
    }
    else if (action == "seek")
    {
        cmd.type = AudioCommandType::SeekPositionPpq;
        cmd.doubleParam = std::max(0.0, static_cast<double>(payload.getProperty("ppq", 0.0)));
        audioProcessor.sendAudioCommand(cmd);
    }
}

void MidiPreviewerAudioProcessorEditor::handleAuditionNote(const juce::var& rawPayload)
{
    const juce::var payload = unwrapPayload(rawPayload);
    if (!payload.isObject())
        return;

    AudioCommand cmd;
    cmd.type = AudioCommandType::TriggerPreviewNote;
    cmd.intParam = juce::jlimit(0, 127, static_cast<int>(payload.getProperty("pitch", 60)));
    cmd.floatParam1 = juce::jlimit(0.05f, 1.0f, static_cast<float>(payload.getProperty("velocity", 0.8f)));
    cmd.floatParam2 = juce::jlimit(0.05f, 3.0f, static_cast<float>(payload.getProperty("durationSeconds", 0.25f)));
    audioProcessor.sendAudioCommand(cmd);
}

void MidiPreviewerAudioProcessorEditor::scanDirectoryAsync(const juce::File& directory)
{
    scanDirectoriesAsync(juce::Array<juce::File>{ directory });
}

void MidiPreviewerAudioProcessorEditor::scanDirectoriesAsync(const juce::Array<juce::File>& directories)
{
    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    juce::Thread::launch([safeThis, directories]()
    {
        std::vector<juce::String> scannedDirPaths;
        std::vector<ScannedFileMetadata> metadataList;

        for (const auto& dir : directories)
        {
            if (dir.isDirectory())
            {
                scannedDirPaths.push_back(dir.getFullPathName());
                const juce::File scanBase = dir.getParentDirectory().exists() ? dir.getParentDirectory() : dir;
                auto subFiles = MidiPreviewerAudioProcessor::scanFolderForMidiFiles(dir, true);
                metadataList.reserve(metadataList.size() + static_cast<size_t>(subFiles.size()));

                for (const auto& f : subFiles)
                {
                    ScannedFileMetadata meta;
                    meta.name = f.getFileName();
                    meta.relativePath = f.getRelativePathFrom(scanBase).replaceCharacter('\\', '/');
                    meta.fullPath = f.getFullPathName();
                    meta.sizeBytes = f.getSize();
                    metadataList.push_back(std::move(meta));
                }
            }
        }

        juce::String labelName = directories.size() == 1
            ? directories[0].getFileName()
            : (juce::String(directories.size()) + " Selected Folders");

        juce::MessageManager::callAsync([safeThis,
                                         folderName = labelName,
                                         scannedDirPaths = std::move(scannedDirPaths),
                                         metadataList = std::move(metadataList)]()
        {
            if (safeThis == nullptr)
                return;

            if (!scannedDirPaths.empty())
                safeThis->audioProcessor.appendScannedFolders(scannedDirPaths);

            if (!metadataList.empty())
                safeThis->audioProcessor.appendScannedFiles(metadataList);

            const auto totalAdded = metadataList.size();
            const bool useChunkedStream = totalAdded > 1000;

            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("folderName", folderName);
            obj->setProperty("canceled", false);
            obj->setProperty("addedCount", static_cast<juce::int64>(totalAdded));
            obj->setProperty("streamed", useChunkedStream);

            juce::Array<juce::var> arr;
            if (!useChunkedStream)
            {
                arr.ensureStorageAllocated(static_cast<int>(totalAdded));
                for (const auto& item : metadataList)
                {
                    juce::DynamicObject::Ptr fObj = new juce::DynamicObject();
                    fObj->setProperty("name", item.name);
                    fObj->setProperty("relativePath", item.relativePath);
                    fObj->setProperty("fullPath", item.fullPath);
                    fObj->setProperty("sizeBytes", static_cast<juce::int64>(item.sizeBytes));
                    arr.add(juce::var(fObj.get()));
                }
            }
            obj->setProperty("files", arr);

            juce::Array<juce::var> foldersArr;
            for (const auto& folderPath : safeThis->audioProcessor.getScannedFolders())
                foldersArr.add(folderPath);
            obj->setProperty("scannedFolders", foldersArr);

            if (safeThis->webBrowser != nullptr && safeThis->isFrontendReady)
                safeThis->webBrowser->emitEventIfBrowserIsVisible("libraryScanned", juce::var(obj.get()));

            if (useChunkedStream && safeThis->isFrontendReady)
                safeThis->streamLibraryToWebView(false);
        });
    });
}

void MidiPreviewerAudioProcessorEditor::streamLibraryToWebView(bool fromRescan)
{
    if (libraryStreamCancelFlag != nullptr)
        libraryStreamCancelFlag->store(true, std::memory_order_relaxed);

    auto cancelFlag = std::make_shared<std::atomic<bool>>(false);
    libraryStreamCancelFlag = cancelFlag;

    auto folders = std::make_shared<std::vector<juce::String>>(audioProcessor.getScannedFolders());
    const size_t initialCount = audioProcessor.getScannedFilesCount();

    if (initialCount == 0 && folders->empty() && !fromRescan)
        return;

    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    constexpr size_t chunkSize = 800;

    auto sendNextChunk = std::make_shared<std::function<void(size_t)>>();
    *sendNextChunk = [safeThis, cancelFlag, folders, fromRescan, sendNextChunk, chunkSize](size_t offset)
    {
        if (cancelFlag->load(std::memory_order_relaxed)
            || safeThis == nullptr
            || !safeThis->isFrontendReady
            || safeThis->webBrowser == nullptr)
        {
            return;
        }

        size_t total = 0;
        const auto slice = safeThis->audioProcessor.getScannedFilesSlice(offset, chunkSize, total);
        const size_t end = offset + slice.size();
        const bool isFirst = (offset == 0);
        const bool isLast = (end >= total || slice.empty());

        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("reset", isFirst);
        obj->setProperty("done", isLast);
        obj->setProperty("fromRescan", fromRescan);
        obj->setProperty("totalCount", static_cast<juce::int64>(total));

        if (isFirst)
        {
            juce::Array<juce::var> foldersArr;
            for (const auto& folderPath : *folders)
                foldersArr.add(folderPath);
            obj->setProperty("scannedFolders", foldersArr);
        }

        juce::Array<juce::var> filesArr;
        if (!slice.empty())
        {
            filesArr.ensureStorageAllocated(static_cast<int>(slice.size()));
            for (const auto& item : slice)
            {
                juce::DynamicObject::Ptr fObj = new juce::DynamicObject();
                fObj->setProperty("name", item.name);
                fObj->setProperty("relativePath", item.relativePath);
                fObj->setProperty("fullPath", item.fullPath);
                fObj->setProperty("sizeBytes", static_cast<juce::int64>(item.sizeBytes));
                filesArr.add(juce::var(fObj.get()));
            }
        }
        obj->setProperty("files", filesArr);

        safeThis->webBrowser->emitEventIfBrowserIsVisible("libraryChunk", juce::var(obj.get()));

        if (!isLast)
        {
            juce::Timer::callAfterDelay(4, [sendNextChunk, end]()
            {
                (*sendNextChunk)(end);
            });
        }
    };

    (*sendNextChunk)(0);
}

void MidiPreviewerAudioProcessorEditor::refreshSavedFoldersAsync(const std::vector<juce::String>& folderPaths)
{
    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    juce::Thread::launch([safeThis, folderPaths]()
    {
        std::vector<ScannedFileMetadata> metadataList;
        for (const auto& path : folderPaths)
        {
            juce::File dir(path);
            if (!dir.isDirectory())
                continue;

            const juce::File scanBase = dir.getParentDirectory().exists() ? dir.getParentDirectory() : dir;
            auto subFiles = MidiPreviewerAudioProcessor::scanFolderForMidiFiles(dir, true);
            metadataList.reserve(metadataList.size() + static_cast<size_t>(subFiles.size()));

            for (const auto& f : subFiles)
            {
                ScannedFileMetadata meta;
                meta.name = f.getFileName();
                meta.relativePath = f.getRelativePathFrom(scanBase).replaceCharacter('\\', '/');
                meta.fullPath = f.getFullPathName();
                meta.sizeBytes = f.getSize();
                metadataList.push_back(std::move(meta));
            }
        }

        juce::MessageManager::callAsync([safeThis, metadataList = std::move(metadataList)]()
        {
            if (safeThis == nullptr)
                return;

            const auto previousCount = safeThis->audioProcessor.getScannedFilesCount();
            if (!metadataList.empty())
                safeThis->audioProcessor.appendScannedFiles(metadataList);
            const auto updatedCount = safeThis->audioProcessor.getScannedFilesCount();

            if (!safeThis->isFrontendReady || safeThis->webBrowser == nullptr)
                return;

            if (updatedCount != previousCount)
            {
                safeThis->streamLibraryToWebView(true);
            }
            else
            {
                juce::DynamicObject::Ptr obj = new juce::DynamicObject();
                obj->setProperty("reset", false);
                obj->setProperty("done", true);
                obj->setProperty("fromRescan", true);
                obj->setProperty("totalCount", static_cast<juce::int64>(updatedCount));
                obj->setProperty("files", juce::Array<juce::var>());
                safeThis->webBrowser->emitEventIfBrowserIsVisible("libraryChunk", juce::var(obj.get()));
            }
        });
    });
}

void MidiPreviewerAudioProcessorEditor::handleNativeScanFolder()
{
    auto chooser = std::make_shared<juce::FileChooser>(
        "Select Folder(s) Containing MIDI Files",
        juce::File::getSpecialLocation(juce::File::userMusicDirectory));
    activeFileChooser = chooser;

    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    const int flags = juce::FileBrowserComponent::openMode
                    | juce::FileBrowserComponent::canSelectDirectories
                    | juce::FileBrowserComponent::canSelectMultipleItems;

    chooser->launchAsync(flags, [safeThis, chooser](const juce::FileChooser& fc)
    {
        if (safeThis == nullptr)
            return;

        const auto results = fc.getResults();
        if (results.isEmpty())
        {
            juce::DynamicObject::Ptr cancelObj = new juce::DynamicObject();
            cancelObj->setProperty("canceled", true);
            if (safeThis->webBrowser != nullptr && safeThis->isFrontendReady)
                safeThis->webBrowser->emitEventIfBrowserIsVisible("libraryScanned", juce::var(cancelObj.get()));
            return;
        }

        safeThis->audioProcessor.retainFileChooser(chooser);
        safeThis->scanDirectoriesAsync(results);
    });
}

void MidiPreviewerAudioProcessorEditor::loadAndEmitSingleFile(const juce::File& midiFile, const juce::String& sourceType, int index)
{
    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    juce::Thread::launch([safeThis, midiFile, sourceType, index]()
    {
        juce::String errMsg;
        const juce::String base64 = loadFileToBase64(midiFile, 15000, errMsg);

        juce::MessageManager::callAsync([safeThis, midiFile, sourceType, index, base64, errMsg]()
        {
            if (safeThis == nullptr || safeThis->webBrowser == nullptr || !safeThis->isFrontendReady)
                return;

            if (base64.isEmpty())
            {
                juce::DynamicObject::Ptr errObj = new juce::DynamicObject();
                errObj->setProperty("name", midiFile.getFileName());
                errObj->setProperty("fullPath", midiFile.getFullPathName());
                errObj->setProperty("error", errMsg.isNotEmpty() ? errMsg : juce::String("File is empty or could not be read from disk."));
                safeThis->webBrowser->emitEventIfBrowserIsVisible("midiFileLoadError", juce::var(errObj.get()));
                return;
            }

            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("name", midiFile.getFileName());
            obj->setProperty("fullPath", midiFile.getFullPathName());
            obj->setProperty("base64", base64);
            obj->setProperty("sourceType", sourceType);
            obj->setProperty("index", index);

            safeThis->webBrowser->emitEventIfBrowserIsVisible("midiFileLoaded", juce::var(obj.get()));
        });
    });
}

void MidiPreviewerAudioProcessorEditor::handleNativeOpenFile()
{
    auto chooser = std::make_shared<juce::FileChooser>(
        "Open MIDI File",
        juce::File::getSpecialLocation(juce::File::userMusicDirectory),
        "*.mid;*.midi");
    activeFileChooser = chooser;

    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    const int flags = juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles;

    chooser->launchAsync(flags, [safeThis, chooser](const juce::FileChooser& fc)
    {
        if (safeThis == nullptr)
            return;

        const juce::File chosen = fc.getResult();
        if (chosen.existsAsFile())
        {
            safeThis->audioProcessor.retainFileChooser(chooser);
            safeThis->loadAndEmitSingleFile(chosen, "custom", -1);
        }
    });
}

void MidiPreviewerAudioProcessorEditor::handleNativeLoadFile(const juce::var& rawPayload)
{
    const juce::var payload = unwrapPayload(rawPayload);
    if (!payload.isObject())
        return;

    const juce::String fullPath = payload.getProperty("fullPath", "").toString();
    const juce::String sourceType = payload.getProperty("sourceType", "scanned").toString();
    const int index = static_cast<int>(payload.getProperty("index", -1));

    if (fullPath.isNotEmpty())
    {
        const juce::File targetFile(fullPath);
        if (!targetFile.hasFileExtension("mid;midi"))
        {
            if (webBrowser != nullptr && isFrontendReady)
            {
                juce::DynamicObject::Ptr errObj = new juce::DynamicObject();
                errObj->setProperty("name", targetFile.getFileName());
                errObj->setProperty("error", "Only .mid and .midi files can be loaded.");
                webBrowser->emitEventIfBrowserIsVisible("midiFileLoadError", juce::var(errObj.get()));
            }
            return;
        }
        loadAndEmitSingleFile(targetFile, sourceType, index);
    }
    else if (webBrowser != nullptr && isFrontendReady)
    {
        juce::DynamicObject::Ptr errObj = new juce::DynamicObject();
        errObj->setProperty("name", payload.getProperty("name", "MIDI File").toString());
        errObj->setProperty("error", "Scanned item has no native file path.");
        webBrowser->emitEventIfBrowserIsVisible("midiFileLoadError", juce::var(errObj.get()));
    }
}

void MidiPreviewerAudioProcessorEditor::handleNativeSaveMidi(const juce::var& rawPayload)
{
    const juce::var payload = unwrapPayload(rawPayload);
    if (!payload.isObject())
        return;

    const juce::String filename = payload.getProperty("filename", "MidiLens_Export.mid").toString();
    const juce::String base64 = payload.getProperty("base64", "").toString();
    if (base64.isEmpty())
        return;

    juce::MemoryOutputStream decoded;
    if (!juce::Base64::convertFromBase64(decoded, base64))
        return;

    auto bytesBlock = std::make_shared<juce::MemoryBlock>(decoded.getData(), decoded.getDataSize());

    activeFileChooser = std::make_shared<juce::FileChooser>(
        "Export MIDI File (.mid)",
        juce::File::getSpecialLocation(juce::File::userDesktopDirectory).getChildFile(filename),
        "*.mid");

    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    const int flags = juce::FileBrowserComponent::saveMode
                    | juce::FileBrowserComponent::canSelectFiles
                    | juce::FileBrowserComponent::warnAboutOverwriting;

    activeFileChooser->launchAsync(flags, [safeThis, bytesBlock](const juce::FileChooser& fc)
    {
        if (safeThis == nullptr)
            return;

        juce::File target = fc.getResult();
        if (target == juce::File())
            return;

        if (!target.hasFileExtension("mid;midi"))
            target = target.withFileExtension(".mid");

        if (target.replaceWithData(bytesBlock->getData(), bytesBlock->getSize()))
        {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("savedPath", maskHomeDirectoryPath(target));
            if (safeThis->webBrowser != nullptr && safeThis->isFrontendReady)
                safeThis->webBrowser->emitEventIfBrowserIsVisible("exportSaved", juce::var(obj.get()));
        }
    });
}

void MidiPreviewerAudioProcessorEditor::handleNativeDragMidiToDaw(const juce::var& rawPayload)
{
    const juce::var payload = unwrapPayload(rawPayload);
    if (!payload.isObject())
        return;

    juce::String filename = payload.getProperty("filename", "MidiLens_Clip.mid").toString();
    const juce::String base64 = payload.getProperty("base64", "").toString();
    if (base64.isEmpty())
        return;

    if (!filename.endsWithIgnoreCase(".mid") && !filename.endsWithIgnoreCase(".midi"))
        filename += ".mid";

    juce::MemoryOutputStream decoded;
    if (!juce::Base64::convertFromBase64(decoded, base64) || decoded.getDataSize() == 0)
        return;

    juce::File tempDir = juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("MidiLensExports");
    tempDir.createDirectory();
    pruneTempExportsDirectory(tempDir);
    juce::File outFile = tempDir.getChildFile(juce::File::createLegalFileName(filename));

    if (!outFile.replaceWithData(decoded.getData(), decoded.getDataSize()))
        return;

   #if defined(__APPLE__)
    if (auto* peer = getPeer())
    {
        if (startExternalMidiFileDrag(peer->getNativeHandle(), outFile))
            return;
    }
   #endif

    performExternalDragDropOfFiles({ outFile.getFullPathName() }, false);
}

void MidiPreviewerAudioProcessorEditor::handleSaveUiState(const juce::var& rawPayload)
{
    const juce::var payload = unwrapPayload(rawPayload);
    if (!payload.isObject())
        return;

    const juce::String stateJson = payload.getProperty("stateJson", "").toString();
    if (stateJson.isNotEmpty() && stateJson.getNumBytesAsUTF8() <= 2 * 1024 * 1024)
        audioProcessor.setSavedUiStateJson(stateJson);
}

void MidiPreviewerAudioProcessorEditor::handleClearScannedLibrary()
{
    if (libraryStreamCancelFlag != nullptr)
        libraryStreamCancelFlag->store(true, std::memory_order_relaxed);
    audioProcessor.clearGlobalLibrary();
}

void MidiPreviewerAudioProcessorEditor::handleRescanSavedFolders()
{
    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    audioProcessor.loadGlobalLibraryAsync([safeThis]()
    {
        if (safeThis == nullptr)
            return;

        const auto folders = safeThis->audioProcessor.getScannedFolders();
        if (folders.empty())
        {
            if (safeThis->webBrowser != nullptr && safeThis->isFrontendReady)
            {
                juce::DynamicObject::Ptr obj = new juce::DynamicObject();
                obj->setProperty("reset", false);
                obj->setProperty("done", true);
                obj->setProperty("fromRescan", true);
                obj->setProperty("totalCount", static_cast<juce::int64>(safeThis->audioProcessor.getScannedFilesCount()));
                obj->setProperty("files", juce::Array<juce::var>());
                safeThis->webBrowser->emitEventIfBrowserIsVisible("libraryChunk", juce::var(obj.get()));
            }
            return;
        }

        safeThis->refreshSavedFoldersAsync(folders);
    });
}

bool MidiPreviewerAudioProcessorEditor::isInterestedInFileDrag(const juce::StringArray& files)
{
    for (const auto& path : files)
    {
        const juce::File f(path);
        if (f.isDirectory() || path.endsWithIgnoreCase(".mid") || path.endsWithIgnoreCase(".midi"))
            return true;
    }
    return false;
}

void MidiPreviewerAudioProcessorEditor::filesDropped(const juce::StringArray& files, int /*x*/, int /*y*/)
{
    juce::Array<juce::File> dirsToScan;
    for (const auto& path : files)
    {
        const juce::File f(path);
        if (f.isDirectory())
        {
            dirsToScan.add(f);
        }
        else if (f.existsAsFile() && (path.endsWithIgnoreCase(".mid") || path.endsWithIgnoreCase(".midi")))
        {
            loadAndEmitSingleFile(f, "custom", -1);
            return;
        }
    }

    if (!dirsToScan.isEmpty())
    {
        scanDirectoriesAsync(dirsToScan);
    }
}

void MidiPreviewerAudioProcessorEditor::timerCallback()
{
    if (!isFrontendReady || webBrowser == nullptr || !isShowing())
        return;

    const double playheadPpq = audioProcessor.getCurrentPlayheadPpq();
    const bool playing = audioProcessor.isAudioPlaying();
    const double hostBpm = audioProcessor.getHostBpm();
    const bool hostBpmDetected = audioProcessor.isHostBpmDetected();
    const int hostTimeSigNum = audioProcessor.getHostTimeSigNumerator();
    const int hostTimeSigDenom = audioProcessor.getHostTimeSigDenominator();
    const bool hostTimeSigDetected = audioProcessor.isHostTimeSigDetected();
    const bool hostIsPlaying = audioProcessor.isHostPlaying();
    const auto hostKey = audioProcessor.getHostKey();
    const bool isDawConnected = audioProcessor.wrapperType != juce::AudioProcessor::wrapperType_Standalone;
    auto activePitches = audioProcessor.getActivePitches();

    if (lastTelemetry.initialized
        && std::abs(playheadPpq - lastTelemetry.playheadPpq) < 1.0e-5
        && playing == lastTelemetry.isPlaying
        && std::abs(hostBpm - lastTelemetry.hostBpm) < 1.0e-4
        && hostBpmDetected == lastTelemetry.hostBpmDetected
        && hostTimeSigNum == lastTelemetry.hostTimeSigNum
        && hostTimeSigDenom == lastTelemetry.hostTimeSigDenom
        && hostTimeSigDetected == lastTelemetry.hostTimeSigDetected
        && hostIsPlaying == lastTelemetry.hostIsPlaying
        && hostKey.rootPitch == lastTelemetry.hostKeyRoot
        && hostKey.isMinor == lastTelemetry.hostKeyIsMinor
        && hostKey.isDetected == lastTelemetry.hostKeyDetected
        && isDawConnected == lastTelemetry.isDawConnected
        && activePitches == lastTelemetry.activePitches)
    {
        return;
    }

    lastTelemetry.playheadPpq = playheadPpq;
    lastTelemetry.isPlaying = playing;
    lastTelemetry.hostBpm = hostBpm;
    lastTelemetry.hostBpmDetected = hostBpmDetected;
    lastTelemetry.hostTimeSigNum = hostTimeSigNum;
    lastTelemetry.hostTimeSigDenom = hostTimeSigDenom;
    lastTelemetry.hostTimeSigDetected = hostTimeSigDetected;
    lastTelemetry.hostIsPlaying = hostIsPlaying;
    lastTelemetry.hostKeyRoot = hostKey.rootPitch;
    lastTelemetry.hostKeyIsMinor = hostKey.isMinor;
    lastTelemetry.hostKeyDetected = hostKey.isDetected;
    lastTelemetry.isDawConnected = isDawConnected;
    lastTelemetry.activePitches = activePitches;
    lastTelemetry.initialized = true;

    juce::DynamicObject::Ptr obj = new juce::DynamicObject();
    obj->setProperty("playheadPpq", playheadPpq);
    obj->setProperty("isPlaying", playing);
    obj->setProperty("hostBpm", hostBpm);
    obj->setProperty("hostBpmDetected", hostBpmDetected);
    obj->setProperty("hostTimeSigNumerator", hostTimeSigNum);
    obj->setProperty("hostTimeSigDenominator", hostTimeSigDenom);
    obj->setProperty("hostTimeSigDetected", hostTimeSigDetected);
    obj->setProperty("hostIsPlaying", hostIsPlaying);
    obj->setProperty("hostKeyRoot", hostKey.rootPitch);
    obj->setProperty("hostKeyIsMinor", hostKey.isMinor);
    obj->setProperty("hostKeyDetected", hostKey.isDetected);
    obj->setProperty("isDawConnected", isDawConnected);

    juce::Array<juce::var> pitchArr;
    pitchArr.ensureStorageAllocated(static_cast<int>(activePitches.size()));
    for (int p : activePitches)
        pitchArr.add(p);
    obj->setProperty("activePitches", pitchArr);

    webBrowser->emitEventIfBrowserIsVisible("dawTelemetry", juce::var(obj.get()));
}

} // namespace MidiPreviewer
