#include "KeyDetector.h"
#include <cmath>
#include <numeric>
#include <algorithm>

namespace MidiPreviewer
{

int KeyDetectionResult::semitonesToTarget(int targetRoot, bool /*targetIsMinor*/) const
{
    int diff = (targetRoot - rootPitch) % 12;
    if (diff < 0)
        diff += 12;

    // Pick shortest path (-6 to +6)
    if (diff > 6)
        diff -= 12;

    return diff;
}

KeyDetectionResult KeyDetector::analyze(const juce::MidiMessageSequence& sequence) const
{
    std::array<float, 12> pitchWeights {};
    pitchWeights.fill(0.0f);

    struct NoteOnInfo
    {
        double timestamp { 0.0 };
        float velocity { 0.0f };
    };

    // Track active note-ons across 16 channels and 128 pitches
    std::array<std::array<std::vector<NoteOnInfo>, 128>, 16> activeNotes;

    for (int i = 0; i < sequence.getNumEvents(); ++i)
    {
        const auto* event = sequence.getEventPointer(i);
        if (event == nullptr)
            continue;

        const auto& msg = event->message;
        const int channel = juce::jlimit(1, 16, msg.getChannel()) - 1;

        if (msg.isNoteOn())
        {
            const int noteNumber = msg.getNoteNumber();
            const float velocity = msg.getFloatVelocity();
            activeNotes[static_cast<size_t>(channel)][static_cast<size_t>(noteNumber)].push_back({ msg.getTimeStamp(), velocity });
        }
        else if (msg.isNoteOff())
        {
            const int noteNumber = msg.getNoteNumber();
            auto& list = activeNotes[static_cast<size_t>(channel)][static_cast<size_t>(noteNumber)];
            if (!list.empty())
            {
                auto startInfo = list.front();
                list.erase(list.begin());

                double duration = std::max(0.05, msg.getTimeStamp() - startInfo.timestamp);
                int pitchClass = noteNumber % 12;
                float weight = static_cast<float>(duration) * (startInfo.velocity > 0.0f ? startInfo.velocity : 0.8f);

                pitchWeights[static_cast<size_t>(pitchClass)] += weight;
            }
        }
    }

    // Flush any still lingering note-ons with a default 1-beat duration
    for (size_t ch = 0; ch < 16; ++ch)
    {
        for (size_t n = 0; n < 128; ++n)
        {
            for (const auto& pending : activeNotes[ch][n])
            {
                int pitchClass = static_cast<int>(n % 12);
                pitchWeights[static_cast<size_t>(pitchClass)] += 1.0f * (pending.velocity > 0.0f ? pending.velocity : 0.8f);
            }
        }
    }

    return analyzeNoteWeights(pitchWeights);
}

KeyDetectionResult KeyDetector::analyzeNoteWeights(const std::array<float, 12>& pitchClassWeights) const
{
    KeyDetectionResult bestResult;
    bestResult.pitchClassProfile = pitchClassWeights;
    bestResult.correlationCoefficient = -2.0f;

    // Check if sequence has any note data at all
    float totalSum = std::accumulate(pitchClassWeights.begin(), pitchClassWeights.end(), 0.0f);
    if (totalSum <= 0.0001f)
    {
        bestResult.rootPitch = 0;
        bestResult.isMinor = false;
        bestResult.confidence = 0.0f;
        bestResult.keyName = "Undetected (C Major)";
        return bestResult;
    }

    struct Candidate
    {
        int root;
        bool isMinor;
        float r;
    };
    std::vector<Candidate> candidates;
    candidates.reserve(24);

    for (int root = 0; root < 12; ++root)
    {
        // Major profile shift
        std::array<float, 12> shiftedMajor;
        for (int i = 0; i < 12; ++i)
        {
            int shiftedIdx = (i - root + 12) % 12;
            shiftedMajor[static_cast<size_t>(i)] = krumhanslMajorProfile[static_cast<size_t>(shiftedIdx)];
        }
        float rMajor = computePearsonCorrelation(pitchClassWeights, shiftedMajor);
        candidates.push_back({ root, false, rMajor });

        // Minor profile shift
        std::array<float, 12> shiftedMinor;
        for (int i = 0; i < 12; ++i)
        {
            int shiftedIdx = (i - root + 12) % 12;
            shiftedMinor[static_cast<size_t>(i)] = krumhanslMinorProfile[static_cast<size_t>(shiftedIdx)];
        }
        float rMinor = computePearsonCorrelation(pitchClassWeights, shiftedMinor);
        candidates.push_back({ root, true, rMinor });
    }

    std::sort(candidates.begin(), candidates.end(), [](const Candidate& a, const Candidate& b) {
        return a.r > b.r;
    });

    const auto& winner = candidates.front();
    const auto& runnerUp = candidates[1];

    bestResult.rootPitch = winner.root;
    bestResult.isMinor = winner.isMinor;
    bestResult.correlationCoefficient = winner.r;
    bestResult.keyName = getKeyName(winner.root, winner.isMinor);

    // Confidence derived from absolute correlation and margin over runner-up
    float separation = std::max(0.0f, winner.r - runnerUp.r);
    float normCorr = juce::jlimit(0.0f, 1.0f, (winner.r + 1.0f) * 0.5f);
    bestResult.confidence = juce::jlimit(0.05f, 0.99f, (normCorr * 0.6f) + (separation * 2.0f * 0.4f));

    return bestResult;
}

float KeyDetector::computePearsonCorrelation(const std::array<float, 12>& x, const std::array<float, 12>& y)
{
    float meanX = std::accumulate(x.begin(), x.end(), 0.0f) / 12.0f;
    float meanY = std::accumulate(y.begin(), y.end(), 0.0f) / 12.0f;

    float numerator = 0.0f;
    float denomX = 0.0f;
    float denomY = 0.0f;

    for (size_t i = 0; i < 12; ++i)
    {
        float dx = x[i] - meanX;
        float dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    float denom = std::sqrt(denomX * denomY);
    if (denom <= 1e-7f)
        return 0.0f;

    return numerator / denom;
}

juce::String KeyDetector::getNoteName(int pitchClass, bool useFlats)
{
    static const char* sharpNames[] = { "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" };
    static const char* flatNames[]  = { "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B" };

    int idx = (pitchClass % 12 + 12) % 12;
    return useFlats ? flatNames[idx] : sharpNames[idx];
}

juce::String KeyDetector::getKeyName(int rootPitch, bool isMinor)
{
    // Conventional flat notation for keys typically written with flats
    bool preferFlat = false;
    if (isMinor)
    {
        // c, d, f, g, bb, eb, ab minor usually use flats
        preferFlat = (rootPitch == 1 || rootPitch == 3 || rootPitch == 8 || rootPitch == 10);
    }
    else
    {
        // F, Bb, Eb, Ab, Db major use flats
        preferFlat = (rootPitch == 1 || rootPitch == 3 || rootPitch == 5 || rootPitch == 8 || rootPitch == 10);
    }

    return getNoteName(rootPitch, preferFlat) + (isMinor ? " Minor" : " Major");
}

} // namespace MidiPreviewer
