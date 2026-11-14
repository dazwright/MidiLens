import { MidiNote, MidiSequence, QuantizeGrid, ScaleType, DetectedChord } from './types';
import { QUANTIZE_GRID_DIVISIONS, snapPitchToScale } from './scaleUtils';
import { getNoteName } from './keyDetection';

function getTargetNoteFilter(notes: MidiNote[], selectedIds: Set<number>): (n: MidiNote) => boolean {
  if (selectedIds.size > 0) {
    return (n) => selectedIds.has(n.id);
  }
  return () => true;
}

function roundPpq(v: number): number {
  return Math.max(0, Math.round(v * 10000) / 10000);
}

/**
 * Group target notes into simultaneous onset clusters (chords / flams within epsilon PPQ).
 */
function clusterNotesByOnset(targetNotes: MidiNote[], epsilonPpq = 0.06): MidiNote[][] {
  if (targetNotes.length === 0) return [];
  const sorted = [...targetNotes].sort((a, b) => a.startPpq - b.startPpq || a.pitch - b.pitch);
  const clusters: MidiNote[][] = [];
  let current: MidiNote[] = [sorted[0]];
  let anchorStart = sorted[0].startPpq;

  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (Math.abs(n.startPpq - anchorStart) <= epsilonPpq) {
      current.push(n);
    } else {
      clusters.push(current);
      current = [n];
      anchorStart = n.startPpq;
    }
  }
  clusters.push(current);
  return clusters;
}

// ============================================================================
// 1. RHYTHM, TIMING & GROOVE
// ============================================================================

/**
 * Quantise note start times (and optionally duration at 100%) toward the grid by strength (0-100%).
 */
export function quantizeNotesWithStrength(
  notes: MidiNote[],
  selectedIds: Set<number>,
  grid: QuantizeGrid,
  strengthPercent: number
): MidiNote[] {
  const isTarget = getTargetNoteFilter(notes, selectedIds);
  const division = QUANTIZE_GRID_DIVISIONS[grid].ppq;
  const strength = Math.min(1, Math.max(0, strengthPercent / 100));

  return notes.map((n) => {
    if (!isTarget(n)) return n;
    const snappedStart = Math.round(n.startPpq / division) * division;
    const newStart = roundPpq(n.startPpq + (snappedStart - n.startPpq) * strength);

    let newDur = n.durationPpq;
    if (strength >= 0.99) {
      const snappedDur = Math.max(division, Math.round(n.durationPpq / division) * division);
      newDur = Math.max(0.0625, roundPpq(snappedDur));
    }

    return {
      ...n,
      startPpq: newStart,
      durationPpq: newDur,
    };
  });
}

/**
 * Apply Swing / Shuffle (%) to off-beat 1/8th or 1/16th subdivisions.
 * 0% = straight, 50% = triplet shuffle, 100% = dotted groove.
 */
export function applySwingToNotes(
  notes: MidiNote[],
  selectedIds: Set<number>,
  swingGrid: '1/8' | '1/16',
  swingPercent: number
): MidiNote[] {
  const isTarget = getTargetNoteFilter(notes, selectedIds);
  const step = swingGrid === '1/8' ? 0.5 : 0.25;
  const pair = step * 2;
  const clampedSwing = Math.min(100, Math.max(0, swingPercent)) / 100;
  // At 50% swing, shift off-beat by step/3 (66.7% triplet feel); at 100%, shift by step*0.5 (75% dotted)
  const delayPpq = clampedSwing <= 0.5
    ? (clampedSwing / 0.5) * (step / 3)
    : (step / 3) + ((clampedSwing - 0.5) / 0.5) * (step / 2 - step / 3);

  return notes.map((n) => {
    if (!isTarget(n)) return n;
    const pairIdx = Math.floor(n.startPpq / pair);
    const offsetInPair = n.startPpq - pairIdx * pair;
    // Detect off-beat notes (either straight off-beat or previously swung within the second half of the pair)
    if (offsetInPair >= step * 0.5 && offsetInPair <= step * 1.65) {
      const baseOffbeat = pairIdx * pair + step;
      return {
        ...n,
        startPpq: roundPpq(baseOffbeat + delayPpq),
      };
    }
    return n;
  });
}

/**
 * Legato & Overlap Fix:
 * Extends or trims each note/chord cleanly so it touches the next note onset without gaps or overlaps.
 */
export function applyLegatoAndFixOverlaps(
  notes: MidiNote[],
  selectedIds: Set<number>,
  totalLengthPpq: number
): MidiNote[] {
  const targetNotes = selectedIds.size > 0 ? notes.filter((n) => selectedIds.has(n.id)) : [...notes];
  if (targetNotes.length === 0) return notes;

  const clusters = clusterNotesByOnset(targetNotes, 0.04);
  const nextStartById = new Map<number, number>();

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const nextClusterStart =
      i + 1 < clusters.length
        ? clusters[i + 1][0].startPpq
        : Math.max(totalLengthPpq, cluster[0].startPpq + 0.25);

    for (const n of cluster) {
      const targetEnd = Math.max(n.startPpq + 0.0625, nextClusterStart);
      nextStartById.set(n.id, roundPpq(targetEnd - n.startPpq));
    }
  }

  return notes.map((n) =>
    nextStartById.has(n.id) ? { ...n, durationPpq: nextStartById.get(n.id)! } : n
  );
}

/**
 * Staccato: Shortens note durations by percentage factor (e.g. 0.5 = 50% length).
 */
export function applyStaccatoToNotes(
  notes: MidiNote[],
  selectedIds: Set<number>,
  factor = 0.5
): MidiNote[] {
  const isTarget = getTargetNoteFilter(notes, selectedIds);
  const clampedFactor = Math.min(0.95, Math.max(0.1, factor));
  return notes.map((n) => {
    if (!isTarget(n)) return n;
    return {
      ...n,
      durationPpq: Math.max(0.0625, roundPpq(n.durationPpq * clampedFactor)),
    };
  });
}

/**
 * Strum / Flam: Offsets simultaneous chord notes slightly in milliseconds (up or down).
 */
export function applyStrumToNotes(
  notes: MidiNote[],
  selectedIds: Set<number>,
  direction: 'up' | 'down',
  strumMs: number,
  bpm: number
): MidiNote[] {
  const targetNotes = selectedIds.size > 0 ? notes.filter((n) => selectedIds.has(n.id)) : [...notes];
  if (targetNotes.length < 2) return notes;

  const clusters = clusterNotesByOnset(targetNotes, 0.08);
  const totalSpreadPpq = Math.max(0.002, (Math.max(1, strumMs) / 1000) * (Math.max(20, bpm) / 60));
  const updates = new Map<number, { startPpq: number; durationPpq: number }>();

  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const baseStart = Math.min(...cluster.map((n) => n.startPpq));
    const maxEnd = Math.max(...cluster.map((n) => n.startPpq + n.durationPpq));
    const ordered = [...cluster].sort((a, b) =>
      direction === 'up' ? a.pitch - b.pitch : b.pitch - a.pitch
    );

    ordered.forEach((n, idx) => {
      const frac = idx / (ordered.length - 1);
      const offsetPpq = frac * totalSpreadPpq;
      const newStart = roundPpq(baseStart + offsetPpq);
      // Keep chord release tidy at cluster end if note was sustained
      const origEnd = Math.max(newStart + 0.08, Math.min(maxEnd, n.startPpq + n.durationPpq));
      updates.set(n.id, {
        startPpq: newStart,
        durationPpq: Math.max(0.0625, roundPpq(origEnd - newStart)),
      });
    });
  }

  return notes.map((n) => {
    const upd = updates.get(n.id);
    return upd ? { ...n, startPpq: upd.startPpq, durationPpq: upd.durationPpq } : n;
  });
}

/**
 * Destructive Half/Double Speed Stretch/Compress:
 * factor = 0.5 -> 2x faster (compress notes & loop length to half)
 * factor = 2.0 -> 0.5x slower (stretch notes & loop length to double)
 */
export function scaleSequenceTimingDestructive(
  sequence: MidiSequence,
  factor: 0.5 | 2.0
): MidiSequence {
  const newLength = Math.max(2, roundPpq(sequence.totalLengthPpq * factor));
  const scaledNotes = sequence.notes.map((n) => ({
    ...n,
    startPpq: roundPpq(n.startPpq * factor),
    durationPpq: Math.max(0.0625, roundPpq(n.durationPpq * factor)),
  }));
  return {
    ...sequence,
    totalLengthPpq: newLength,
    notes: scaledNotes,
  };
}

// ============================================================================
// 2. PITCH, CHORDS & COMPOSITION
// ============================================================================

interface ChordTemplate {
  suffix: string;
  intervals: number[];
  priority: number;
}

const CHORD_TEMPLATES: ChordTemplate[] = [
  { suffix: '', intervals: [0, 4, 7], priority: 10 },
  { suffix: 'm', intervals: [0, 3, 7], priority: 10 },
  { suffix: 'm7', intervals: [0, 3, 7, 10], priority: 9 },
  { suffix: 'maj7', intervals: [0, 4, 7, 11], priority: 9 },
  { suffix: '7', intervals: [0, 4, 7, 10], priority: 9 },
  { suffix: 'm9', intervals: [0, 2, 3, 7, 10], priority: 8 },
  { suffix: 'maj9', intervals: [0, 2, 4, 7, 11], priority: 8 },
  { suffix: '9', intervals: [0, 2, 4, 7, 10], priority: 8 },
  { suffix: 'sus2', intervals: [0, 2, 7], priority: 7 },
  { suffix: 'sus4', intervals: [0, 5, 7], priority: 7 },
  { suffix: '7sus4', intervals: [0, 5, 7, 10], priority: 7 },
  { suffix: 'add9', intervals: [0, 2, 4, 7], priority: 7 },
  { suffix: 'm(add9)', intervals: [0, 2, 3, 7], priority: 7 },
  { suffix: '6', intervals: [0, 4, 7, 9], priority: 6 },
  { suffix: 'm6', intervals: [0, 3, 7, 9], priority: 6 },
  { suffix: 'dim', intervals: [0, 3, 6], priority: 6 },
  { suffix: 'dim7', intervals: [0, 3, 6, 9], priority: 6 },
  { suffix: 'm7b5', intervals: [0, 3, 6, 10], priority: 6 },
  { suffix: 'aug', intervals: [0, 4, 8], priority: 5 },
  { suffix: 'mMaj7', intervals: [0, 3, 7, 11], priority: 5 },
  { suffix: '5', intervals: [0, 7], priority: 4 },
];

export function identifyChordName(
  pitches: number[],
  useFlats: boolean
): { label: string; rootPitchClass: number } | null {
  if (pitches.length < 2) return null;
  const sortedPitches = [...pitches].sort((a, b) => a - b);
  const bassPc = ((sortedPitches[0] % 12) + 12) % 12;
  const uniquePcs = Array.from(new Set(sortedPitches.map((p) => ((p % 12) + 12) % 12)));
  if (uniquePcs.length < 2) return null;

  let bestScore = -999;
  let bestLabel = '';
  let bestRoot = bassPc;

  for (const rootPc of uniquePcs) {
    const relative = new Set(uniquePcs.map((pc) => (pc - rootPc + 12) % 12));

    for (const tpl of CHORD_TEMPLATES) {
      let matched = 0;
      for (const iv of tpl.intervals) {
        if (relative.has(iv)) matched++;
      }
      // Require full triad/power match, or >= 3 tones for 4-5 note extended chords
      const minRequired = tpl.intervals.length <= 3 ? tpl.intervals.length : 3;
      if (matched < minRequired) continue;

      const missing = tpl.intervals.length - matched;
      const extra = relative.size - matched;
      const bassBonus = rootPc === bassPc ? 1.8 : 0;
      const score = matched * 3.0 - missing * 2.2 - extra * 1.4 + bassBonus + tpl.priority * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestRoot = rootPc;
        const rootName = getNoteName(rootPc, useFlats);
        const bassSuffix =
          rootPc !== bassPc && uniquePcs.length >= 3 ? `/${getNoteName(bassPc, useFlats)}` : '';
        bestLabel = `${rootName}${tpl.suffix}${bassSuffix}`;
      }
    }
  }

  if (!bestLabel || bestScore < 4.0) return null;
  return { label: bestLabel, rootPitchClass: bestRoot };
}

/**
 * Scan sequence beat-by-beat (or half-bar) and return merged DetectedChord spans for the Piano Roll ruler.
 */
export function detectChordsInSequence(
  notes: MidiNote[],
  totalLengthPpq: number,
  timeSigNumerator: number,
  timeSigDenominator: number,
  previewTranspose = 0,
  scaleRoot = 0
): DetectedChord[] {
  if (notes.length < 2 || totalLengthPpq <= 0) return [];

  const useFlats = [1, 3, 5, 8, 10].includes(((scaleRoot % 12) + 12) % 12);
  const beatPpq = 4 / Math.max(1, timeSigDenominator);
  const stepPpq = Math.max(0.5, beatPpq);
  const results: DetectedChord[] = [];

  for (let pos = 0; pos < totalLengthPpq - 0.01; pos += stepPpq) {
    const sliceEnd = Math.min(totalLengthPpq, pos + stepPpq);
    const active = notes.filter((n) => {
      const end = n.startPpq + n.durationPpq;
      return n.startPpq < sliceEnd - 0.04 && end > pos + 0.04;
    });

    const pitches = active.map((n) => Math.min(127, Math.max(0, n.pitch + previewTranspose)));
    const detected = identifyChordName(pitches, useFlats);
    if (!detected) continue;

    const prev = results[results.length - 1];
    if (prev && prev.label === detected.label && Math.abs(prev.endPpq - pos) < 0.05) {
      prev.endPpq = sliceEnd;
    } else {
      results.push({
        startPpq: pos,
        endPpq: sliceEnd,
        label: detected.label,
        rootPitchClass: detected.rootPitchClass,
      });
    }
  }

  return results;
}

/**
 * Chord Inversion Up / Down:
 * Moves lowest note +12st (up) or highest note -12st (down) for each chord cluster.
 */
export function invertChords(
  notes: MidiNote[],
  selectedIds: Set<number>,
  direction: 'up' | 'down'
): MidiNote[] {
  const targetNotes = selectedIds.size > 0 ? notes.filter((n) => selectedIds.has(n.id)) : [...notes];
  const clusters = clusterNotesByOnset(targetNotes, 0.08);
  const pitchUpdates = new Map<number, number>();

  for (const cluster of clusters) {
    if (cluster.length < 2) continue;
    const sorted = [...cluster].sort((a, b) => a.pitch - b.pitch);
    if (direction === 'up') {
      const lowest = sorted[0];
      const targetPitch = lowest.pitch + 12;
      if (targetPitch <= 127) {
        pitchUpdates.set(lowest.id, targetPitch);
      }
    } else {
      const highest = sorted[sorted.length - 1];
      const targetPitch = highest.pitch - 12;
      if (targetPitch >= 0) {
        pitchUpdates.set(highest.id, targetPitch);
      }
    }
  }

  return notes.map((n) =>
    pitchUpdates.has(n.id) ? { ...n, pitch: pitchUpdates.get(n.id)! } : n
  );
}

/**
 * Drop-2 Voicing: Drops the 2nd highest note of 3+ note chords down by 1 octave (-12st).
 */
export function applyDrop2Voicing(notes: MidiNote[], selectedIds: Set<number>): MidiNote[] {
  const targetNotes = selectedIds.size > 0 ? notes.filter((n) => selectedIds.has(n.id)) : [...notes];
  const clusters = clusterNotesByOnset(targetNotes, 0.08);
  const pitchUpdates = new Map<number, number>();

  for (const cluster of clusters) {
    if (cluster.length < 3) continue;
    const sorted = [...cluster].sort((a, b) => a.pitch - b.pitch);
    const secondHighest = sorted[sorted.length - 2];
    const dropped = secondHighest.pitch - 12;
    if (dropped >= 0) {
      pitchUpdates.set(secondHighest.id, dropped);
    }
  }

  return notes.map((n) =>
    pitchUpdates.has(n.id) ? { ...n, pitch: pitchUpdates.get(n.id)! } : n
  );
}

/**
 * Open Voicing Spread: Alternates inner voices / spreads tight chords across wider octaves.
 */
export function applyOpenVoicing(notes: MidiNote[], selectedIds: Set<number>): MidiNote[] {
  const targetNotes = selectedIds.size > 0 ? notes.filter((n) => selectedIds.has(n.id)) : [...notes];
  const clusters = clusterNotesByOnset(targetNotes, 0.08);
  const pitchUpdates = new Map<number, number>();

  for (const cluster of clusters) {
    if (cluster.length < 3) continue;
    const sorted = [...cluster].sort((a, b) => a.pitch - b.pitch);
    const span = sorted[sorted.length - 1].pitch - sorted[0].pitch;
    if (span <= 14) {
      // Spread close chord into open voicing: bass down or middle voices up an octave
      for (let i = 1; i < sorted.length; i += 2) {
        const up = sorted[i].pitch + 12;
        if (up <= 127) pitchUpdates.set(sorted[i].id, up);
      }
    } else {
      // Compact back toward close voicing if already wide
      const bass = sorted[0].pitch;
      for (let i = 1; i < sorted.length; i++) {
        let p = sorted[i].pitch;
        while (p - bass > 14 && p - 12 > bass) {
          p -= 12;
        }
        pitchUpdates.set(sorted[i].id, p);
      }
    }
  }

  return notes.map((n) =>
    pitchUpdates.has(n.id) ? { ...n, pitch: pitchUpdates.get(n.id)! } : n
  );
}

/**
 * Reverse Pattern (Retrograde): Mirrors note positions horizontally across the active span.
 */
export function reversePatternNotes(
  notes: MidiNote[],
  selectedIds: Set<number>,
  totalLengthPpq: number
): MidiNote[] {
  const targetNotes = selectedIds.size > 0 ? notes.filter((n) => selectedIds.has(n.id)) : [...notes];
  if (targetNotes.length === 0) return notes;

  const spanStart = selectedIds.size > 0 ? Math.min(...targetNotes.map((n) => n.startPpq)) : 0;
  const spanEnd =
    selectedIds.size > 0
      ? Math.max(...targetNotes.map((n) => n.startPpq + n.durationPpq))
      : totalLengthPpq;

  const targetSet = new Set(targetNotes.map((n) => n.id));
  return notes.map((n) => {
    if (!targetSet.has(n.id)) return n;
    const newStart = roundPpq(Math.max(0, spanStart + (spanEnd - (n.startPpq + n.durationPpq))));
    return { ...n, startPpq: newStart };
  });
}

/**
 * Mirror Pattern (Pitch Inversion): Flips notes vertically around center pitch (snapped to scale if scaleLock).
 */
export function mirrorPitchNotes(
  notes: MidiNote[],
  selectedIds: Set<number>,
  scaleRoot: number,
  scaleType: ScaleType,
  scaleLock: boolean
): MidiNote[] {
  const targetNotes = selectedIds.size > 0 ? notes.filter((n) => selectedIds.has(n.id)) : [...notes];
  if (targetNotes.length === 0) return notes;

  const minP = Math.min(...targetNotes.map((n) => n.pitch));
  const maxP = Math.max(...targetNotes.map((n) => n.pitch));
  const centerPitch = (minP + maxP) / 2;
  const targetSet = new Set(targetNotes.map((n) => n.id));

  return notes.map((n) => {
    if (!targetSet.has(n.id)) return n;
    let mirrored = Math.min(127, Math.max(0, Math.round(centerPitch * 2 - n.pitch)));
    if (scaleLock && scaleType !== 'chromatic') {
      mirrored = snapPitchToScale(mirrored, scaleRoot, scaleType);
    }
    return { ...n, pitch: mirrored };
  });
}

/**
 * Shift / Rotate Pattern Left or Right by stepPpq (e.g. -0.25 or +0.25), wrapping inside totalLengthPpq.
 */
export function rotatePatternNotes(
  notes: MidiNote[],
  selectedIds: Set<number>,
  stepPpq: number,
  totalLengthPpq: number
): MidiNote[] {
  const isTarget = getTargetNoteFilter(notes, selectedIds);
  const len = Math.max(0.25, totalLengthPpq);

  return notes.map((n) => {
    if (!isTarget(n)) return n;
    const wrapped = (((n.startPpq + stepPpq) % len) + len) % len;
    return { ...n, startPpq: roundPpq(wrapped) };
  });
}

/**
 * Bass-Root or Topline Extraction:
 * Keeps only the lowest ('bass') or highest ('topline') note at each simultaneous onset cluster.
 */
export function extractLayerNotes(
  notes: MidiNote[],
  selectedIds: Set<number>,
  mode: 'bass' | 'topline'
): MidiNote[] {
  const targetNotes = selectedIds.size > 0 ? notes.filter((n) => selectedIds.has(n.id)) : [...notes];
  if (targetNotes.length === 0) return notes;

  const clusters = clusterNotesByOnset(targetNotes, 0.08);
  const keptIds = new Set<number>();

  for (const cluster of clusters) {
    const sorted = [...cluster].sort((a, b) => a.pitch - b.pitch);
    const chosen = mode === 'bass' ? sorted[0] : sorted[sorted.length - 1];
    keptIds.add(chosen.id);
  }

  const targetSet = new Set(targetNotes.map((n) => n.id));
  return notes.filter((n) => !targetSet.has(n.id) || keptIds.has(n.id));
}

// ============================================================================
// 3. FILENAME KEY & BPM HINT PARSER FOR LIBRARY FILTERING
// ============================================================================

const NOTE_TOKEN_MAP: Record<string, number> = {
  c: 0,
  'c#': 1,
  db: 1,
  d: 2,
  'd#': 3,
  eb: 3,
  e: 4,
  f: 5,
  'f#': 6,
  gb: 6,
  g: 7,
  'g#': 8,
  ab: 8,
  a: 9,
  'a#': 10,
  bb: 10,
  b: 11,
};

export function inferHintsFromFilename(
  name: string,
  relativePath = ''
): { bpm?: number; rootPitch?: number; isMinor?: boolean; keyLabel?: string } {
  const combined = `${relativePath} ${name}`;
  const out: { bpm?: number; rootPitch?: number; isMinor?: boolean; keyLabel?: string } = {};

  // Match e.g. "128bpm", "128_bpm", "BPM128", "124 BPM"
  const bpmMatch =
    combined.match(/(?:^|[^0-9])([4-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*[_-]?\s*bpm\b/i) ||
    combined.match(/\bbpm\s*[_-]?\s*([4-9][0-9]|1[0-9]{2}|2[0-4][0-9])\b/i);
  if (bpmMatch) {
    const val = parseInt(bpmMatch[1], 10);
    if (val >= 40 && val <= 250) out.bpm = val;
  }

  // Match standalone musical key tokens like "Cm", "F#min", "Bb_Maj", "Amaj", "D_Minor"
  const keyRegex = /(?:^|[\s_\-[(/])([A-G][#b]?)\s*(minor|min|m|major|maj)(?=$|[\s_\-\])/.,])/gi;
  let match: RegExpExecArray | null;
  while ((match = keyRegex.exec(combined)) !== null) {
    const rootToken = match[1].toLowerCase();
    const qualToken = match[2].toLowerCase();
    if (rootToken in NOTE_TOKEN_MAP) {
      const rootPitch = NOTE_TOKEN_MAP[rootToken];
      const isMinor = qualToken === 'm' || qualToken.startsWith('min');
      out.rootPitch = rootPitch;
      out.isMinor = isMinor;
      out.keyLabel = `${getNoteName(rootPitch, [1, 3, 5, 8, 10].includes(rootPitch))} ${
        isMinor ? 'Minor' : 'Major'
      }`;
      break;
    }
  }

  return out;
}
