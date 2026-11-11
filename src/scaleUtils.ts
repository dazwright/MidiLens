import { ScaleType, QuantizeGrid, MidiNote } from './types';

export const SCALE_DEFINITIONS: Record<ScaleType, { name: string; intervals: number[] }> = {
  chromatic: {
    name: 'Chromatic',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  major: {
    name: 'Major (Ionian)',
    intervals: [0, 2, 4, 5, 7, 9, 11],
  },
  minor: {
    name: 'Natural Minor (Aeolian)',
    intervals: [0, 2, 3, 5, 7, 8, 10],
  },
  harmonic_minor: {
    name: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
  },
  melodic_minor: {
    name: 'Melodic Minor',
    intervals: [0, 2, 3, 5, 7, 9, 11],
  },
  dorian: {
    name: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
  },
  phrygian: {
    name: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
  },
  lydian: {
    name: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
  },
  mixolydian: {
    name: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
  },
  pentatonic_major: {
    name: 'Pentatonic Major',
    intervals: [0, 2, 4, 7, 9],
  },
  pentatonic_minor: {
    name: 'Pentatonic Minor',
    intervals: [0, 3, 5, 7, 10],
  },
  blues: {
    name: 'Blues',
    intervals: [0, 3, 5, 6, 7, 10],
  },
};

export const QUANTIZE_GRID_DIVISIONS: Record<QuantizeGrid, { name: string; ppq: number }> = {
  '1/4': { name: '1/4 Note', ppq: 1.0 },
  '1/8': { name: '1/8 Note', ppq: 0.5 },
  '1/16': { name: '1/16 Note', ppq: 0.25 },
  '1/32': { name: '1/32 Note', ppq: 0.125 },
  '1/8T': { name: '1/8 Triplet', ppq: 1.0 / 3.0 },
  '1/16T': { name: '1/16 Triplet', ppq: 1.0 / 6.0 },
};

export function getScalePitchClasses(root: number, scaleType: ScaleType): Set<number> {
  const intervals = SCALE_DEFINITIONS[scaleType]?.intervals || SCALE_DEFINITIONS.chromatic.intervals;
  const set = new Set<number>();
  for (const interval of intervals) {
    set.add((root + interval) % 12);
  }
  return set;
}

export function isPitchInScale(pitch: number, root: number, scaleType: ScaleType): boolean {
  if (scaleType === 'chromatic') return true;
  const pitchClass = ((pitch % 12) + 12) % 12;
  const scaleClasses = getScalePitchClasses(root, scaleType);
  return scaleClasses.has(pitchClass);
}

export function snapPitchToScale(pitch: number, root: number, scaleType: ScaleType): number {
  if (scaleType === 'chromatic') return pitch;
  const scaleClasses = getScalePitchClasses(root, scaleType);
  const pc = ((pitch % 12) + 12) % 12;

  if (scaleClasses.has(pc)) return pitch;

  // Search closest pitch classes up and down
  for (let offset = 1; offset <= 6; offset++) {
    const upPitch = pitch + offset;
    const downPitch = pitch - offset;

    const upClass = ((upPitch % 12) + 12) % 12;
    const downClass = ((downPitch % 12) + 12) % 12;

    if (scaleClasses.has(downClass) && downPitch >= 0) {
      return downPitch;
    }
    if (scaleClasses.has(upClass) && upPitch <= 127) {
      return upPitch;
    }
  }

  return pitch;
}

export type HarmonizeInterval =
  | '+3rd'
  | '-3rd'
  | '+5th'
  | '-5th'
  | '+8ve'
  | '-8ve'
  | '+12'
  | '-12';

/**
 * Harmonises notes by duplicating them shifted by musical thirds, fifths, or octaves,
 * intelligently conforming to the current scale if not chromatic.
 */
export function harmonizeNotes(
  notes: MidiNote[],
  selectedIds: Set<number>,
  interval: HarmonizeInterval,
  scaleRoot: number,
  scaleType: ScaleType
): MidiNote[] {
  const targetAll = selectedIds.size === 0;
  const maxId = Math.max(0, ...notes.map((n) => n.id));
  const isScaleActive = scaleType !== 'chromatic';
  const intervals = isScaleActive ? (SCALE_DEFINITIONS[scaleType]?.intervals || [0]) : [];

  // Determine diatonic step shift or chromatic semitone shift
  let degreeShift = 0;
  let semitoneFallback = 0;

  switch (interval) {
    case '+3rd':
      degreeShift = 2; // e.g. root (0) -> 3rd (2) in 0-indexed scale degrees
      semitoneFallback = 4;
      break;
    case '-3rd':
      degreeShift = -2;
      semitoneFallback = -3;
      break;
    case '+5th':
      degreeShift = 4; // root (0) -> 5th (4)
      semitoneFallback = 7;
      break;
    case '-5th':
      degreeShift = -4; // or -3 steps
      semitoneFallback = -7;
      break;
    case '+8ve':
    case '+12':
      degreeShift = 7; // octave (+12 semitones)
      semitoneFallback = 12;
      break;
    case '-8ve':
    case '-12':
      degreeShift = -7;
      semitoneFallback = -12;
      break;
  }

  return notes.map((note) => {
    if (targetAll || selectedIds.has(note.id)) {
      let targetPitch = note.pitch + semitoneFallback;

      if (isScaleActive && intervals.length > 0) {
        // Find closest scale degree
        const basePitch = snapPitchToScale(note.pitch, scaleRoot, scaleType);
        const octave = Math.floor(basePitch / 12);
        const pitchClass = ((basePitch % 12) + 12) % 12;

        // Find which degree in intervals
        let degreeIdx = 0;
        let bestDiff = 99;
        for (let d = 0; d < intervals.length; d++) {
          const degClass = (scaleRoot + intervals[d]) % 12;
          const diff = Math.abs(pitchClass - degClass);
          if (diff < bestDiff) {
            bestDiff = diff;
            degreeIdx = d;
          }
        }

        const targetDegreeIdx = degreeIdx + degreeShift;
        const octShift = Math.floor(targetDegreeIdx / intervals.length);
        const wrappedDegree = ((targetDegreeIdx % intervals.length) + intervals.length) % intervals.length;
        const harmonizedPitchClass = (scaleRoot + intervals[wrappedDegree]) % 12;
        targetPitch = (octave + octShift) * 12 + harmonizedPitchClass;

        // Ensure proper shift direction
        if (interval === '+8ve' || interval === '+12') {
          if (targetPitch <= note.pitch) targetPitch += 12;
        } else if (interval === '-8ve' || interval === '-12') {
          if (targetPitch >= note.pitch) targetPitch -= 12;
        } else if (interval.startsWith('+') && targetPitch <= note.pitch) {
          targetPitch += 12;
        } else if (interval.startsWith('-') && targetPitch >= note.pitch) {
          targetPitch -= 12;
        }
      }

      // Clamp to valid MIDI range 0-127
      const clampedPitch = Math.min(127, Math.max(0, targetPitch));
      return {
        ...note,
        pitch: clampedPitch,
      };
    }
    return note;
  });
}

export function quantizePpq(ppq: number, grid: QuantizeGrid): number {
  const division = QUANTIZE_GRID_DIVISIONS[grid].ppq;
  return Math.max(0, Math.round(ppq / division) * division);
}

/**
 * Returns color string representing note velocity:
 * Light green for lowest velocity (0.01 - 0.25)
 * Transitioning through yellow / amber (0.5)
 * To vivid red for highest velocity (0.9 - 1.0)
 */
export function getVelocityColor(velocity: number): { base: string; border: string; highlight: string } {
  const v = Math.max(0.0, Math.min(1.0, velocity));

  let r = 0;
  let g = 0;
  let b = 0;

  if (v < 0.5) {
    // 0.0 -> light green (r: 134, g: 239, b: 172) to yellow (r: 250, g: 204, b: 21)
    const t = v / 0.5;
    r = Math.round(134 + t * (250 - 134));
    g = Math.round(239 + t * (204 - 239));
    b = Math.round(172 + t * (21 - 172));
  } else {
    // 0.5 -> yellow (r: 250, g: 204, b: 21) to red (r: 239, g: 68, b: 68)
    const t = (v - 0.5) / 0.5;
    r = Math.round(250 + t * (239 - 250));
    g = Math.round(204 + t * (68 - 204));
    b = Math.round(21 + t * (68 - 21));
  }

  const base = `rgb(${r}, ${g}, ${b})`;
  const border = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
  const highlight = `rgba(255, 255, 255, 0.55)`;

  return { base, border, highlight };
}

/**
 * Humanizes velocities by adding random delta within [-range, +range]
 */
export function humanizeNotesVelocity(
  notes: MidiNote[],
  selectedIds: Set<number>,
  range: number // 1 to 50
): MidiNote[] {
  const targetAll = selectedIds.size === 0;
  return notes.map((note) => {
    if (targetAll || selectedIds.has(note.id)) {
      const delta = (Math.random() * 2 - 1) * (range / 127.0);
      const newVel = Math.min(1.0, Math.max(0.08, note.velocity + delta));
      return { ...note, velocity: Number(newVel.toFixed(3)) };
    }
    return note;
  });
}

/**
 * Randomizes velocities for notes strictly within a custom min/max window
 */
export function randomizeNotesVelocityRange(
  notes: MidiNote[],
  selectedIds: Set<number>,
  minVelocity: number, // 0.05 - 1.0
  maxVelocity: number  // 0.05 - 1.0
): MidiNote[] {
  const targetAll = selectedIds.size === 0;
  const minV = Math.min(minVelocity, maxVelocity);
  const maxV = Math.max(minVelocity, maxVelocity);

  return notes.map((note) => {
    if (targetAll || selectedIds.has(note.id)) {
      const randomVel = minV + Math.random() * (maxV - minV);
      return { ...note, velocity: Number(randomVel.toFixed(3)) };
    }
    return note;
  });
}

/**
 * Humanizes timing with subtle micro-timing offsets
 */
export function humanizeNotesTiming(
  notes: MidiNote[],
  selectedIds: Set<number>,
  maxDeltaTicksPpq = 0.03 // ~10-15ms at 120bpm
): MidiNote[] {
  const targetAll = selectedIds.size === 0;
  return notes.map((note) => {
    if (targetAll || selectedIds.has(note.id)) {
      const delta = (Math.random() * 2 - 1) * maxDeltaTicksPpq;
      const newStart = Math.max(0, note.startPpq + delta);
      return { ...note, startPpq: Number(newStart.toFixed(4)) };
    }
    return note;
  });
}
