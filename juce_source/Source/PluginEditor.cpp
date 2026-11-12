#include "PluginEditor.h"
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

    juce::String loadFileToBase64(const juce::File& file)
    {
        juce::MemoryBlock mb;
        if (!file.existsAsFile() || !file.loadFileAsData(mb) || mb.getSize() == 0)
            return {};
        return juce::Base64::toBase64(mb.getData(), mb.getSize());
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
        .withEventListener("saveUiState", [this](juce::var payload) { handleSaveUiState(payload); });

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

    const juce::String savedJson = audioProcessor.getSavedUiStateJson();
    const auto scanned = audioProcessor.getScannedFiles();

    if (savedJson.isNotEmpty() || !scanned.empty())
    {
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("stateJson", savedJson);

        juce::Array<juce::var> filesArr;
        for (const auto& item : scanned)
        {
            juce::DynamicObject::Ptr fObj = new juce::DynamicObject();
            fObj->setProperty("name", item.name);
            fObj->setProperty("relativePath", item.relativePath);
            fObj->setProperty("fullPath", item.fullPath);
            fObj->setProperty("sizeBytes", static_cast<juce::int64>(item.sizeBytes));
            filesArr.add(juce::var(fObj.get()));
        }
        obj->setProperty("scannedFiles", filesArr);

        if (webBrowser != nullptr)
            webBrowser->emitEventIfBrowserIsVisible("restorePluginState", juce::var(obj.get()));
    }
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
    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    juce::Thread::launch([safeThis, directory]()
    {
        auto midiFiles = MidiPreviewerAudioProcessor::scanFolderForMidiFiles(directory, true);

        std::vector<ScannedFileMetadata> metadataList;
        metadataList.reserve(static_cast<size_t>(midiFiles.size()));

        const juce::File parentRoot = directory.getParentDirectory();
        for (const auto& f : midiFiles)
        {
            ScannedFileMetadata meta;
            meta.name = f.getFileName();
            meta.relativePath = f.getRelativePathFrom(parentRoot).replaceCharacter('\\', '/');
            meta.fullPath = f.getFullPathName();
            meta.sizeBytes = f.getSize();
            metadataList.push_back(std::move(meta));
        }

        juce::String firstBase64;
        juce::String firstName;
        if (!midiFiles.isEmpty())
        {
            firstName = midiFiles[0].getFileName();
            firstBase64 = loadFileToBase64(midiFiles[0]);
        }

        juce::MessageManager::callAsync([safeThis,
                                         folderName = directory.getFileName(),
                                         metadataList = std::move(metadataList),
                                         firstBase64,
                                         firstName]()
        {
            if (safeThis == nullptr)
                return;

            if (!metadataList.empty())
                safeThis->audioProcessor.appendScannedFiles(metadataList);

            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("folderName", folderName);
            obj->setProperty("canceled", false);

            juce::Array<juce::var> arr;
            for (const auto& item : metadataList)
            {
                juce::DynamicObject::Ptr fObj = new juce::DynamicObject();
                fObj->setProperty("name", item.name);
                fObj->setProperty("relativePath", item.relativePath);
                fObj->setProperty("fullPath", item.fullPath);
                fObj->setProperty("sizeBytes", static_cast<juce::int64>(item.sizeBytes));
                arr.add(juce::var(fObj.get()));
            }
            obj->setProperty("files", arr);

            if (firstBase64.isNotEmpty())
            {
                obj->setProperty("firstFileName", firstName);
                obj->setProperty("firstFileBase64", firstBase64);
            }

            if (safeThis->webBrowser != nullptr && safeThis->isFrontendReady)
                safeThis->webBrowser->emitEventIfBrowserIsVisible("libraryScanned", juce::var(obj.get()));
        });
    });
}

void MidiPreviewerAudioProcessorEditor::handleNativeScanFolder()
{
    activeFileChooser = std::make_shared<juce::FileChooser>(
        "Select a Folder Containing MIDI Files",
        juce::File::getSpecialLocation(juce::File::userMusicDirectory));

    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    const int flags = juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectDirectories;

    activeFileChooser->launchAsync(flags, [safeThis](const juce::FileChooser& fc)
    {
        if (safeThis == nullptr)
            return;

        const juce::File chosen = fc.getResult();
        if (!chosen.isDirectory())
        {
            juce::DynamicObject::Ptr cancelObj = new juce::DynamicObject();
            cancelObj->setProperty("canceled", true);
            if (safeThis->webBrowser != nullptr && safeThis->isFrontendReady)
                safeThis->webBrowser->emitEventIfBrowserIsVisible("libraryScanned", juce::var(cancelObj.get()));
            return;
        }

        safeThis->scanDirectoryAsync(chosen);
    });
}

void MidiPreviewerAudioProcessorEditor::loadAndEmitSingleFile(const juce::File& midiFile, const juce::String& sourceType, int index)
{
    if (!midiFile.existsAsFile())
        return;

    const juce::String base64 = loadFileToBase64(midiFile);
    if (base64.isEmpty() || webBrowser == nullptr || !isFrontendReady)
        return;

    juce::DynamicObject::Ptr obj = new juce::DynamicObject();
    obj->setProperty("name", midiFile.getFileName());
    obj->setProperty("fullPath", midiFile.getFullPathName());
    obj->setProperty("base64", base64);
    obj->setProperty("sourceType", sourceType);
    obj->setProperty("index", index);

    webBrowser->emitEventIfBrowserIsVisible("midiFileLoaded", juce::var(obj.get()));
}

void MidiPreviewerAudioProcessorEditor::handleNativeOpenFile()
{
    activeFileChooser = std::make_shared<juce::FileChooser>(
        "Open MIDI File",
        juce::File::getSpecialLocation(juce::File::userMusicDirectory),
        "*.mid;*.midi");

    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    const int flags = juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles;

    activeFileChooser->launchAsync(flags, [safeThis](const juce::FileChooser& fc)
    {
        if (safeThis == nullptr)
            return;

        const juce::File chosen = fc.getResult();
        if (chosen.existsAsFile())
            safeThis->loadAndEmitSingleFile(chosen, "custom", -1);
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
        loadAndEmitSingleFile(juce::File(fullPath), sourceType, index);
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
            obj->setProperty("savedPath", target.getFullPathName());
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
    juce::File outFile = tempDir.getChildFile(juce::File::createLegalFileName(filename));

    if (!outFile.replaceWithData(decoded.getData(), decoded.getDataSize()))
        return;

    auto safeThis = juce::Component::SafePointer<MidiPreviewerAudioProcessorEditor>(this);
    const juce::String fullPath = outFile.getFullPathName();
    juce::MessageManager::callAsync([safeThis, fullPath]()
    {
        if (safeThis != nullptr)
            safeThis->performExternalDragDropOfFiles({ fullPath }, false);
    });
}

void MidiPreviewerAudioProcessorEditor::handleSaveUiState(const juce::var& rawPayload)
{
    const juce::var payload = unwrapPayload(rawPayload);
    if (!payload.isObject())
        return;

    const juce::String stateJson = payload.getProperty("stateJson", "").toString();
    if (stateJson.isNotEmpty())
        audioProcessor.setSavedUiStateJson(stateJson);
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
    for (const auto& path : files)
    {
        const juce::File f(path);
        if (f.isDirectory())
        {
            scanDirectoryAsync(f);
            return;
        }
        if (f.existsAsFile() && (path.endsWithIgnoreCase(".mid") || path.endsWithIgnoreCase(".midi")))
        {
            loadAndEmitSingleFile(f, "custom", -1);
            return;
        }
    }
}

void MidiPreviewerAudioProcessorEditor::timerCallback()
{
    if (!isFrontendReady || webBrowser == nullptr || !isShowing())
        return;

    juce::DynamicObject::Ptr obj = new juce::DynamicObject();
    obj->setProperty("playheadPpq", audioProcessor.getCurrentPlayheadPpq());
    obj->setProperty("isPlaying", audioProcessor.isAudioPlaying());
    obj->setProperty("hostBpm", audioProcessor.getHostBpm());
    obj->setProperty("hostIsPlaying", audioProcessor.isHostPlaying());

    const auto hostKey = audioProcessor.getHostKey();
    obj->setProperty("hostKeyRoot", hostKey.rootPitch);
    obj->setProperty("hostKeyIsMinor", hostKey.isMinor);
    obj->setProperty("hostKeyDetected", hostKey.isDetected);

    juce::Array<juce::var> pitchArr;
    for (int p : audioProcessor.getActivePitches())
        pitchArr.add(p);
    obj->setProperty("activePitches", pitchArr);

    webBrowser->emitEventIfBrowserIsVisible("dawTelemetry", juce::var(obj.get()));
}

} // namespace MidiPreviewer
