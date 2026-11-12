#pragma once

#include <vector>
#include <algorithm>
#include <random>
#include "LockFreeMidiFifo.h"

namespace MidiPreviewer
{

enum class ArpMode
{
    Up = 0,
    Down,
    UpDown,
    DownUp,
    Random,
    Chord
};

enum class ArpRate
{
    Rate1_4 = 0,
    Rate1_8,
    Rate1_16,
    Rate1_32,
    Rate1_8T,
    Rate1_16T
};

class ArpEngine
{
public:
    static double getArpRatePpq(ArpRate rate)
    {
        switch (rate)
        {
            case ArpRate::Rate1_4:   return 1.0;
            case ArpRate::Rate1_8:   return 0.5;
            case ArpRate::Rate1_16:  return 0.25;
            case ArpRate::Rate1_32:  return 0.125;
            case ArpRate::Rate1_8T:  return 0.333333;
            case ArpRate::Rate1_16T: return 0.166667;
            default:                 return 0.25;
        }
    }

    static std::vector<PlaybackEvent> processArpeggio(
        const std::vector<PlaybackEvent>& inputEvents,
        double totalLengthPpq,
        ArpMode mode,
        ArpRate rate,
        int octaves,
        float gateRatio = 0.85f)
    {
        if (inputEvents.empty())
            return {};

        if (mode == ArpMode::Chord && octaves <= 1)
            return inputEvents;

        double stepPpq = getArpRatePpq(rate);
        double noteDuration = stepPpq * juce::jlimit(0.1f, 1.0f, gateRatio);

        // Group notes into time slices (chords starting around same time)
        struct TimeSlice
        {
            double startPpq;
            double endPpq;
            std::vector<PlaybackEvent> events;
        };
        std::vector<TimeSlice> slices;

        for (const auto& ev : inputEvents)
        {
            if (!ev.message.isNoteOn())
                continue;

            bool found = false;
            for (auto& s : slices)
            {
                if (std::abs(s.startPpq - ev.ppqPosition) < 0.2)
                {
                    s.events.push_back(ev);
                    s.endPpq = std::max(s.endPpq, ev.ppqPosition + ev.ppqDuration);
                    found = true;
                    break;
                }
            }
            if (!found)
            {
                TimeSlice newSlice;
                newSlice.startPpq = ev.ppqPosition;
                newSlice.endPpq = std::min(totalLengthPpq, ev.ppqPosition + std::max(stepPpq, ev.ppqDuration));
                newSlice.events.push_back(ev);
                slices.push_back(newSlice);
            }
        }

        std::vector<PlaybackEvent> output;
        int nextId = 1;
        std::mt19937 rng(777);

        for (const auto& slice : slices)
        {
            if (slice.events.empty())
                continue;

            // Extract base pitches
            std::vector<int> basePitches;
            float avgVelocity = 0.0f;
            for (const auto& ev : slice.events)
            {
                basePitches.push_back(ev.message.getNoteNumber());
                avgVelocity += ev.message.getFloatVelocity();
            }
            avgVelocity /= static_cast<float>(slice.events.size());

            std::sort(basePitches.begin(), basePitches.end());
            basePitches.erase(std::unique(basePitches.begin(), basePitches.end()), basePitches.end());

            // Expand across octaves
            std::vector<int> expandedPitches;
            for (int oct = 0; oct < octaves; ++oct)
            {
                for (int p : basePitches)
                {
                    int note = p + (oct * 12);
                    if (note <= 127)
                        expandedPitches.push_back(note);
                }
            }

            if (expandedPitches.empty())
                continue;

            // Generate sequence pattern
            std::vector<int> pattern;
            switch (mode)
            {
                case ArpMode::Up:
                    pattern = expandedPitches;
                    break;

                case ArpMode::Down:
                    pattern = expandedPitches;
                    std::reverse(pattern.begin(), pattern.end());
                    break;

                case ArpMode::UpDown:
                {
                    pattern = expandedPitches;
                    if (expandedPitches.size() > 2)
                    {
                        for (int i = static_cast<int>(expandedPitches.size()) - 2; i > 0; --i)
                            pattern.push_back(expandedPitches[static_cast<size_t>(i)]);
                    }
                    break;
                }

                case ArpMode::DownUp:
                {
                    pattern = expandedPitches;
                    std::reverse(pattern.begin(), pattern.end());
                    if (pattern.size() > 2)
                    {
                        for (int i = static_cast<int>(pattern.size()) - 2; i > 0; --i)
                            pattern.push_back(pattern[static_cast<size_t>(i)]);
                    }
                    break;
                }

                case ArpMode::Random:
                    pattern = expandedPitches;
                    break;

                case ArpMode::Chord:
                    pattern = expandedPitches;
                    break;
            }

            double sliceLength = slice.endPpq - slice.startPpq;
            int numSteps = std::max(1, static_cast<int>(std::floor(sliceLength / stepPpq)));

            if (mode == ArpMode::Chord)
            {
                for (int step = 0; step < numSteps; ++step)
                {
                    double time = slice.startPpq + (step * stepPpq);
                    for (int pitch : expandedPitches)
                    {
                        PlaybackEvent ev;
                        ev.ppqPosition = time;
                        ev.ppqDuration = noteDuration;
                        ev.message = juce::MidiMessage::noteOn(1, pitch, avgVelocity);
                        ev.noteId = nextId++;
                        output.push_back(ev);
                    }
                }
            }
            else
            {
                for (int step = 0; step < numSteps; ++step)
                {
                    double time = slice.startPpq + (step * stepPpq);
                    int pitch = 0;

                    if (mode == ArpMode::Random)
                    {
                        std::uniform_int_distribution<size_t> dist(0, expandedPitches.size() - 1);
                        pitch = expandedPitches[dist(rng)];
                    }
                    else
                    {
                        pitch = pattern[static_cast<size_t>(step % pattern.size())];
                    }

                    PlaybackEvent ev;
                    ev.ppqPosition = time;
                    ev.ppqDuration = noteDuration;
                    ev.message = juce::MidiMessage::noteOn(1, pitch, avgVelocity);
                    ev.noteId = nextId++;
                    output.push_back(ev);
                }
            }
        }

        return output;
    }
};

} // namespace MidiPreviewer
