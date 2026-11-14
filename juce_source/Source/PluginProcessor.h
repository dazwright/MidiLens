#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <array>
#include <atomic>
#include <cstdint>
#include <functional>
#include <memory>
#include <mutex>
#include <vector>
#include "LockFreeMidiFifo.h"
#include "KeyDetector.h"
#include "PianoRollComponent.h" // For MusicalScale definition

namespace MidiPreviewer
{

enum class SyncMode
{
    FollowDAW = 0,
    FreeAudition = 1
};

struct ScannedFileMetadata
{
    juce::String name;
    juce::String relativePath;
    juce::String fullPath;
    juce::int64 sizeBytes { 0 };
};

class MidiPreviewerAudioProcessor : public juce::AudioProcessor
{
public:
    MidiPreviewerAudioProcessor();
    ~MidiPreviewerAudioProcessor() override;

    //==============================================================================
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;
    using AudioProcessor::processBlock;

    //==============================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "MidiLens"; }

    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return true; }
    bool isMidiEffect() const override { return true; }
    double getTailLengthSeconds() const override { return 0.0; }

    //==============================================================================
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    //==============================================================================
    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    //==============================================================================
    // Realtime Sequence Management (Lock-Free)
    void loadMidiSequenceFromFile(const juce::File& midiFile);
    void setSequenceSnapshot(std::shared_ptr<const SequenceSnapshot> newSnapshot, bool resetPlayhead = false);
    std::shared_ptr<const SequenceSnapshot> getSequenceSnapshot() const;

    // Hard Drive Folder Scanning (Recursive)
    static juce::Array<juce::File> scanFolderForMidiFiles(const juce::File& rootFolder, bool searchSubfolders = true);

    // Quantization, Humanization & Harmonization
    void quantizeTiming(double gridPpq);
    void quantizeScale(int rootPitch, MusicalScale scale);
    void humanizeVelocity(int rangeDelta);
    void humanizeTiming(double maxDeltaPpq);
    void harmonizeNotes(int semitoneInterval);
    void setSequenceLength(double newTotalPpq);
    void setLoopRangePpq(double startPpq, double endPpq);

    // GUI / Audio thread commands
    void sendAudioCommand(const AudioCommand& cmd);

    // Persistent WebUI State & Global Scanned Library Metadata (shared across all tracks/instances)
    void setSavedUiStateJson(const juce::String& json);
    juce::String getSavedUiStateJson() const;
    void loadGlobalLibraryAsync(std::function<void()> onLoaded);
    void appendScannedFolders(const std::vector<juce::String>& folderPaths);
    std::vector<juce::String> getScannedFolders() const;
    void appendScannedFiles(const std::vector<ScannedFileMetadata>& files);
    std::vector<ScannedFileMetadata> getScannedFiles() const;
    void clearGlobalLibrary();
    void retainFileChooser(std::shared_ptr<juce::FileChooser> chooser);

    // Audio Playback State getters for GUI polling
    double getCurrentPlayheadPpq() const { return currentPlayheadPpq.load(std::memory_order_relaxed); }
    bool isAudioPlaying() const;
    double getHostBpm() const { return hostBpm.load(std::memory_order_relaxed); }
    bool isHostBpmDetected() const { return hostBpmDetected.load(std::memory_order_relaxed); }
    int getHostTimeSigNumerator() const { return hostTimeSigNumerator.load(std::memory_order_relaxed); }
    int getHostTimeSigDenominator() const { return hostTimeSigDenominator.load(std::memory_order_relaxed); }
    bool isHostTimeSigDetected() const { return hostTimeSigDetected.load(std::memory_order_relaxed); }
    bool isHostPlaying() const { return hostIsPlaying.load(std::memory_order_relaxed); }
    std::vector<int> getActivePitches() const;
    KeyDetectionResult getDetectedKey() const;

    struct HostKeyInfo
    {
        int rootPitch { 0 }; // 0 = C
        bool isMinor { false };
        bool isDetected { false };

        juce::String getKeyName() const
        {
            static const char* noteNames[] = { "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B" };
            juce::String root = noteNames[(rootPitch % 12 + 12) % 12];
            return root + (isMinor ? " min" : " maj");
        }
    };

    HostKeyInfo getHostKey() const
    {
        HostKeyInfo info;
        info.rootPitch = hostKeyRoot.load(std::memory_order_relaxed);
        info.isMinor = hostKeyIsMinor.load(std::memory_order_relaxed);
        info.isDetected = hostKeyDetected.load(std::memory_order_relaxed);
        return info;
    }

    // Parameter layout & APVTS
    juce::AudioProcessorValueTreeState apvts;
    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    // Constant parameter IDs
    static constexpr const char* paramTranspose      = "transpose";
    static constexpr const char* paramSpeedMult      = "speedMult";
    static constexpr const char* paramVelocityScale  = "velocityScale";
    static constexpr const char* paramVelocityOffset = "velocityOffset";
    static constexpr const char* paramSyncMode       = "syncMode";
    static constexpr const char* paramLoop           = "loop";
    static constexpr const char* paramManualTempo    = "manualTempo";

private:
    void handleIncomingCommands(juce::MidiBuffer& midiMessages);
    void flushAllNotesOff(juce::MidiBuffer& midiMessages);
    void updateActivePitchBitmask();

    // Lock-free double/triple buffer sequence exchange
    std::shared_ptr<const SequenceSnapshot> activeSequence { nullptr };
    std::atomic<bool> newSequenceAvailable { false };
    std::atomic<bool> resetPlayheadOnSwap { false };
    std::shared_ptr<const SequenceSnapshot> pendingSequence { nullptr };
    mutable std::mutex sequenceExchangeMutex;

    // Persistent WebUI JSON across editor close/reopen and DAW project saves
    mutable std::mutex uiStateMutex;
    juce::String savedUiStateJson;
    std::vector<std::shared_ptr<juce::FileChooser>> retainedFileChoosers;

    static juce::File getGlobalLibraryFile();

    // Lock-free Command FIFO
    LockFreeCommandQueue<AudioCommand, 128> commandQueue;

    // Active sounding notes tracking for clean note-off dispatch
    struct ActiveNote
    {
        int channel;
        int noteNumber;
        double endPpq;
    };
    std::array<ActiveNote, 128> activeNotePool {};
    int activeNoteCount { 0 };

    // One-shot preview audition notes triggered from PianoRoll keys/dragging
    struct PreviewNote
    {
        int channel;
        int noteNumber;
        int samplesRemaining;
    };
    std::array<PreviewNote, 16> previewNotePool {};
    int previewNoteCount { 0 };

    // Lock-free bitmask of active MIDI pitches (0..127) for ChordVisualizer telemetry
    std::atomic<uint64_t> activePitchBitsLow { 0 };
    std::atomic<uint64_t> activePitchBitsHigh { 0 };

    // Playback state atomics
    std::atomic<double> currentPlayheadPpq { 0.0 };
    std::atomic<double> loopStartPpq { 0.0 };
    std::atomic<double> loopEndPpq { -1.0 };
    std::atomic<bool> isPlaying { false };
    std::atomic<double> hostBpm { 120.0 };
    std::atomic<bool> hostBpmDetected { false };
    std::atomic<int> hostTimeSigNumerator { 4 };
    std::atomic<int> hostTimeSigDenominator { 4 };
    std::atomic<bool> hostTimeSigDetected { false };
    std::atomic<bool> hostIsPlaying { false };
    std::atomic<bool> pendingAllNotesOff { false };
    std::atomic<int> hostKeyRoot { 0 };
    std::atomic<bool> hostKeyIsMinor { false };
    std::atomic<bool> hostKeyDetected { false };

    // Cached audio parameters (updated per block)
    std::atomic<float>* transposeParam { nullptr };
    std::atomic<float>* speedMultParam { nullptr };
    std::atomic<float>* velocityScaleParam { nullptr };
    std::atomic<float>* velocityOffsetParam { nullptr };
    std::atomic<float>* syncModeParam { nullptr };
    std::atomic<float>* loopParam { nullptr };
    std::atomic<float>* manualTempoParam { nullptr };

    double sampleRate { 44100.0 };
    double lastPpqPosition { 0.0 };
    bool wasHostPlaying { false };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MidiPreviewerAudioProcessor)
};

} // namespace MidiPreviewer
