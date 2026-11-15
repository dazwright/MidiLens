#include "PluginProcessor.h"
#include "PluginEditor.h"
#include <algorithm>
#include <cmath>
#include <random>
#include <unordered_set>

namespace MidiPreviewer
{

MidiPreviewerAudioProcessor::MidiPreviewerAudioProcessor()
    : AudioProcessor(BusesProperties()), // No audio buses for pure MIDI FX
      apvts(*this, nullptr, "Parameters", createParameterLayout())
{
    transposeParam      = apvts.getRawParameterValue(paramTranspose);
    speedMultParam      = apvts.getRawParameterValue(paramSpeedMult);
    velocityScaleParam  = apvts.getRawParameterValue(paramVelocityScale);
    velocityOffsetParam = apvts.getRawParameterValue(paramVelocityOffset);
    syncModeParam       = apvts.getRawParameterValue(paramSyncMode);
    loopParam           = apvts.getRawParameterValue(paramLoop);
    manualTempoParam    = apvts.getRawParameterValue(paramManualTempo);
}

MidiPreviewerAudioProcessor::~MidiPreviewerAudioProcessor()
{
    std::lock_guard<std::mutex> lock(uiStateMutex);
    retainedFileChoosers.clear();
}

juce::AudioProcessorValueTreeState::ParameterLayout MidiPreviewerAudioProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    params.push_back(std::make_unique<juce::AudioParameterInt>(
        juce::ParameterID { paramTranspose, 1 },
        "Transpose",
        -24, 24, 0));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { paramSpeedMult, 1 },
        "Speed Multiplier",
        juce::NormalisableRange<float>(0.25f, 4.0f, 0.05f),
        1.0f));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { paramVelocityScale, 1 },
        "Velocity Scale",
        juce::NormalisableRange<float>(0.0f, 2.0f, 0.01f),
        1.0f));

    params.push_back(std::make_unique<juce::AudioParameterInt>(
        juce::ParameterID { paramVelocityOffset, 1 },
        "Velocity Offset",
        -64, 64, 0));

    params.push_back(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID { paramSyncMode, 1 },
        "Sync Mode",
        juce::StringArray { "Follow DAW", "Free Audition" },
        0)); // Default to Follow DAW (Sync Play ON) so pressing Play in the DAW starts playback automatically

    params.push_back(std::make_unique<juce::AudioParameterBool>(
        juce::ParameterID { paramLoop, 1 },
        "Loop",
        true));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { paramManualTempo, 1 },
        "Manual Tempo",
        juce::NormalisableRange<float>(20.0f, 320.0f, 1.0f),
        120.0f));

    return { params.begin(), params.end() };
}

bool MidiPreviewerAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    return layouts.getMainInputChannelSet() == juce::AudioChannelSet::disabled()
        && layouts.getMainOutputChannelSet() == juce::AudioChannelSet::disabled();
}

void MidiPreviewerAudioProcessor::prepareToPlay(double newSampleRate, int /*samplesPerBlock*/)
{
    sampleRate = (newSampleRate > 1000.0) ? newSampleRate : 44100.0;
    activeNoteCount = 0;
    previewNoteCount = 0;
    lastPpqPosition = 0.0;
    wasHostPlaying = false;
    currentPlayheadPpq.store(0.0, std::memory_order_relaxed);
    pendingAllNotesOff.store(true, std::memory_order_relaxed);
    activePitchBitsLow.store(0, std::memory_order_relaxed);
    activePitchBitsHigh.store(0, std::memory_order_relaxed);
}

void MidiPreviewerAudioProcessor::releaseResources()
{
    activeNoteCount = 0;
    previewNoteCount = 0;
    activePitchBitsLow.store(0, std::memory_order_relaxed);
    activePitchBitsHigh.store(0, std::memory_order_relaxed);
}

void MidiPreviewerAudioProcessor::handleIncomingCommands(juce::MidiBuffer& midiMessages)
{
    AudioCommand cmd;
    while (commandQueue.pop(cmd))
    {
        switch (cmd.type)
        {
            case AudioCommandType::StartPlayback:
                isPlaying.store(true, std::memory_order_relaxed);
                break;

            case AudioCommandType::PausePlayback:
                isPlaying.store(false, std::memory_order_relaxed);
                pendingAllNotesOff.store(true, std::memory_order_relaxed);
                break;

            case AudioCommandType::StopPlayback:
            {
                isPlaying.store(false, std::memory_order_relaxed);
                const double resetPos = std::max(0.0, loopStartPpq.load(std::memory_order_relaxed));
                currentPlayheadPpq.store(resetPos, std::memory_order_relaxed);
                lastPpqPosition = resetPos;
                pendingAllNotesOff.store(true, std::memory_order_relaxed);
                break;
            }

            case AudioCommandType::SeekPositionPpq:
                currentPlayheadPpq.store(cmd.doubleParam, std::memory_order_relaxed);
                lastPpqPosition = cmd.doubleParam;
                pendingAllNotesOff.store(true, std::memory_order_relaxed);
                break;

            case AudioCommandType::AllNotesOff:
                pendingAllNotesOff.store(true, std::memory_order_relaxed);
                break;

            case AudioCommandType::TriggerPreviewNote:
            {
                const int transpose = transposeParam != nullptr ? static_cast<int>(transposeParam->load(std::memory_order_relaxed)) : 0;
                const int noteNum = juce::jlimit(0, 127, cmd.intParam + transpose);
                const float vel = juce::jlimit(0.05f, 1.0f, cmd.floatParam1);
                const double durSec = juce::jlimit(0.04, 4.0, static_cast<double>(cmd.floatParam2));
                const int durSamples = std::max(1, static_cast<int>(durSec * sampleRate));

                // Retrigger cleanly if already sounding in preview pool
                for (int i = 0; i < previewNoteCount; ++i)
                {
                    if (previewNotePool[static_cast<size_t>(i)].noteNumber == noteNum)
                    {
                        midiMessages.addEvent(juce::MidiMessage::noteOff(1, noteNum, 0.0f), 0);
                        previewNotePool[static_cast<size_t>(i)] = previewNotePool[static_cast<size_t>(--previewNoteCount)];
                        break;
                    }
                }

                midiMessages.addEvent(juce::MidiMessage::noteOn(1, noteNum, vel), 0);
                if (previewNoteCount < static_cast<int>(previewNotePool.size()))
                {
                    previewNotePool[static_cast<size_t>(previewNoteCount++)] = { 1, noteNum, durSamples };
                }
                break;
            }

            case AudioCommandType::UpdateParameters:
            case AudioCommandType::None:
            default:
                break;
        }
    }
}

void MidiPreviewerAudioProcessor::flushAllNotesOff(juce::MidiBuffer& midiMessages)
{
    for (int i = 0; i < activeNoteCount; ++i)
    {
        auto noteOff = juce::MidiMessage::noteOff(activeNotePool[static_cast<size_t>(i)].channel,
                                                  activeNotePool[static_cast<size_t>(i)].noteNumber,
                                                  0.0f);
        midiMessages.addEvent(noteOff, 0);
    }
    activeNoteCount = 0;

    for (int i = 0; i < previewNoteCount; ++i)
    {
        auto noteOff = juce::MidiMessage::noteOff(previewNotePool[static_cast<size_t>(i)].channel,
                                                  previewNotePool[static_cast<size_t>(i)].noteNumber,
                                                  0.0f);
        midiMessages.addEvent(noteOff, 0);
    }
    previewNoteCount = 0;

    for (int ch = 1; ch <= 16; ++ch)
    {
        midiMessages.addEvent(juce::MidiMessage::allNotesOff(ch), 0);
        midiMessages.addEvent(juce::MidiMessage::allSoundOff(ch), 0);
    }

    activePitchBitsLow.store(0, std::memory_order_relaxed);
    activePitchBitsHigh.store(0, std::memory_order_relaxed);
}

void MidiPreviewerAudioProcessor::updateActivePitchBitmask()
{
    uint64_t low = 0;
    uint64_t high = 0;

    for (int i = 0; i < activeNoteCount; ++i)
    {
        const int p = activeNotePool[static_cast<size_t>(i)].noteNumber;
        if (p >= 0 && p < 64)
            low |= (uint64_t(1) << p);
        else if (p >= 64 && p < 128)
            high |= (uint64_t(1) << (p - 64));
    }

    for (int i = 0; i < previewNoteCount; ++i)
    {
        const int p = previewNotePool[static_cast<size_t>(i)].noteNumber;
        if (p >= 0 && p < 64)
            low |= (uint64_t(1) << p);
        else if (p >= 64 && p < 128)
            high |= (uint64_t(1) << (p - 64));
    }

    activePitchBitsLow.store(low, std::memory_order_relaxed);
    activePitchBitsHigh.store(high, std::memory_order_relaxed);
}

bool MidiPreviewerAudioProcessor::isAudioPlaying() const
{
    const int syncMode = syncModeParam != nullptr ? static_cast<int>(syncModeParam->load(std::memory_order_relaxed)) : 0;
    if (syncMode == static_cast<int>(SyncMode::FollowDAW) && hostIsPlaying.load(std::memory_order_relaxed))
        return true;
    return isPlaying.load(std::memory_order_relaxed);
}

std::vector<int> MidiPreviewerAudioProcessor::getActivePitches() const
{
    std::vector<int> pitches;
    const uint64_t low = activePitchBitsLow.load(std::memory_order_relaxed);
    const uint64_t high = activePitchBitsHigh.load(std::memory_order_relaxed);

    if (low != 0)
    {
        for (int b = 0; b < 64; ++b)
            if ((low & (uint64_t(1) << b)) != 0)
                pitches.push_back(b);
    }
    if (high != 0)
    {
        for (int b = 0; b < 64; ++b)
            if ((high & (uint64_t(1) << b)) != 0)
                pitches.push_back(b + 64);
    }
    return pitches;
}

void MidiPreviewerAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    const int numSamples = std::max(1, buffer.getNumSamples() > 0 ? buffer.getNumSamples() : getBlockSize());

    double currentBpm = hostBpm.load(std::memory_order_relaxed);
    bool isHostPlayingNow = false;
    double hostPpq = 0.0;

    if (auto* playHead = getPlayHead())
    {
        if (auto posOpt = playHead->getPosition())
        {
            if (auto bpm = posOpt->getBpm(); bpm.hasValue() && *bpm >= 20.0 && *bpm <= 320.0)
            {
                currentBpm = *bpm;
                hostBpm.store(currentBpm, std::memory_order_relaxed);
                hostBpmDetected.store(true, std::memory_order_relaxed);
            }

            if (auto ts = posOpt->getTimeSignature(); ts.hasValue() && ts->numerator > 0 && ts->denominator > 0)
            {
                hostTimeSigNumerator.store(ts->numerator, std::memory_order_relaxed);
                hostTimeSigDenominator.store(ts->denominator, std::memory_order_relaxed);
                hostTimeSigDetected.store(true, std::memory_order_relaxed);
            }

            isHostPlayingNow = posOpt->getIsPlaying();

            if (auto ppq = posOpt->getPpqPosition())
                hostPpq = *ppq;
        }
    }

    hostIsPlaying.store(isHostPlayingNow, std::memory_order_relaxed);

    handleIncomingCommands(midiMessages);

    if (newSequenceAvailable.load(std::memory_order_acquire))
    {
        bool swapped = false;
        bool shouldResetPlayhead = false;
        {
            std::unique_lock<std::mutex> lock(sequenceExchangeMutex, std::try_to_lock);
            if (lock.owns_lock() && pendingSequence != nullptr && retiredSequence == nullptr)
            {
                // Move displaced activeSequence into retiredSequence so zero heap deallocation occurs on the RT thread
                retiredSequence = std::move(activeSequence);
                activeSequence = std::move(pendingSequence);
                newSequenceAvailable.store(false, std::memory_order_release);
                shouldResetPlayhead = resetPlayheadOnSwap.exchange(false, std::memory_order_acq_rel);
                swapped = true;
            }
        }
        if (swapped)
        {
            flushAllNotesOff(midiMessages);
            if (shouldResetPlayhead)
            {
                currentPlayheadPpq.store(0.0, std::memory_order_relaxed);
                lastPpqPosition = 0.0;
            }
        }
    }

    if (pendingAllNotesOff.exchange(false, std::memory_order_acq_rel))
    {
        flushAllNotesOff(midiMessages);
    }

    // Advance & release one-shot preview audition notes even if transport is stopped
    for (int i = 0; i < previewNoteCount;)
    {
        auto& pn = previewNotePool[static_cast<size_t>(i)];
        if (pn.samplesRemaining <= numSamples)
        {
            const int offOffset = juce::jlimit(0, numSamples - 1, pn.samplesRemaining - 1);
            midiMessages.addEvent(juce::MidiMessage::noteOff(pn.channel, pn.noteNumber, 0.0f), offOffset);
            previewNotePool[static_cast<size_t>(i)] = previewNotePool[static_cast<size_t>(--previewNoteCount)];
        }
        else
        {
            pn.samplesRemaining -= numSamples;
            ++i;
        }
    }

    const int syncMode = static_cast<int>(syncModeParam->load(std::memory_order_relaxed));
    const bool followDaw = (syncMode == static_cast<int>(SyncMode::FollowDAW));

    const bool dawJustStarted = !wasHostPlaying && isHostPlayingNow;
    const bool dawJustStopped = wasHostPlaying && !isHostPlayingNow;
    wasHostPlaying = isHostPlayingNow;

    if (followDaw)
    {
        if (dawJustStarted)
        {
            isPlaying.store(true, std::memory_order_relaxed);
            flushAllNotesOff(midiMessages);
        }
        else if (dawJustStopped)
        {
            isPlaying.store(false, std::memory_order_relaxed);
            currentPlayheadPpq.store(0.0, std::memory_order_relaxed);
            flushAllNotesOff(midiMessages);
        }
    }

    if (activeSequence == nullptr || activeSequence->events.empty())
    {
        updateActivePitchBitmask();
        return;
    }

    const bool loopEnabled = loopParam->load(std::memory_order_relaxed) > 0.5f;
    const int transpose = static_cast<int>(transposeParam->load(std::memory_order_relaxed));
    const float speedMultiplier = std::max(0.1f, speedMultParam->load(std::memory_order_relaxed));
    const float velocityScale = velocityScaleParam->load(std::memory_order_relaxed);
    const int velocityOffset = static_cast<int>(velocityOffsetParam->load(std::memory_order_relaxed));

    const double seqLengthPpq = std::max(0.25, activeSequence->totalLengthPpq);
    const double rawLoopStart = loopStartPpq.load(std::memory_order_relaxed);
    const double rawLoopEnd = loopEndPpq.load(std::memory_order_relaxed);
    const double activeLoopStart = std::max(0.0, std::min(seqLengthPpq - 0.25, rawLoopStart));
    const double activeLoopEnd = (rawLoopEnd > activeLoopStart + 0.24)
        ? std::min(seqLengthPpq, rawLoopEnd)
        : seqLengthPpq;
    const double activeSpan = std::max(0.25, activeLoopEnd - activeLoopStart);

    double startPpq = activeLoopStart;
    double endPpq = activeLoopStart;
    double effectiveBpm = currentBpm;

    if (followDaw && isHostPlayingNow)
    {
        if (!loopEnabled && (activeLoopStart + hostPpq * speedMultiplier) >= activeLoopEnd)
        {
            if (activeNoteCount > 0)
                flushAllNotesOff(midiMessages);
            updateActivePitchBitmask();
            return;
        }

        effectiveBpm = currentBpm;
        const double ppqPerSample = (effectiveBpm / (60.0 * sampleRate)) * speedMultiplier;
        const double blockPpqSpan = ppqPerSample * numSamples;

        double rel = std::fmod(hostPpq * speedMultiplier, activeSpan);
        if (rel < 0.0)
            rel += activeSpan;

        startPpq = activeLoopStart + rel;
        endPpq = startPpq + blockPpqSpan;
        currentPlayheadPpq.store(startPpq, std::memory_order_relaxed);
    }
    else
    {
        if (!isPlaying.load(std::memory_order_relaxed))
        {
            if (activeNoteCount > 0)
                flushAllNotesOff(midiMessages);
            updateActivePitchBitmask();
            return;
        }

        const float manualBpm = manualTempoParam != nullptr ? manualTempoParam->load(std::memory_order_relaxed) : 120.0f;
        effectiveBpm = (followDaw && hostBpmDetected.load(std::memory_order_relaxed))
            ? currentBpm
            : (manualBpm >= 20.0f ? static_cast<double>(manualBpm) : currentBpm);

        const double ppqPerSample = (effectiveBpm / (60.0 * sampleRate)) * speedMultiplier;
        const double blockPpqSpan = ppqPerSample * numSamples;

        startPpq = currentPlayheadPpq.load(std::memory_order_relaxed);
        if (startPpq >= activeLoopEnd || startPpq < activeLoopStart)
            startPpq = activeLoopStart;
        endPpq = startPpq + blockPpqSpan;

        if (loopEnabled && endPpq >= activeLoopEnd)
        {
            const double wrappedPos = activeLoopStart + std::fmod(endPpq - activeLoopStart, activeSpan);
            currentPlayheadPpq.store(wrappedPos, std::memory_order_relaxed);
        }
        else if (endPpq >= activeLoopEnd)
        {
            isPlaying.store(false, std::memory_order_relaxed);
            currentPlayheadPpq.store(activeLoopStart, std::memory_order_relaxed);
            flushAllNotesOff(midiMessages);
            updateActivePitchBitmask();
            return;
        }
        else
        {
            currentPlayheadPpq.store(endPpq, std::memory_order_relaxed);
        }
    }

    const double ppqPerSample = (effectiveBpm / (60.0 * sampleRate)) * speedMultiplier;
    if (ppqPerSample <= 0.0)
    {
        updateActivePitchBitmask();
        return;
    }

    for (const auto& ev : activeSequence->events)
    {
        double evPos = ev.ppqPosition;
        double evEnd = ev.ppqPosition + ev.ppqDuration;

        bool shouldTriggerNoteOn = false;
        double deltaPpqOn = 0.0;

        if (endPpq <= activeLoopEnd)
        {
            if (evPos >= startPpq && evPos < endPpq)
            {
                shouldTriggerNoteOn = true;
                deltaPpqOn = evPos - startPpq;
            }
        }
        else
        {
            double wrappedEnd = activeLoopStart + (endPpq - activeLoopEnd);
            if ((evPos >= startPpq && evPos < activeLoopEnd) || (evPos >= activeLoopStart && evPos < wrappedEnd))
            {
                shouldTriggerNoteOn = true;
                deltaPpqOn = (evPos >= startPpq) ? (evPos - startPpq) : (activeLoopEnd - startPpq + (evPos - activeLoopStart));
            }
        }

        if (shouldTriggerNoteOn && ev.message.isNoteOn())
        {
            int sampleOffset = juce::jlimit(0, numSamples - 1, static_cast<int>(deltaPpqOn / ppqPerSample));
            int origNote = ev.message.getNoteNumber();
            int newNote = juce::jlimit(0, 127, origNote + transpose);

            float origVel = ev.message.getFloatVelocity();
            float newVel = juce::jlimit(0.01f, 1.0f, (origVel * velocityScale) + (velocityOffset / 127.0f));

            auto transformedMsg = juce::MidiMessage::noteOn(ev.message.getChannel(), newNote, newVel);
            midiMessages.addEvent(transformedMsg, sampleOffset);

            if (activeNoteCount < static_cast<int>(activeNotePool.size()))
            {
                activeNotePool[static_cast<size_t>(activeNoteCount++)] = {
                    ev.message.getChannel(),
                    newNote,
                    evEnd
                };
            }
        }

        bool shouldTriggerNoteOff = false;
        double deltaPpqOff = 0.0;

        if (endPpq <= activeLoopEnd)
        {
            if (evEnd >= startPpq && evEnd < endPpq)
            {
                shouldTriggerNoteOff = true;
                deltaPpqOff = evEnd - startPpq;
            }
        }
        else
        {
            double wrappedEnd = activeLoopStart + (endPpq - activeLoopEnd);
            if ((evEnd >= startPpq && evEnd < activeLoopEnd) || (evEnd >= activeLoopStart && evEnd < wrappedEnd))
            {
                shouldTriggerNoteOff = true;
                deltaPpqOff = (evEnd >= startPpq) ? (evEnd - startPpq) : (activeLoopEnd - startPpq + (evEnd - activeLoopStart));
            }
        }

        if (shouldTriggerNoteOff && ev.message.isNoteOn())
        {
            int sampleOffset = juce::jlimit(0, numSamples - 1, static_cast<int>(deltaPpqOff / ppqPerSample));
            int transposedNote = juce::jlimit(0, 127, ev.message.getNoteNumber() + transpose);
            auto noteOffMsg = juce::MidiMessage::noteOff(ev.message.getChannel(), transposedNote, 0.0f);
            midiMessages.addEvent(noteOffMsg, sampleOffset);

            for (int k = 0; k < activeNoteCount; ++k)
            {
                if (activeNotePool[static_cast<size_t>(k)].channel == ev.message.getChannel()
                    && activeNotePool[static_cast<size_t>(k)].noteNumber == transposedNote)
                {
                    activeNotePool[static_cast<size_t>(k)] = activeNotePool[static_cast<size_t>(--activeNoteCount)];
                    break;
                }
            }
        }
    }

    updateActivePitchBitmask();
}

juce::Array<juce::File> MidiPreviewerAudioProcessor::scanFolderForMidiFiles(const juce::File& rootFolder, bool searchSubfolders)
{
    juce::Array<juce::File> results;
    if (!rootFolder.isDirectory())
        return results;

    rootFolder.findChildFiles(results, juce::File::findFiles, searchSubfolders, "*.mid;*.midi");
    return results;
}

void MidiPreviewerAudioProcessor::quantizeTiming(double gridPpq)
{
    auto snap = getSequenceSnapshot();
    if (snap == nullptr) return;

    auto updated = std::make_shared<SequenceSnapshot>(*snap);
    for (auto& ev : updated->events)
    {
        ev.ppqPosition = std::round(ev.ppqPosition / gridPpq) * gridPpq;
        ev.ppqDuration = std::max(gridPpq, std::round(ev.ppqDuration / gridPpq) * gridPpq);
    }
    setSequenceSnapshot(updated, false);
}

void MidiPreviewerAudioProcessor::quantizeScale(int rootPitch, MusicalScale scale)
{
    auto snap = getSequenceSnapshot();
    if (snap == nullptr || scale == MusicalScale::Chromatic) return;

    auto updated = std::make_shared<SequenceSnapshot>(*snap);
    PianoRollComponent helper;
    helper.setScale(rootPitch, scale, true);

    for (auto& ev : updated->events)
    {
        if (ev.message.isNoteOn())
        {
            int noteNum = ev.message.getNoteNumber();
            int snapped = helper.snapPitchToActiveScale(noteNum);
            ev.message = juce::MidiMessage::noteOn(ev.message.getChannel(), snapped, ev.message.getFloatVelocity());
        }
    }
    setSequenceSnapshot(updated, false);
}

void MidiPreviewerAudioProcessor::humanizeVelocity(int rangeDelta)
{
    auto snap = getSequenceSnapshot();
    if (snap == nullptr) return;

    auto updated = std::make_shared<SequenceSnapshot>(*snap);
    std::mt19937 rng(1337);
    std::uniform_real_distribution<float> dist(-rangeDelta / 127.0f, rangeDelta / 127.0f);

    for (auto& ev : updated->events)
    {
        if (ev.message.isNoteOn())
        {
            float vel = ev.message.getFloatVelocity();
            float newVel = juce::jlimit(0.05f, 1.0f, vel + dist(rng));
            ev.message = juce::MidiMessage::noteOn(ev.message.getChannel(), ev.message.getNoteNumber(), newVel);
        }
    }
    setSequenceSnapshot(updated, false);
}

void MidiPreviewerAudioProcessor::humanizeTiming(double maxDeltaPpq)
{
    auto snap = getSequenceSnapshot();
    if (snap == nullptr) return;

    auto updated = std::make_shared<SequenceSnapshot>(*snap);
    std::mt19937 rng(42);
    std::uniform_real_distribution<double> dist(-maxDeltaPpq, maxDeltaPpq);

    for (auto& ev : updated->events)
    {
        ev.ppqPosition = std::max(0.0, ev.ppqPosition + dist(rng));
    }
    setSequenceSnapshot(updated, false);
}

void MidiPreviewerAudioProcessor::harmonizeNotes(int semitoneInterval)
{
    auto snap = getSequenceSnapshot();
    if (snap == nullptr) return;

    auto updated = std::make_shared<SequenceSnapshot>(*snap);
    for (auto& ev : updated->events)
    {
        if (ev.message.isNoteOn())
        {
            int targetPitch = juce::jlimit(0, 127, ev.message.getNoteNumber() + semitoneInterval);
            ev.message = juce::MidiMessage::noteOn(ev.message.getChannel(), targetPitch, ev.message.getFloatVelocity());
        }
    }

    setSequenceSnapshot(updated, false);
}

void MidiPreviewerAudioProcessor::setSequenceLength(double newTotalPpq)
{
    auto snap = getSequenceSnapshot();
    if (snap == nullptr) return;

    auto updated = std::make_shared<SequenceSnapshot>(*snap);
    updated->totalLengthPpq = std::max(1.0, newTotalPpq);
    setSequenceSnapshot(updated, false);
}

void MidiPreviewerAudioProcessor::setLoopRangePpq(double startPpq, double endPpq)
{
    loopStartPpq.store(std::max(0.0, startPpq), std::memory_order_relaxed);
    loopEndPpq.store(endPpq, std::memory_order_relaxed);
}

void MidiPreviewerAudioProcessor::loadMidiSequenceFromFile(const juce::File& midiFile)
{
    if (!midiFile.existsAsFile())
        return;

    juce::FileInputStream inputStream(midiFile);
    if (!inputStream.openedOk())
        return;

    juce::MidiFile parsedFile;
    if (!parsedFile.readFrom(inputStream))
        return;

    parsedFile.convertTimestampTicksToSeconds();

    auto snapshot = std::make_shared<SequenceSnapshot>();
    snapshot->sequenceName = midiFile.getFileNameWithoutExtension();
    snapshot->nativeBpm = 120.0;
    snapshot->timeSigNumerator = 4;
    snapshot->timeSigDenominator = 4;

    juce::MidiMessageSequence combinedSequence;
    for (int t = 0; t < parsedFile.getNumTracks(); ++t)
    {
        if (const auto* track = parsedFile.getTrack(t))
            combinedSequence.addSequence(*track, 0.0);
    }

    combinedSequence.updateMatchedPairs();
    combinedSequence.sort();

    for (int i = 0; i < combinedSequence.getNumEvents(); ++i)
    {
        const auto& msg = combinedSequence.getEventPointer(i)->message;
        if (msg.isTempoMetaEvent())
        {
            snapshot->nativeBpm = 60.0 / msg.getTempoSecondsPerQuarterNote();
            break;
        }
        if (msg.isTimeSignatureMetaEvent())
        {
            msg.getTimeSignatureInfo(snapshot->timeSigNumerator, snapshot->timeSigDenominator);
        }
    }

    double secondsPerQuarter = 60.0 / snapshot->nativeBpm;

    struct OpenNote
    {
        double startSec;
        float velocity;
        int noteId;
    };
    std::array<std::array<std::vector<OpenNote>, 128>, 16> openNotes;
    int nextId = 1;

    for (int i = 0; i < combinedSequence.getNumEvents(); ++i)
    {
        const auto& msg = combinedSequence.getEventPointer(i)->message;
        int ch = juce::jlimit(1, 16, msg.getChannel()) - 1;

        if (msg.isNoteOn())
        {
            int noteNum = msg.getNoteNumber();
            openNotes[static_cast<size_t>(ch)][static_cast<size_t>(noteNum)].push_back({
                msg.getTimeStamp(),
                msg.getFloatVelocity(),
                nextId++
            });
        }
        else if (msg.isNoteOff())
        {
            int noteNum = msg.getNoteNumber();
            auto& list = openNotes[static_cast<size_t>(ch)][static_cast<size_t>(noteNum)];
            if (!list.empty())
            {
                auto startInfo = list.front();
                list.erase(list.begin());

                double startSec = startInfo.startSec;
                double endSec = std::max(startSec + 0.05, msg.getTimeStamp());

                PlaybackEvent ev;
                ev.ppqPosition = startSec / secondsPerQuarter;
                ev.ppqDuration = (endSec - startSec) / secondsPerQuarter;
                ev.message = juce::MidiMessage::noteOn(ch + 1, noteNum, startInfo.velocity);
                ev.noteId = startInfo.noteId;

                snapshot->events.push_back(ev);
            }
        }
    }

    double maxPpq = 4.0;
    for (const auto& ev : snapshot->events)
    {
        maxPpq = std::max(maxPpq, ev.ppqPosition + ev.ppqDuration);
    }
    double barPpq = static_cast<double>(snapshot->timeSigNumerator) * (4.0 / snapshot->timeSigDenominator);
    snapshot->totalLengthPpq = std::ceil(maxPpq / barPpq) * barPpq;

    KeyDetector detector;
    auto keyResult = detector.analyze(combinedSequence);
    snapshot->detectedKeyName = keyResult.keyName;
    snapshot->detectedRootPitch = keyResult.rootPitch;
    snapshot->detectedIsMinor = keyResult.isMinor;
    snapshot->keyConfidence = keyResult.confidence;

    setSequenceSnapshot(snapshot, true);
}

void MidiPreviewerAudioProcessor::setSequenceSnapshot(std::shared_ptr<const SequenceSnapshot> newSnapshot, bool resetPlayhead)
{
    std::lock_guard<std::mutex> lock(sequenceExchangeMutex);
    // Free any previously retired sequence safely on the non-RT message thread
    retiredSequence.reset();
    pendingSequence = std::move(newSnapshot);
    if (resetPlayhead)
        resetPlayheadOnSwap.store(true, std::memory_order_relaxed);
    newSequenceAvailable.store(pendingSequence != nullptr, std::memory_order_release);
}

std::shared_ptr<const SequenceSnapshot> MidiPreviewerAudioProcessor::getSequenceSnapshot() const
{
    std::lock_guard<std::mutex> lock(sequenceExchangeMutex);
    return pendingSequence ? pendingSequence : activeSequence;
}

void MidiPreviewerAudioProcessor::sendAudioCommand(const AudioCommand& cmd)
{
    commandQueue.push(cmd);
}

void MidiPreviewerAudioProcessor::setSavedUiStateJson(const juce::String& json)
{
    if (json.getNumBytesAsUTF8() > static_cast<size_t>(maxUiStateJsonBytes))
        return;

    std::lock_guard<std::mutex> lock(uiStateMutex);
    savedUiStateJson = json;
}

juce::String MidiPreviewerAudioProcessor::getSavedUiStateJson() const
{
    std::lock_guard<std::mutex> lock(uiStateMutex);
    return savedUiStateJson;
}

namespace
{
    std::mutex& getSharedLibraryFileMutex()
    {
        static std::mutex m;
        return m;
    }

    struct SharedLibraryStore
    {
        std::mutex mutex;
        bool loaded { false };
        bool loading { false };
        std::vector<std::function<void()>> pendingCallbacks;
        std::vector<juce::String> folders;
        std::vector<ScannedFileMetadata> files;
    };

    SharedLibraryStore& getSharedLibraryStore()
    {
        static SharedLibraryStore store;
        return store;
    }

    void readLibraryFromDisk(const juce::File& libFile,
                             std::vector<juce::String>& outFolders,
                             std::vector<ScannedFileMetadata>& outFiles)
    {
        std::lock_guard<std::mutex> fileLock(getSharedLibraryFileMutex());
        if (!libFile.existsAsFile())
            return;

        const juce::var parsed = juce::JSON::parse(libFile);
        if (!parsed.isObject())
            return;

        std::unordered_set<std::string> seenFolders;
        if (const auto* foldersArr = parsed.getProperty("folders", juce::var()).getArray())
        {
            outFolders.reserve(static_cast<size_t>(foldersArr->size()));
            for (const auto& entry : *foldersArr)
            {
                const juce::String folderPath = entry.toString();
                if (folderPath.isNotEmpty() && seenFolders.insert(folderPath.toStdString()).second)
                    outFolders.push_back(folderPath);
            }
        }

        if (const auto* filesArr = parsed.getProperty("files", juce::var()).getArray())
        {
            outFiles.reserve(static_cast<size_t>(filesArr->size()));
            std::unordered_set<std::string> seenFiles;
            seenFiles.reserve(static_cast<size_t>(filesArr->size()) + 16);

            for (const auto& entry : *filesArr)
            {
                if (!entry.isObject())
                    continue;

                ScannedFileMetadata meta;
                meta.name = entry.getProperty("name", "").toString();
                meta.relativePath = entry.getProperty("relativePath", "").toString();
                meta.fullPath = entry.getProperty("fullPath", "").toString();
                meta.sizeBytes = static_cast<juce::int64>(entry.getProperty("sizeBytes", 0));

                if (meta.fullPath.isNotEmpty() && seenFiles.insert(meta.fullPath.toStdString()).second)
                    outFiles.push_back(std::move(meta));
            }
        }
    }

    void mergeIntoStoreLocked(SharedLibraryStore& store,
                              const std::vector<juce::String>& diskFolders,
                              const std::vector<ScannedFileMetadata>& diskFiles)
    {
        std::unordered_set<std::string> seenFolders;
        seenFolders.reserve(store.folders.size() + diskFolders.size());
        for (const auto& f : store.folders)
            seenFolders.insert(f.toStdString());
        for (const auto& f : diskFolders)
        {
            if (f.isNotEmpty() && seenFolders.insert(f.toStdString()).second)
                store.folders.push_back(f);
        }

        std::unordered_set<std::string> seenFiles;
        seenFiles.reserve(store.files.size() + diskFiles.size());
        for (const auto& item : store.files)
            seenFiles.insert(item.fullPath.toStdString());
        for (const auto& item : diskFiles)
        {
            if (item.fullPath.isNotEmpty() && seenFiles.insert(item.fullPath.toStdString()).second)
                store.files.push_back(item);
        }

        store.loaded = true;
    }

    void scheduleSaveGlobalLibraryToDisk(const juce::File& libFile)
    {
        juce::Thread::launch([libFile]()
        {
            std::lock_guard<std::mutex> fileLock(getSharedLibraryFileMutex());

            std::vector<juce::String> foldersCopy;
            std::vector<ScannedFileMetadata> filesCopy;
            {
                auto& store = getSharedLibraryStore();
                std::lock_guard<std::mutex> storeLock(store.mutex);
                foldersCopy = store.folders;
                filesCopy = store.files;
            }

            juce::DynamicObject::Ptr root = new juce::DynamicObject();

            juce::Array<juce::var> foldersArr;
            for (const auto& folder : foldersCopy)
                foldersArr.add(folder);
            root->setProperty("folders", foldersArr);

            juce::Array<juce::var> filesArr;
            filesArr.ensureStorageAllocated(static_cast<int>(filesCopy.size()));
            for (const auto& item : filesCopy)
            {
                juce::DynamicObject::Ptr fObj = new juce::DynamicObject();
                fObj->setProperty("name", item.name);
                fObj->setProperty("relativePath", item.relativePath);
                fObj->setProperty("fullPath", item.fullPath);
                fObj->setProperty("sizeBytes", static_cast<juce::int64>(item.sizeBytes));
                filesArr.add(juce::var(fObj.get()));
            }
            root->setProperty("files", filesArr);

            // Compact JSON (allOnOneLine = true) dramatically speeds up write & parse on large libraries
            libFile.replaceWithText(juce::JSON::toString(juce::var(root.get()), true));
        });
    }
} // namespace

juce::File MidiPreviewerAudioProcessor::getGlobalLibraryFile()
{
    auto appData = juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory);
   #if JUCE_MAC
    auto dir = appData.getChildFile("Application Support").getChildFile("Daz Corp").getChildFile("MidiLens");
   #else
    auto dir = appData.getChildFile("Daz Corp").getChildFile("MidiLens");
   #endif
    dir.createDirectory();
    return dir.getChildFile("shared_library.json");
}

void MidiPreviewerAudioProcessor::loadGlobalLibraryAsync(std::function<void()> onLoaded)
{
    auto& store = getSharedLibraryStore();
    bool startThread = false;
    bool alreadyLoaded = false;

    {
        std::lock_guard<std::mutex> lock(store.mutex);
        if (store.loaded)
        {
            alreadyLoaded = true;
        }
        else
        {
            if (onLoaded)
                store.pendingCallbacks.push_back(std::move(onLoaded));

            if (!store.loading)
            {
                store.loading = true;
                startThread = true;
            }
        }
    }

    if (alreadyLoaded)
    {
        if (onLoaded)
        {
            juce::MessageManager::callAsync([cb = std::move(onLoaded)]()
            {
                cb();
            });
        }
        return;
    }

    if (!startThread)
        return;

    const juce::File libFile = getGlobalLibraryFile();
    juce::Thread::launch([libFile]()
    {
        std::vector<juce::String> diskFolders;
        std::vector<ScannedFileMetadata> diskFiles;
        readLibraryFromDisk(libFile, diskFolders, diskFiles);

        std::vector<std::function<void()>> callbacks;
        {
            auto& s = getSharedLibraryStore();
            std::lock_guard<std::mutex> lock(s.mutex);
            mergeIntoStoreLocked(s, diskFolders, diskFiles);
            s.loading = false;
            callbacks.swap(s.pendingCallbacks);
        }

        if (!callbacks.empty())
        {
            juce::MessageManager::callAsync([callbacks = std::move(callbacks)]()
            {
                for (const auto& cb : callbacks)
                {
                    if (cb)
                        cb();
                }
            });
        }
    });
}

void MidiPreviewerAudioProcessor::appendScannedFolders(const std::vector<juce::String>& folderPaths)
{
    auto& store = getSharedLibraryStore();
    const juce::File libFile = getGlobalLibraryFile();

    bool needsDiskHydration = false;
    {
        std::lock_guard<std::mutex> lock(store.mutex);
        needsDiskHydration = !store.loaded;
    }

    if (needsDiskHydration)
    {
        std::vector<juce::String> diskFolders;
        std::vector<ScannedFileMetadata> diskFiles;
        readLibraryFromDisk(libFile, diskFolders, diskFiles);
        std::lock_guard<std::mutex> lock(store.mutex);
        if (!store.loaded)
            mergeIntoStoreLocked(store, diskFolders, diskFiles);
    }

    bool changed = false;
    {
        std::lock_guard<std::mutex> lock(store.mutex);
        std::unordered_set<std::string> existing;
        existing.reserve(store.folders.size() + folderPaths.size());
        for (const auto& f : store.folders)
            existing.insert(f.toStdString());

        for (const auto& folder : folderPaths)
        {
            if (folder.isNotEmpty() && existing.insert(folder.toStdString()).second)
            {
                store.folders.push_back(folder);
                changed = true;
            }
        }
    }

    if (changed)
        scheduleSaveGlobalLibraryToDisk(libFile);
}

std::vector<juce::String> MidiPreviewerAudioProcessor::getScannedFolders() const
{
    auto& store = getSharedLibraryStore();
    std::lock_guard<std::mutex> lock(store.mutex);
    return store.folders;
}

void MidiPreviewerAudioProcessor::appendScannedFiles(const std::vector<ScannedFileMetadata>& files)
{
    auto& store = getSharedLibraryStore();
    const juce::File libFile = getGlobalLibraryFile();

    bool needsDiskHydration = false;
    {
        std::lock_guard<std::mutex> lock(store.mutex);
        needsDiskHydration = !store.loaded;
    }

    if (needsDiskHydration)
    {
        std::vector<juce::String> diskFolders;
        std::vector<ScannedFileMetadata> diskFiles;
        readLibraryFromDisk(libFile, diskFolders, diskFiles);
        std::lock_guard<std::mutex> lock(store.mutex);
        if (!store.loaded)
            mergeIntoStoreLocked(store, diskFolders, diskFiles);
    }

    bool changed = false;
    {
        std::lock_guard<std::mutex> lock(store.mutex);
        std::unordered_set<std::string> existing;
        existing.reserve(store.files.size() + files.size());
        for (const auto& f : store.files)
            existing.insert(f.fullPath.toStdString());

        for (const auto& item : files)
        {
            if (existing.insert(item.fullPath.toStdString()).second)
            {
                store.files.push_back(item);
                changed = true;
            }
        }
    }

    if (changed)
        scheduleSaveGlobalLibraryToDisk(libFile);
}

std::vector<ScannedFileMetadata> MidiPreviewerAudioProcessor::getScannedFiles() const
{
    auto& store = getSharedLibraryStore();
    std::lock_guard<std::mutex> lock(store.mutex);
    return store.files;
}

std::vector<ScannedFileMetadata> MidiPreviewerAudioProcessor::getScannedFilesSlice(size_t offset, size_t count, size_t& outTotal) const
{
    auto& store = getSharedLibraryStore();
    std::lock_guard<std::mutex> lock(store.mutex);
    outTotal = store.files.size();
    if (offset >= outTotal || count == 0)
        return {};

    const size_t end = std::min(offset + count, outTotal);
    return std::vector<ScannedFileMetadata>(
        store.files.begin() + static_cast<ptrdiff_t>(offset),
        store.files.begin() + static_cast<ptrdiff_t>(end));
}

size_t MidiPreviewerAudioProcessor::getScannedFilesCount() const
{
    auto& store = getSharedLibraryStore();
    std::lock_guard<std::mutex> lock(store.mutex);
    return store.files.size();
}

void MidiPreviewerAudioProcessor::clearGlobalLibrary()
{
    auto& store = getSharedLibraryStore();
    {
        std::lock_guard<std::mutex> lock(store.mutex);
        store.folders.clear();
        store.files.clear();
        store.loaded = true;
        store.loading = false;
        store.pendingCallbacks.clear();
    }
    scheduleSaveGlobalLibraryToDisk(getGlobalLibraryFile());
}

void MidiPreviewerAudioProcessor::retainFileChooser(std::shared_ptr<juce::FileChooser> chooser)
{
    if (chooser == nullptr)
        return;
    std::lock_guard<std::mutex> lock(uiStateMutex);
    // Keep only the active chooser (and previous one during async callback completion) to prevent unbounded leaks
    while (retainedFileChoosers.size() >= 2)
        retainedFileChoosers.erase(retainedFileChoosers.begin());
    retainedFileChoosers.push_back(std::move(chooser));
}

KeyDetectionResult MidiPreviewerAudioProcessor::getDetectedKey() const
{
    KeyDetectionResult res;
    if (auto snap = getSequenceSnapshot())
    {
        res.keyName = snap->detectedKeyName;
        res.rootPitch = snap->detectedRootPitch;
        res.isMinor = snap->detectedIsMinor;
        res.confidence = snap->keyConfidence;
    }
    return res;
}

juce::AudioProcessorEditor* MidiPreviewerAudioProcessor::createEditor()
{
    return new MidiPreviewerAudioProcessorEditor(*this);
}

void MidiPreviewerAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    if (xml != nullptr)
    {
        const juce::String uiJson = getSavedUiStateJson();
        if (uiJson.isNotEmpty())
            xml->setAttribute("midiLensUiState", uiJson);
        copyXmlToBinary(*xml, destData);
    }
}

void MidiPreviewerAudioProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
    if (xmlState != nullptr && xmlState->hasTagName(apvts.state.getType()))
    {
        if (xmlState->hasAttribute("midiLensUiState"))
        {
            setSavedUiStateJson(xmlState->getStringAttribute("midiLensUiState"));
            xmlState->removeAttribute("midiLensUiState");
        }
        apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
    }
}

} // namespace MidiPreviewer

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new MidiPreviewer::MidiPreviewerAudioProcessor();
}
