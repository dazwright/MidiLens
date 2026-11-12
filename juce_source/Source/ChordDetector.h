#pragma once

#include <juce_core/juce_core.h>
#include <vector>
#include <array>
#include <algorithm>
#include <set>
#include "KeyDetector.h"

namespace MidiPreviewer
{

struct ChordAnalysisResult
{
    juce::String fullName { "No Chord" };
    juce::String rootNote { "-" };
    juce::String quality { "Silence" };
    juce::String bassNote { "-" };
    bool isSlashChord { false };
    std::vector<juce::String> intervals;
    std::vector<int> pitches;
    std::vector<int> pitchClasses;
};

class ChordDetector
{
public:
    struct ChordTemplate
    {
        const char* name;
        const char* shortName;
        std::vector<int> intervals;
        std::vector<const char*> displayIntervals;
    };

    static std::vector<ChordTemplate> getTemplates()
    {
        return {
            // Triads
            { "Major", "", { 0, 4, 7 }, { "1", "3", "5" } },
            { "Minor", "m", { 0, 3, 7 }, { "1", "b3", "5" } },
            { "Diminished", "dim", { 0, 3, 6 }, { "1", "b3", "b5" } },
            { "Augmented", "aug", { 0, 4, 8 }, { "1", "3", "#5" } },
            { "Suspended 4", "sus4", { 0, 5, 7 }, { "1", "4", "5" } },
            { "Suspended 2", "sus2", { 0, 2, 7 }, { "1", "2", "5" } },
            { "Power Chord", "5", { 0, 7 }, { "1", "5" } },

            // 7th Chords
            { "Major 7th", "maj7", { 0, 4, 7, 11 }, { "1", "3", "5", "7" } },
            { "Minor 7th", "m7", { 0, 3, 7, 10 }, { "1", "b3", "5", "b7" } },
            { "Dominant 7th", "7", { 0, 4, 7, 10 }, { "1", "3", "5", "b7" } },
            { "Half-Diminished 7th", "m7b5", { 0, 3, 6, 10 }, { "1", "b3", "b5", "b7" } },
            { "Diminished 7th", "dim7", { 0, 3, 6, 9 }, { "1", "b3", "b5", "bb7" } },
            { "Minor-Major 7th", "mM7", { 0, 3, 7, 11 }, { "1", "b3", "5", "7" } },
            { "Augmented 7th", "aug7", { 0, 4, 8, 10 }, { "1", "3", "#5", "b7" } },

            // 6th & 9th Extended Chords
            { "Major 6th", "6", { 0, 4, 7, 9 }, { "1", "3", "5", "6" } },
            { "Minor 6th", "m6", { 0, 3, 7, 9 }, { "1", "b3", "5", "6" } },
            { "Add 9", "add9", { 0, 4, 7, 2 }, { "1", "3", "5", "9" } },
            { "Minor Add 9", "m(add9)", { 0, 3, 7, 2 }, { "1", "b3", "5", "9" } },
            { "Major 9th", "maj9", { 0, 4, 7, 11, 2 }, { "1", "3", "5", "7", "9" } },
            { "Minor 9th", "m9", { 0, 3, 7, 10, 2 }, { "1", "b3", "5", "b7", "9" } },
            { "Dominant 9th", "9", { 0, 4, 7, 10, 2 }, { "1", "3", "5", "b7", "9" } }
        };
    }

    static ChordAnalysisResult detectChord(const std::vector<int>& rawPitches, bool preferFlat = false)
    {
        if (rawPitches.empty())
            return {};

        std::vector<int> sortedPitches = rawPitches;
        std::sort(sortedPitches.begin(), sortedPitches.end());

        int bassPitch = sortedPitches.front();
        int bassPitchClass = (bassPitch % 12 + 12) % 12;
        juce::String bassName = KeyDetector::getNoteName(bassPitchClass, preferFlat);

        // Collect unique pitch classes (0-11)
        std::set<int> uniquePcs;
        for (int p : sortedPitches)
            uniquePcs.insert((p % 12 + 12) % 12);

        std::vector<int> pcs(uniquePcs.begin(), uniquePcs.end());

        // Single Note
        if (pcs.size() == 1)
        {
            juce::String root = KeyDetector::getNoteName(pcs[0], preferFlat);
            ChordAnalysisResult res;
            res.fullName = root + " Note";
            res.rootNote = root;
            res.quality = "Single Note";
            res.bassNote = root;
            res.pitches = sortedPitches;
            res.pitchClasses = pcs;
            res.intervals = { "1" };
            return res;
        }

        // Two notes: Octave or Dyad
        if (pcs.size() == 2)
        {
            int interval = (pcs[1] - pcs[0] + 12) % 12;
            juce::String root = KeyDetector::getNoteName(pcs[0], preferFlat);
            juce::String other = KeyDetector::getNoteName(pcs[1], preferFlat);

            ChordAnalysisResult res;
            res.rootNote = root;
            res.bassNote = bassName;
            res.pitches = sortedPitches;
            res.pitchClasses = pcs;

            if (interval == 7)
            {
                res.fullName = root + "5 (Power Chord)";
                res.quality = "Fifth";
                res.intervals = { "1", "5" };
                return res;
            }
            if (interval == 4)
            {
                res.fullName = root + " (Major 3rd)";
                res.quality = "Major Third";
                res.intervals = { "1", "3" };
                return res;
            }
            if (interval == 3)
            {
                res.fullName = root + "m (Minor 3rd)";
                res.quality = "Minor Third";
                res.intervals = { "1", "b3" };
                return res;
            }
        }

        // Search chord templates
        auto templates = getTemplates();

        struct MatchScore
        {
            const ChordTemplate* tmpl;
            int rootPitchClass;
            int matchedNotes;
            int extraNotes;
            int missingNotes;
            float score;
        };
        std::vector<MatchScore> matches;

        for (int rootPc : pcs)
        {
            for (const auto& tmpl : templates)
            {
                std::set<int> targetPcs;
                for (int semi : tmpl.intervals)
                    targetPcs.insert((rootPc + semi) % 12);

                int matched = 0;
                for (int pc : pcs)
                    if (targetPcs.count(pc) > 0)
                        matched++;

                int missing = static_cast<int>(targetPcs.size()) - matched;
                int extra = static_cast<int>(pcs.size()) - matched;

                if (matched >= 2)
                {
                    float score = (matched * 3.0f) - (missing * 1.5f) - (extra * 1.0f);
                    if (rootPc == bassPitchClass)
                        score += 0.8f; // Bass matches root bonus
                    matches.push_back({ &tmpl, rootPc, matched, extra, missing, score });
                }
            }
        }

        if (!matches.empty())
        {
            std::sort(matches.begin(), matches.end(), [](const MatchScore& a, const MatchScore& b) {
                return a.score > b.score;
            });

            const auto& best = matches.front();
            juce::String rootStr = KeyDetector::getNoteName(best.rootPitchClass, preferFlat);
            juce::String chordName = rootStr + best.tmpl->shortName;

            bool isSlash = (bassPitchClass != best.rootPitchClass);
            if (isSlash)
                chordName += " / " + bassName;

            ChordAnalysisResult res;
            res.fullName = chordName;
            res.rootNote = rootStr;
            res.quality = best.tmpl->name;
            res.bassNote = bassName;
            res.isSlashChord = isSlash;
            res.pitches = sortedPitches;
            res.pitchClasses = pcs;

            for (const char* di : best.tmpl->displayIntervals)
                res.intervals.push_back(di);

            return res;
        }

        // Fallback: Pitch names
        juce::String fallback;
        for (size_t i = 0; i < pcs.size(); ++i)
        {
            if (i > 0) fallback += "-";
            fallback += KeyDetector::getNoteName(pcs[i], preferFlat);
        }

        ChordAnalysisResult res;
        res.fullName = fallback;
        res.rootNote = KeyDetector::getNoteName(pcs[0], preferFlat);
        res.quality = "Complex";
        res.bassNote = bassName;
        res.pitches = sortedPitches;
        res.pitchClasses = pcs;
        return res;
    }
};

} // namespace MidiPreviewer
