#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include "LockFreeMidiFifo.h"

namespace MidiPreviewer
{

/**
 * Handles exporting in-memory transformed MIDI sequence data to standard MIDI files (.mid)
 * on disk for external drag-and-drop into DAW tracks or file export.
 */
class MidiFileExporter
{
public:
    struct ExportOptions
    {
        int semitoneTranspose { 0 };
        float speedMultiplier { 1.0f };
        float velocityScale { 1.0f };
        int velocityOffset { 0 };
        double targetBpm { 120.0 };
        juce::String trackName { "Exported Preview" };
    };

    /**
     * Serializes the sequence snapshot with transformations into a temporary .mid file.
     * Returns the juce::File pointing to the created temp file.
     */
    static juce::File writeToTempFile(const SequenceSnapshot& snapshot, const ExportOptions& options);

    /**
     * Serializes a juce::MidiMessageSequence directly to a destination file.
     */
    static bool writeToFile(const juce::MidiMessageSequence& sequence,
                           double bpm,
                           int timeSigNum,
                           int timeSigDenom,
                           const juce::File& destinationFile);
};

} // namespace MidiPreviewer
