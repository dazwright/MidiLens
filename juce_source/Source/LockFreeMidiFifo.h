#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <array>
#include <atomic>
#include <memory>
#include <vector>

namespace MidiPreviewer
{

/**
 * Lightweight, copyable event representation optimized for audio-thread playback.
 * All positions are stored in quarter notes (PPQ) for tempo-resilient scheduling.
 */
struct PlaybackEvent
{
    double ppqPosition { 0.0 };
    double ppqDuration { 0.0 };
    juce::MidiMessage message;
    int noteId { 0 };
};

/**
 * Immutable snapshot of loaded sequence data.
 * Held via std::shared_ptr and swapped atomically with zero allocations on audio thread.
 */
struct SequenceSnapshot
{
    std::vector<PlaybackEvent> events;
    double totalLengthPpq { 4.0 };
    double nativeBpm { 120.0 };
    int timeSigNumerator { 4 };
    int timeSigDenominator { 4 };
    juce::String sequenceName;
    juce::String detectedKeyName;
    int detectedRootPitch { 0 }; // 0 = C, 1 = C#, etc.
    bool detectedIsMinor { false };
    float keyConfidence { 0.0f };
};

/**
 * Commands dispatched from GUI to Audio thread in a lock-free ring buffer.
 */
enum class AudioCommandType
{
    None = 0,
    StartPlayback,
    PausePlayback,
    StopPlayback,
    SeekPositionPpq,
    AllNotesOff,
    TriggerPreviewNote,
    UpdateParameters
};

struct AudioCommand
{
    AudioCommandType type { AudioCommandType::None };
    double doubleParam { 0.0 };
    int intParam { 0 };
    float floatParam1 { 0.0f };
    float floatParam2 { 0.0f };
};

/**
 * Lock-free Single-Producer Single-Consumer FIFO for real-time commands.
 */
template <typename T, size_t Capacity = 64>
class LockFreeCommandQueue
{
public:
    LockFreeCommandQueue() : fifo(static_cast<int>(Capacity)) {}

    bool push(const T& item)
    {
        int start1, size1, start2, size2;
        fifo.prepareToWrite(1, start1, size1, start2, size2);

        if (size1 + size2 < 1)
            return false; // Queue full

        if (size1 > 0)
            buffer[static_cast<size_t>(start1)] = item;
        else if (size2 > 0)
            buffer[static_cast<size_t>(start2)] = item;

        fifo.finishedWrite(1);
        return true;
    }

    bool pop(T& result)
    {
        int start1, size1, start2, size2;
        fifo.prepareToRead(1, start1, size1, start2, size2);

        if (size1 + size2 < 1)
            return false; // Queue empty

        if (size1 > 0)
            result = buffer[static_cast<size_t>(start1)];
        else if (size2 > 0)
            result = buffer[static_cast<size_t>(start2)];

        fifo.finishedRead(1);
        return true;
    }

    void clear()
    {
        fifo.reset();
    }

private:
    juce::AbstractFifo fifo;
    std::array<T, Capacity> buffer;
};

} // namespace MidiPreviewer
