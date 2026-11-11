#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <array>
#include <vector>

namespace MidiPreviewer
{

/**
 * Result structure returned by KeyDetector.
 */
struct KeyDetectionResult
{
    int rootPitch { 0 };               // 0 = C, 1 = C#, ..., 11 = B
    bool isMinor { false };            // false = Major, true = Minor
    float confidence { 0.0f };         // 0.0 to 1.0 confidence score
    float correlationCoefficient { 0.0f };
    juce::String keyName;              // e.g. "C Major", "A Minor", "E-flat Minor"
    std::array<float, 12> pitchClassProfile { 0.0f }; // Accumulated pitch weights
    int semitonesToTarget(int targetRoot, bool targetIsMinor) const;
};

/**
 * Production-grade implementation of the Krumhansl-Schmuckler key-finding algorithm.
 * Evaluates MIDI sequences using pitch-class profiles weighted by note duration and velocity.
 */
class KeyDetector
{
public:
    KeyDetector() = default;

    /**
     * Analyzes a JUCE MidiMessageSequence and returns the estimated key.
     */
    KeyDetectionResult analyze(const juce::MidiMessageSequence& sequence) const;

    /**
     * Analyzes a vector of note events directly.
     */
    KeyDetectionResult analyzeNoteWeights(const std::array<float, 12>& pitchClassWeights) const;

    /**
     * Converts pitch class index (0-11) and mode to standard musical notation.
     */
    static juce::String getKeyName(int rootPitch, bool isMinor);

    /**
     * Returns standard note name (C, C#, D, etc.) for pitch class 0-11.
     */
    static juce::String getNoteName(int pitchClass, bool useFlats = false);

private:
    // Standard Krumhansl-Kessler probe tone rating profiles
    static constexpr std::array<float, 12> krumhanslMajorProfile = {
        6.35f, 2.23f, 3.48f, 2.33f, 4.38f, 4.09f, 2.52f, 5.19f, 2.39f, 3.66f, 2.29f, 2.88f
    };

    static constexpr std::array<float, 12> krumhanslMinorProfile = {
        6.33f, 2.68f, 3.52f, 5.38f, 2.60f, 3.53f, 2.54f, 4.75f, 3.98f, 2.69f, 3.34f, 3.17f
    };

    static float computePearsonCorrelation(const std::array<float, 12>& x, const std::array<float, 12>& y);
};

} // namespace MidiPreviewer
