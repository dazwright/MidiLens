#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <atomic>
#include <memory>
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
    void setSequenceSnapshot(std::shared_ptr<const SequenceSnapshot> newSnapshot);
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

    // GUI / Audio thread commands
    void sendAudioCommand(const AudioCommand& cmd);

    // Audio Playback State getters for GUI polling
    double getCurrentPlayheadPpq() const { return currentPlayheadPpq.load(std::memory_order_relaxed); }
    bool isAudioPlaying() const { return isPlaying.load(std::memory_order_relaxed); }
    double getHostBpm() const { return hostBpm.load(std::memory_order_relaxed); }
    bool isHostPlaying() const { return hostIsPlaying.load(std::memory_order_relaxed); }
    KeyDetectionResult getDetectedKey() const;

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
    void handleIncomingCommands();
    void flushAllNotesOff(juce::MidiBuffer& midiMessages);

    // Lock-free double/triple buffer sequence exchange
    std::shared_ptr<const SequenceSnapshot> activeSequence { nullptr };
    std::atomic<bool> newSequenceAvailable { false };
    std::shared_ptr<const SequenceSnapshot> pendingSequence { nullptr };
    mutable std::mutex sequenceExchangeMutex;

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

    // Playback state atomics
    std::atomic<double> currentPlayheadPpq { 0.0 };
    std::atomic<bool> isPlaying { false };
    std::atomic<double> hostBpm { 120.0 };
    std::atomic<bool> hostIsPlaying { false };
    std::atomic<bool> pendingAllNotesOff { false };

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

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MidiPreviewerAudioProcessor)
};

} // namespace MidiPreviewer
