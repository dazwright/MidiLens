#include "MidiFileExporter.h"

namespace MidiPreviewer
{

juce::File MidiFileExporter::writeToTempFile(const SequenceSnapshot& snapshot, const ExportOptions& options)
{
    juce::File tempDir = juce::File::getSpecialLocation(juce::File::tempDirectory)
                             .getChildFile("MIDI_Previewer_Exports");
    tempDir.createDirectory();

    juce::String cleanName = snapshot.sequenceName.isEmpty() ? "MidiPreview" : snapshot.sequenceName;
    cleanName = cleanName.replaceCharacters("/\\?%*:|\"<>", "_________");

    juce::String fileName = juce::String::formatted("%s_Transposed_%+d.mid",
                                                    cleanName.toRawUTF8(),
                                                    options.semitoneTranspose);
    juce::File tempFile = tempDir.getNonexistentChildFile(fileName, ".mid");

    juce::MidiFile midiFile;
    midiFile.setTicksPerQuarterNote(960);

    juce::MidiMessageSequence trackSequence;

    // Track Name Meta Event
    trackSequence.addEvent(juce::MidiMessage::textMetaEvent(3, options.trackName), 0.0);

    // Time Signature Meta Event
    trackSequence.addEvent(juce::MidiMessage::timeSignatureMetaEvent(snapshot.timeSigNumerator, snapshot.timeSigDenominator), 0.0);

    // Tempo Meta Event in microseconds per quarter note
    double exportBpm = (options.targetBpm > 10.0) ? (options.targetBpm * options.speedMultiplier) : (snapshot.nativeBpm * options.speedMultiplier);
    double microSecondsPerQuarter = 60000000.0 / std::max(20.0, exportBpm);
    trackSequence.addEvent(juce::MidiMessage::tempoMetaEvent(static_cast<int>(microSecondsPerQuarter)), 0.0);

    // Process notes with transpose and velocity transformations
    const double ticksPerQuarter = 960.0;

    for (const auto& ev : snapshot.events)
    {
        double startTick = (ev.ppqPosition / std::max(0.01f, options.speedMultiplier)) * ticksPerQuarter;
        double endTick = ((ev.ppqPosition + ev.ppqDuration) / std::max(0.01f, options.speedMultiplier)) * ticksPerQuarter;

        if (ev.message.isNoteOn())
        {
            int originalNote = ev.message.getNoteNumber();
            int transposedNote = juce::jlimit(0, 127, originalNote + options.semitoneTranspose);

            float origVel = ev.message.getFloatVelocity();
            float scaledVel = juce::jlimit(0.01f, 1.0f, (origVel * options.velocityScale) + (options.velocityOffset / 127.0f));

            auto noteOn = juce::MidiMessage::noteOn(ev.message.getChannel(), transposedNote, scaledVel);
            trackSequence.addEvent(noteOn, startTick);

            auto noteOff = juce::MidiMessage::noteOff(ev.message.getChannel(), transposedNote, 0.0f);
            trackSequence.addEvent(noteOff, std::max(startTick + 10.0, endTick));
        }
        else if (!ev.message.isNoteOff())
        {
            // Retain CC, Pitch Bend, Program Change, etc.
            auto copiedMsg = ev.message;
            trackSequence.addEvent(copiedMsg, startTick);
        }
    }

    trackSequence.updateMatchedPairs();
    trackSequence.sort();

    // End of Track Meta Event
    double lastTimestamp = trackSequence.getEndTime() + 960.0;
    trackSequence.addEvent(juce::MidiMessage::endOfTrackMetaEvent(), lastTimestamp);

    midiFile.addTrack(trackSequence);

    juce::FileOutputStream stream(tempFile);
    if (stream.openedOk())
    {
        midiFile.writeTo(stream);
        stream.flush();
        return tempFile;
    }

    return {};
}

bool MidiFileExporter::writeToFile(const juce::MidiMessageSequence& sequence,
                                   double bpm,
                                   int timeSigNum,
                                   int timeSigDenom,
                                   const juce::File& destinationFile)
{
    juce::MidiFile midiFile;
    midiFile.setTicksPerQuarterNote(960);

    juce::MidiMessageSequence trackSequence(sequence);
    trackSequence.addEvent(juce::MidiMessage::timeSignatureMetaEvent(timeSigNum, timeSigDenom), 0.0);

    double microSecondsPerQuarter = 60000000.0 / std::max(20.0, bpm);
    trackSequence.addEvent(juce::MidiMessage::tempoMetaEvent(static_cast<int>(microSecondsPerQuarter)), 0.0);
    trackSequence.sort();

    midiFile.addTrack(trackSequence);

    juce::FileOutputStream stream(destinationFile);
    if (!stream.openedOk())
        return false;

    return midiFile.writeTo(stream);
}

} // namespace MidiPreviewer
