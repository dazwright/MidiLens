import { MidiNote, ArpMode, ArpRate, ArpOctaves } from './types';

export function getArpRatePpq(rate: ArpRate): number {
  switch (rate) {
    case '1/4':
      return 1.0;
    case '1/8':
      return 0.5;
    case '1/16':
      return 0.25;
    case '1/32':
      return 0.125;
    case '1/8T':
      return 0.333333;
    case '1/16T':
      return 0.166667;
    default:
      return 0.25;
  }
}

export function arpeggiateNotes(
  notes: MidiNote[],
  totalLengthPpq: number,
  params: {
    mode: ArpMode;
    rate: ArpRate;
    octaves: ArpOctaves;
    gate: number;
  }
): MidiNote[] {
  if (!notes || notes.length === 0) return [];
  if (params.mode === 'chord' && params.octaves === 1) return [...notes];

  const stepPpq = getArpRatePpq(params.rate);
  const gateRatio = Math.min(1.0, Math.max(0.1, params.gate));
  const noteDuration = stepPpq * gateRatio;

  // Group notes into time windows / chord slices (0.25 PPQ window tolerance)
  const timeSlices: { startPpq: number; endPpq: number; notes: MidiNote[] }[] = [];
  const sortedNotes = [...notes].sort((a, b) => a.startPpq - b.startPpq);

  for (const note of sortedNotes) {
    let slice = timeSlices.find((s) => Math.abs(s.startPpq - note.startPpq) < 0.2);
    if (!slice) {
      // Find duration of slice based on longest note starting at this time
      const notesAtTime = sortedNotes.filter((n) => Math.abs(n.startPpq - note.startPpq) < 0.2);
      const maxDur = Math.max(...notesAtTime.map((n) => n.durationPpq));
      slice = {
        startPpq: note.startPpq,
        endPpq: Math.min(totalLengthPpq, note.startPpq + Math.max(stepPpq, maxDur)),
        notes: [],
      };
      timeSlices.push(slice);
    }
    if (!slice.notes.some((n) => n.id === note.id)) {
      slice.notes.push(note);
    }
  }

  const resultArpNotes: MidiNote[] = [];
  let nextId = 1;

  for (const slice of timeSlices) {
    // Collect base pitches & velocities
    const basePitches = Array.from(new Set(slice.notes.map((n) => n.pitch))).sort((a, b) => a - b);
    const avgVelocity = slice.notes.reduce((s, n) => s + n.velocity, 0) / slice.notes.length;

    // Expand pitches across octaves
    const expandedPitches: number[] = [];
    for (let oct = 0; oct < params.octaves; oct++) {
      for (const p of basePitches) {
        const shifted = p + oct * 12;
        if (shifted <= 127) {
          expandedPitches.push(shifted);
        }
      }
    }
    expandedPitches.sort((a, b) => a - b);

    if (expandedPitches.length === 0) continue;

    // Order pitches according to mode
    let orderedPitches: number[] = [];
    switch (params.mode) {
      case 'up':
        orderedPitches = [...expandedPitches];
        break;
      case 'down':
        orderedPitches = [...expandedPitches].reverse();
        break;
      case 'up-down':
        orderedPitches = [
          ...expandedPitches,
          ...[...expandedPitches].reverse().slice(1, -1),
        ];
        break;
      case 'down-up':
        orderedPitches = [
          ...[...expandedPitches].reverse(),
          ...expandedPitches.slice(1, -1),
        ];
        break;
      case 'random':
        // Pseudo-random shuffle based on index seed
        orderedPitches = [...expandedPitches].sort(
          (a, b) => Math.sin(a * 13 + slice.startPpq * 7) - Math.sin(b * 13 + slice.startPpq * 7)
        );
        break;
      case 'chord':
        // Strummed chord pattern
        orderedPitches = [...expandedPitches];
        break;
      default:
        orderedPitches = [...expandedPitches];
    }

    if (params.mode === 'chord') {
      // Strummed chord
      const strumOffset = stepPpq * 0.25;
      orderedPitches.forEach((pitch, idx) => {
        const start = slice.startPpq + idx * strumOffset;
        if (start < slice.endPpq) {
          resultArpNotes.push({
            id: nextId++,
            pitch,
            startPpq: start,
            durationPpq: Math.min(noteDuration, slice.endPpq - start),
            velocity: avgVelocity,
            channel: 1,
          });
        }
      });
    } else {
      // Step arpeggiation through ordered pitches
      const sliceDuration = slice.endPpq - slice.startPpq;
      const numSteps = Math.max(1, Math.floor(sliceDuration / stepPpq));

      for (let step = 0; step < numSteps; step++) {
        const stepStart = slice.startPpq + step * stepPpq;
        if (stepStart >= slice.endPpq) break;

        const pitchIdx = step % orderedPitches.length;
        const pitch = orderedPitches[pitchIdx];

        resultArpNotes.push({
          id: nextId++,
          pitch,
          startPpq: stepStart,
          durationPpq: Math.min(noteDuration, slice.endPpq - stepStart),
          velocity: avgVelocity,
          channel: 1,
        });
      }
    }
  }

  return resultArpNotes;
}
