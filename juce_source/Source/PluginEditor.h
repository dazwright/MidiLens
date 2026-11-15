#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_gui_extra/juce_gui_extra.h>
#include <atomic>
#include <memory>
#include <optional>
#include "PluginProcessor.h"

namespace MidiPreviewer
{

class MidiPreviewerAudioProcessorEditor : public juce::AudioProcessorEditor,
                                          public juce::DragAndDropContainer,
                                          public juce::FileDragAndDropTarget,
                                          private juce::Timer
{
public:
    explicit MidiPreviewerAudioProcessorEditor(MidiPreviewerAudioProcessor&);
    ~MidiPreviewerAudioProcessorEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

    // External OS File / Folder Drag & Drop into Plugin Window
    bool isInterestedInFileDrag(const juce::StringArray& files) override;
    void filesDropped(const juce::StringArray& files, int x, int y) override;

private:
    void timerCallback() override;

    // JUCE 8 Embedded Resource Provider (Serves offline compiled React + Tailwind v4 bundle)
    std::optional<juce::WebBrowserComponent::Resource> getResource(const juce::String& url);

    // Bidirectional Native Bridge Event Handlers
    void handleFrontendReady();
    void handleSyncSequence(const juce::var& rawPayload);
    void handleSyncParams(const juce::var& rawPayload);
    void handleTransportCommand(const juce::var& rawPayload);
    void handleAuditionNote(const juce::var& rawPayload);
    void handleNativeScanFolder();
    void handleNativeOpenFile();
    void handleNativeLoadFile(const juce::var& rawPayload);
    void handleNativeSaveMidi(const juce::var& rawPayload);
    void handleNativeDragMidiToDaw(const juce::var& rawPayload);
    void handleSaveUiState(const juce::var& rawPayload);
    void handleClearScannedLibrary();
    void handleRescanSavedFolders();

    void scanDirectoryAsync(const juce::File& directory);
    void scanDirectoriesAsync(const juce::Array<juce::File>& directories);
    void refreshSavedFoldersAsync(const std::vector<juce::String>& folderPaths);
    void streamLibraryToWebView(bool fromRescan = false);
    void loadAndEmitSingleFile(const juce::File& midiFile, const juce::String& sourceType, int index);

    struct LastTelemetryState
    {
        double playheadPpq { -1.0 };
        bool isPlaying { false };
        double hostBpm { -1.0 };
        bool hostBpmDetected { false };
        int hostTimeSigNum { 4 };
        int hostTimeSigDenom { 4 };
        bool hostTimeSigDetected { false };
        bool hostIsPlaying { false };
        bool isDawConnected { false };
        std::vector<int> activePitches;
        bool initialized { false };
    };

    MidiPreviewerAudioProcessor& audioProcessor;
    bool isFrontendReady { false };
    std::shared_ptr<std::atomic<bool>> libraryStreamCancelFlag;
    std::shared_ptr<juce::FileChooser> activeFileChooser;
    std::unique_ptr<juce::WebBrowserComponent> webBrowser;
    LastTelemetryState lastTelemetry;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MidiPreviewerAudioProcessorEditor)
};

} // namespace MidiPreviewer
