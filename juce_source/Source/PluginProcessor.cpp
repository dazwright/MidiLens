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

MidiPreviewerAudioProcessor::~MidiPreviewerAudioProcessor() = default;

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
        1)); // Default to Free Audition so Play works immediately even when DAW transport is stopped

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
                isPlaying.store(false, std::memory_order_relaxed);
                currentPlayheadPpq.store(0.0, std::memory_order_relaxed);
                lastPpqPosition = 0.0;
                pendingAllNotesOff.store(true, std::memory_order_relaxed);
                break;

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
    const int syncMode = syncModeParam != nullptr ? static_cast<int>(syncModeParam->load(std::memory_order_relaxed)) : 1;
    if (syncMode == static_cast<int>(SyncMode::FollowDAW))
        return hostIsPlaying.load(std::memory_order_relaxed);
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

    // Track host DAW key signature via explicit MIDI meta-events AND live DAW track notes
    for (const auto metadata : midiMessages)
    {
        auto msg = metadata.getMessage();
        if (msg.isKeySignatureMetaEvent() || (msg.isMetaEvent() && msg.getRawDataSize() >= 4 && msg.getRawData()[1] == 0x59))
        {
            const auto* rawData = msg.getRawData();
            const int size = msg.getRawDataSize();
            int8_t sf = (size >= 4) ? static_cast<int8_t>(rawData[3]) : 0;
            bool isMinor = (size >= 5) ? (rawData[4] != 0) : false;
            int root = isMinor ? ((9 + sf * 7) % 12 + 12) % 12
                               : ((sf * 7) % 12 + 12) % 12;
            hostKeyRoot.store(root, std::memory_order_relaxed);
            hostKeyIsMinor.store(isMinor, std::memory_order_relaxed);
            hostKeyDetected.store(true, std::memory_order_relaxed);
        }
        else if (msg.isNoteOn() && msg.getVelocity() > 0)
        {
            int pitchClass = msg.getNoteNumber() % 12;
            float vel = msg.getFloatVelocity();
            dawIncomingPitchClassWeights[static_cast<size_t>(pitchClass)] += vel;
            dawIncomingNoteCount++;

            if (dawIncomingNoteCount >= 8)
            {
                KeyDetector detector;
                auto res = detector.analyzeNoteWeights(dawIncomingPitchClassWeights);
                if (res.confidence > 0.05f)
                {
                    hostKeyRoot.store(res.rootPitch, std::memory_order_relaxed);
                    hostKeyIsMinor.store(res.isMinor, std::memory_order_relaxed);
                    hostKeyDetected.store(true, std::memory_order_relaxed);
                }
                for (auto& w : dawIncomingPitchClassWeights)
                    w *= 0.5f;
                dawIncomingNoteCount = 4;
            }
        }
    }

    double currentBpm = 120.0;
    bool isHostPlayingNow = false;
    double hostPpq = 0.0;

    if (auto* playHead = getPlayHead())
    {
        if (auto posOpt = playHead->getPosition())
        {
            if (auto bpm = posOpt->getBpm())
                currentBpm = *bpm;

            isHostPlayingNow = posOpt->getIsPlaying();

            if (auto ppq = posOpt->getPpqPosition())
                hostPpq = *ppq;
        }
    }

    hostBpm.store(currentBpm, std::memory_order_relaxed);
    hostIsPlaying.store(isHostPlayingNow, std::memory_order_relaxed);

    handleIncomingCommands(midiMessages);

    if (newSequenceAvailable.load(std::memory_order_acquire))
    {
        {
            std::lock_guard<std::mutex> lock(sequenceExchangeMutex);
            activeSequence = pendingSequence;
        }
        newSequenceAvailable.store(false, std::memory_order_release);
        flushAllNotesOff(midiMessages);
        if (resetPlayheadOnSwap.exchange(false, std::memory_order_acq_rel))
        {
            currentPlayheadPpq.store(0.0, std::memory_order_relaxed);
            lastPpqPosition = 0.0;
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

    if (activeSequence == nullptr || activeSequence->events.empty())
    {
        updateActivePitchBitmask();
        return;
    }

    const int syncMode = static_cast<int>(syncModeParam->load(std::memory_order_relaxed));
    const bool loopEnabled = loopParam->load(std::memory_order_relaxed) > 0.5f;
    const int transpose = static_cast<int>(transposeParam->load(std::memory_order_relaxed));
    const float speedMultiplier = std::max(0.1f, speedMultParam->load(std::memory_order_relaxed));
    const float velocityScale = velocityScaleParam->load(std::memory_order_relaxed);
    const int velocityOffset = static_cast<int>(velocityOffsetParam->load(std::memory_order_relaxed));

    const double seqLengthPpq = std::max(0.25, activeSequence->totalLengthPpq);

    double startPpq = 0.0;
    double endPpq = 0.0;
    double effectiveBpm = currentBpm;

    if (syncMode == static_cast<int>(SyncMode::FollowDAW))
    {
        if (!isHostPlayingNow)
        {
            if (activeNoteCount > 0)
                flushAllNotesOff(midiMessages);
            updateActivePitchBitmask();
            return;
        }

        effectiveBpm = currentBpm;
        const double ppqPerSample = (effectiveBpm / (60.0 * sampleRate)) * speedMultiplier;
        const double blockPpqSpan = ppqPerSample * numSamples;

        startPpq = std::fmod(hostPpq * speedMultiplier, seqLengthPpq);
        if (startPpq < 0.0)
            startPpq += seqLengthPpq;

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
        effectiveBpm = manualBpm >= 20.0f ? static_cast<double>(manualBpm) : currentBpm;

        const double ppqPerSample = (effectiveBpm / (60.0 * sampleRate)) * speedMultiplier;
        const double blockPpqSpan = ppqPerSample * numSamples;

        startPpq = currentPlayheadPpq.load(std::memory_order_relaxed);
        if (startPpq >= seqLengthPpq || startPpq < 0.0)
            startPpq = 0.0;
        endPpq = startPpq + blockPpqSpan;

        if (loopEnabled && endPpq >= seqLengthPpq)
        {
            currentPlayheadPpq.store(std::fmod(endPpq, seqLengthPpq), std::memory_order_relaxed);
        }
        else if (endPpq >= seqLengthPpq)
        {
            isPlaying.store(false, std::memory_order_relaxed);
            currentPlayheadPpq.store(0.0, std::memory_order_relaxed);
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

        if (endPpq <= seqLengthPpq)
        {
            if (evPos >= startPpq && evPos < endPpq)
            {
                shouldTriggerNoteOn = true;
                deltaPpqOn = evPos - startPpq;
            }
        }
        else
        {
            double wrappedEnd = endPpq - seqLengthPpq;
            if ((evPos >= startPpq && evPos < seqLengthPpq) || (evPos >= 0.0 && evPos < wrappedEnd))
            {
                shouldTriggerNoteOn = true;
                deltaPpqOn = (evPos >= startPpq) ? (evPos - startPpq) : (seqLengthPpq - startPpq + evPos);
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

        if (endPpq <= seqLengthPpq)
        {
            if (evEnd >= startPpq && evEnd < endPpq)
            {
                shouldTriggerNoteOff = true;
                deltaPpqOff = evEnd - startPpq;
            }
        }
        else
        {
            double wrappedEnd = endPpq - seqLengthPpq;
            if ((evEnd >= startPpq && evEnd < seqLengthPpq) || (evEnd >= 0.0 && evEnd < wrappedEnd))
            {
                shouldTriggerNoteOff = true;
                deltaPpqOff = (evEnd >= startPpq) ? (evEnd - startPpq) : (seqLengthPpq - startPpq + evEnd);
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
    pendingSequence = std::move(newSnapshot);
    if (resetPlayhead)
        resetPlayheadOnSwap.store(true, std::memory_order_relaxed);
    newSequenceAvailable.store(true, std::memory_order_release);
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
    std::lock_guard<std::mutex> lock(uiStateMutex);
    savedUiStateJson = json;
}

juce::String MidiPreviewerAudioProcessor::getSavedUiStateJson() const
{
    std::lock_guard<std::mutex> lock(uiStateMutex);
    return savedUiStateJson;
}

void MidiPreviewerAudioProcessor::appendScannedFiles(const std::vector<ScannedFileMetadata>& files)
{
    std::lock_guard<std::mutex> lock(uiStateMutex);
    std::unordered_set<std::string> existing;
    existing.reserve(scannedFilesMetadata.size() + files.size());
    for (const auto& f : scannedFilesMetadata)
        existing.insert(f.fullPath.toStdString());

    for (const auto& item : files)
    {
        if (existing.insert(item.fullPath.toStdString()).second)
            scannedFilesMetadata.push_back(item);
    }
}

std::vector<ScannedFileMetadata> MidiPreviewerAudioProcessor::getScannedFiles() const
{
    std::lock_guard<std::mutex> lock(uiStateMutex);
    return scannedFilesMetadata;
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
