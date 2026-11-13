import { MidiNote, MidiSequence, ScaleType } from './types';
import { getNoteName } from './keyDetection';
import { SCALE_DEFINITIONS, isPitchInScale, snapPitchToScale } from './scaleUtils';

export type GeneratorPatternType = 'melody' | 'riff' | 'bass' | 'chords';

export interface GeneratePatternOptions {
  type: GeneratorPatternType;
  scaleRoot: number; // 0-11
  scaleType: ScaleType;
  bars?: number; // default 4
  bpm?: number;
  timeSigNumerator?: number;
  timeSigDenominator?: number;
  keySource?: 'app' | 'daw';
}

const MAJOR_FAMILY_SCALES = new Set<ScaleType>([
  'major',
  'lydian',
  'mixolydian',
  'pentatonic_major',
  'chromatic',
]);

// Progressions expressed as 0-indexed scale degrees
const MAJOR_PROGRESSIONS_7: number[][] = [
  [0, 4, 5, 3], // I - V - vi - IV
  [0, 3, 5, 4], // I - IV - vi - V
  [1, 4, 0, 5], // ii - V - I - vi
  [0, 2, 3, 4], // I - iii - IV - V
  [5, 3, 0, 4], // vi - IV - I - V
  [0, 3, 1, 4], // I - IV - ii - V
];

const MINOR_PROGRESSIONS_7: number[][] = [
  [0, 5, 2, 6], // i - VI - III - VII
  [0, 3, 6, 2], // i - iv - VII - III
  [0, 5, 3, 4], // i - VI - iv - v/V
  [0, 6, 5, 6], // i - VII - VI - VII
  [0, 3, 0, 4], // i - iv - i - v/V
  [0, 2, 5, 4], // i - III - VI - v/V
];

const PENTATONIC_PROGRESSIONS_5: number[][] = [
  [0, 3, 4, 0],
  [0, 2, 3, 4],
  [0, 4, 2, 3],
  [0, 3, 2, 4],
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns the harmonic interval set used for building melodies/chords/bass.
 * For non-chromatic scales, strictly uses that scale's intervals so 100% of pitches
 * remain in-key. For 'chromatic', anchors harmonies on Major around scaleRoot.
 */
function getHarmonicScaleIntervals(scaleType: ScaleType): number[] {
  if (scaleType === 'chromatic') {
    return SCALE_DEFINITIONS.major.intervals;
  }
  return SCALE_DEFINITIONS[scaleType]?.intervals || SCALE_DEFINITIONS.major.intervals;
}

/**
 * Builds an ascending array of valid MIDI pitches in [minMidi, maxMidi] strictly belonging
 * to (scaleRoot, scaleType).
 */
function buildScalePitchLadder(
  scaleRoot: number,
  scaleType: ScaleType,
  minMidi: number,
  maxMidi: number
): number[] {
  const intervals = getHarmonicScaleIntervals(scaleType);
  const allowedClasses = new Set(intervals.map((iv) => ((scaleRoot + iv) % 12 + 12) % 12));
  const ladder: number[] = [];
  for (let p = Math.max(0, minMidi); p <= Math.min(127, maxMidi); p++) {
    if (allowedClasses.has(p % 12)) {
      ladder.push(p);
    }
  }
  return ladder;
}

function getEffectivePitchClassForDegree(
  scaleRoot: number,
  intervals: number[],
  degreeIndex: number
): number {
  const len = intervals.length;
  const wrapped = ((degreeIndex % len) + len) % len;
  return ((scaleRoot + intervals[wrapped]) % 12 + 12) % 12;
}

/**
 * Generates a diatonic chord's pitch classes (triad or 7th) from scale degrees.
 */
function getDiatonicChordPitchClasses(
  scaleRoot: number,
  intervals: number[],
  rootDegree: number,
  includeSeventh: boolean
): number[] {
  const len = intervals.length;
  if (len >= 7) {
    const degrees = includeSeventh
      ? [rootDegree, rootDegree + 2, rootDegree + 4, rootDegree + 6]
      : [rootDegree, rootDegree + 2, rootDegree + 4];
    return degrees.map((d) => getEffectivePitchClassForDegree(scaleRoot, intervals, d));
  }

  // Pentatonic (5) or Blues (6): select 3 distinct pitch classes strictly from the scale
  const stepA = len === 5 ? 2 : 2;
  const stepB = len === 5 ? 3 : 4;
  const degrees = includeSeventh
    ? [rootDegree, rootDegree + 1, rootDegree + stepA, rootDegree + stepB]
    : [rootDegree, rootDegree + stepA, rootDegree + stepB];
  const unique = Array.from(
    new Set(degrees.map((d) => getEffectivePitchClassForDegree(scaleRoot, intervals, d)))
  );
  return unique;
}

function selectProgressionDegrees(scaleType: ScaleType, bars: number): number[] {
  const intervals = getHarmonicScaleIntervals(scaleType);
  let baseProg: number[];
  if (intervals.length < 7) {
    baseProg = pickRandom(PENTATONIC_PROGRESSIONS_5);
  } else if (MAJOR_FAMILY_SCALES.has(scaleType)) {
    baseProg = pickRandom(MAJOR_PROGRESSIONS_7);
  } else {
    baseProg = pickRandom(MINOR_PROGRESSIONS_7);
  }

  const out: number[] = [];
  for (let b = 0; b < bars; b++) {
    out.push(baseProg[b % baseProg.length]);
  }
  return out;
}

function closestMidiForPitchClass(pitchClass: number, targetCenter: number, minMidi: number, maxMidi: number): number {
  let best = minMidi;
  let bestDist = 999;
  for (let p = minMidi; p <= maxMidi; p++) {
    if (((p % 12) + 12) % 12 === pitchClass) {
      const dist = Math.abs(p - targetCenter);
      if (dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    }
  }
  return best;
}

/**
 * Finds the voicing (set of MIDI pitches) for a chord's pitch classes that minimizes
 * total semitone voice-leading motion relative to the previous chord's upper voices.
 */
function voiceChordWithSmoothLeading(
  chordPitchClasses: number[],
  previousVoices: number[] | null,
  minMidi = 48,
  maxMidi = 72
): number[] {
  if (!previousVoices || previousVoices.length === 0) {
    // Initial balanced close voicing centered around C4 (60)
    const rootPc = chordPitchClasses[0];
    const rootMidi = closestMidiForPitchClass(rootPc, 54, minMidi, maxMidi - 8);
    const voiced: number[] = [rootMidi];
    for (let i = 1; i < chordPitchClasses.length; i++) {
      const pc = chordPitchClasses[i];
      let p = rootMidi;
      while (((p % 12) + 12) % 12 !== pc || p <= voiced[voiced.length - 1]) {
        p++;
        if (p > maxMidi) {
          p = closestMidiForPitchClass(pc, rootMidi + 4, minMidi, maxMidi);
          break;
        }
      }
      voiced.push(p);
    }
    return Array.from(new Set(voiced)).sort((a, b) => a - b);
  }

  const prevCenter = previousVoices.reduce((s, v) => s + v, 0) / previousVoices.length;
  const voiced = chordPitchClasses.map((pc, idx) => {
    const anchor = previousVoices[Math.min(idx, previousVoices.length - 1)] ?? prevCenter;
    return closestMidiForPitchClass(pc, anchor, minMidi, maxMidi);
  });

  // Deduplicate and spread if two voices landed on same pitch
  const unique = Array.from(new Set(voiced)).sort((a, b) => a - b);
  while (unique.length < chordPitchClasses.length) {
    const missingPc = chordPitchClasses.find(
      (pc) => !unique.some((p) => ((p % 12) + 12) % 12 === pc)
    );
    if (missingPc === undefined) break;
    unique.push(closestMidiForPitchClass(missingPc, prevCenter, minMidi, maxMidi));
  }
  return unique.sort((a, b) => a - b);
}

/**
 * Guarantees every note adheres strictly to (scaleRoot, scaleType).
 */
function enforceKeyCompliance(
  notes: MidiNote[],
  scaleRoot: number,
  scaleType: ScaleType
): MidiNote[] {
  const targetType: ScaleType = scaleType === 'chromatic' ? 'major' : scaleType;
  return notes.map((n, idx) => {
    const clamped = Math.min(115, Math.max(24, Math.round(n.pitch)));
    const safePitch = isPitchInScale(clamped, scaleRoot, targetType)
      ? clamped
      : snapPitchToScale(clamped, scaleRoot, targetType);
    return {
      ...n,
      id: idx + 1,
      pitch: safePitch,
      startPpq: Number(Math.max(0, n.startPpq).toFixed(4)),
      durationPpq: Number(Math.max(0.0625, n.durationPpq).toFixed(4)),
      velocity: Number(Math.min(1.0, Math.max(0.1, n.velocity)).toFixed(3)),
    };
  });
}

function generateChordsNotes(
  scaleRoot: number,
  scaleType: ScaleType,
  bars: number,
  barPpq: number
): MidiNote[] {
  const intervals = getHarmonicScaleIntervals(scaleType);
  const progression = selectProgressionDegrees(scaleType, bars);
  const useSevenths = intervals.length >= 7 && Math.random() > 0.35;

  // Rhythm styles: 0 = sustained pads, 1 = half-bar pulse, 2 = neo-soul/pop syncopated comping, 3 = rhythmic stabs
  const rhythmStyle = randInt(0, 3);
  const notes: MidiNote[] = [];
  let prevVoices: number[] | null = null;
  let nextId = 1;

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barPpq;
    const degree = progression[bar];
    const chordPcs = getDiatonicChordPitchClasses(scaleRoot, intervals, degree, useSevenths);
    const upperVoices = voiceChordWithSmoothLeading(chordPcs, prevVoices, 50, 74);
    prevVoices = upperVoices;

    // Clean bass root an octave below in MIDI 36-50
    const bassPitch = closestMidiForPitchClass(chordPcs[0], 42, 36, 50);

    // Optional cadence split on final bar (IV -> V or ii -> V feel)
    const hitSlots: { offset: number; dur: number; velBoost: number }[] = [];
    if (rhythmStyle === 0) {
      hitSlots.push({ offset: 0, dur: Math.max(0.5, barPpq - 0.08), velBoost: 0 });
    } else if (rhythmStyle === 1) {
      const half = barPpq / 2;
      hitSlots.push({ offset: 0, dur: half - 0.08, velBoost: 0.04 });
      hitSlots.push({ offset: half, dur: half - 0.08, velBoost: -0.06 });
    } else if (rhythmStyle === 2 && barPpq >= 3) {
      // Syncopated dotted-quarter + anticipation comping
      const hit1Dur = Math.min(1.4, barPpq * 0.36);
      const hit2Start = Math.min(barPpq - 1.0, 1.5);
      const hit2Dur = Math.min(1.4, barPpq - hit2Start - 0.1);
      hitSlots.push({ offset: 0, dur: hit1Dur, velBoost: 0.06 });
      hitSlots.push({ offset: hit2Start, dur: Math.max(0.4, hit2Dur), velBoost: -0.04 });
      if (barPpq >= 4 && Math.random() > 0.35) {
        hitSlots.push({ offset: 3.25, dur: 0.65, velBoost: -0.08 });
      }
    } else {
      // Rhythmic quarter / offbeat stabs
      const beatCount = Math.max(2, Math.floor(barPpq));
      for (let b = 0; b < beatCount; b++) {
        if (b === 0 || b === 2 || Math.random() > 0.4) {
          hitSlots.push({
            offset: b,
            dur: b === beatCount - 1 ? 0.6 : 0.45,
            velBoost: b === 0 ? 0.08 : -0.05,
          });
        }
      }
    }

    for (const slot of hitSlots) {
      const slotStart = barStart + slot.offset;
      if (slotStart >= (bar + 1) * barPpq - 0.05) continue;
      const safeDur = Math.min(slot.dur, (bar + 1) * barPpq - slotStart - 0.03);
      if (safeDur < 0.12) continue;

      // Bass root voice
      notes.push({
        id: nextId++,
        pitch: bassPitch,
        startPpq: slotStart,
        durationPpq: safeDur,
        velocity: Math.min(0.95, 0.78 + slot.velBoost),
        channel: 1,
      });

      // Upper voices with gentle velocity roll-off for inner clarity and subtle micro-strum
      upperVoices.forEach((pitch, vIdx) => {
        const isTopVoice = vIdx === upperVoices.length - 1;
        const strum = rhythmStyle === 0 ? vIdx * 0.014 : vIdx * 0.006;
        const baseVel = isTopVoice ? 0.78 : 0.64;
        notes.push({
          id: nextId++,
          pitch,
          startPpq: slotStart + strum,
          durationPpq: Math.max(0.1, safeDur - strum),
          velocity: Math.min(0.96, Math.max(0.35, baseVel + slot.velBoost + (Math.random() * 0.06 - 0.03))),
          channel: 1,
        });
      });
    }
  }

  return notes;
}

function generateBassLineNotes(
  scaleRoot: number,
  scaleType: ScaleType,
  bars: number,
  barPpq: number
): MidiNote[] {
  const intervals = getHarmonicScaleIntervals(scaleType);
  const progression = selectProgressionDegrees(scaleType, bars);
  const ladder = buildScalePitchLadder(scaleRoot, scaleType, 33, 56);
  const notes: MidiNote[] = [];
  let nextId = 1;

  // Bass groove archetypes:
  // 0 = Driving 8ths (rock/synthwave), 1 = Syncopated 16th funk/house pocket,
  // 2 = Octave bounce, 3 = Deep half/quarter anchor with approach fill
  const grooveStyle = randInt(0, 3);

  const findScaleIndex = (targetPitch: number): number => {
    let bestIdx = 0;
    let bestDiff = 999;
    ladder.forEach((p, i) => {
      const d = Math.abs(p - targetPitch);
      if (d < bestDiff) {
        bestDiff = d;
        bestIdx = i;
      }
    });
    return bestIdx;
  };

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barPpq;
    const degree = progression[bar];
    const nextDegree = progression[(bar + 1) % bars];
    const chordPcs = getDiatonicChordPitchClasses(scaleRoot, intervals, degree, false);
    const nextRootPc = getEffectivePitchClassForDegree(scaleRoot, intervals, nextDegree);

    const rootMidi = closestMidiForPitchClass(chordPcs[0], 40, 34, 47);
    const fifthMidi = closestMidiForPitchClass(
      chordPcs[Math.min(2, chordPcs.length - 1)],
      rootMidi + 7,
      36,
      54
    );
    const octaveMidi = rootMidi + 12 <= 56 ? rootMidi + 12 : rootMidi;
    const nextRootMidi = closestMidiForPitchClass(nextRootPc, 40, 34, 47);

    // Compute diatonic approach note leading smoothly into next bar's root
    const nextRootIdx = findScaleIndex(nextRootMidi);
    const approachUp = Math.random() > 0.5;
    const approachIdx = approachUp
      ? Math.max(0, nextRootIdx - 1)
      : Math.min(ladder.length - 1, nextRootIdx + 1);
    const approachMidi = ladder[approachIdx] ?? rootMidi;

    if (grooveStyle === 0) {
      // Driving 8th notes with octave/fifth turnarounds on last beat
      const step = 0.5;
      const steps = Math.max(2, Math.round(barPpq / step));
      for (let s = 0; s < steps; s++) {
        let pitch = rootMidi;
        if (s === steps - 1) pitch = approachMidi;
        else if (s === steps - 2 && Math.random() > 0.4) pitch = fifthMidi;
        else if (s % 2 === 1 && Math.random() > 0.72) pitch = octaveMidi;

        notes.push({
          id: nextId++,
          pitch,
          startPpq: barStart + s * step,
          durationPpq: step * 0.85,
          velocity: s === 0 ? 0.92 : s % 2 === 0 ? 0.8 : 0.68,
          channel: 1,
        });
      }
    } else if (grooveStyle === 1) {
      // Syncopated 16th-note pocket (1, e-of-1/a-of-1, 2-and, 3-and, 4-a)
      const template: { offset: number; dur: number; role: 'root' | 'fifth' | 'oct' | 'approach'; vel: number }[] = [
        { offset: 0, dur: 0.42, role: 'root', vel: 0.94 },
        { offset: 0.75, dur: 0.22, role: 'root', vel: 0.72 },
        { offset: 1.5, dur: 0.42, role: 'fifth', vel: 0.82 },
        { offset: 2.25, dur: 0.45, role: 'oct', vel: 0.86 },
        { offset: 3.0, dur: 0.42, role: 'root', vel: 0.84 },
        { offset: 3.5, dur: 0.42, role: 'approach', vel: 0.76 },
      ];
      for (const hit of template) {
        if (hit.offset >= barPpq - 0.1) continue;
        const pitch =
          hit.role === 'root'
            ? rootMidi
            : hit.role === 'fifth'
            ? fifthMidi
            : hit.role === 'oct'
            ? octaveMidi
            : approachMidi;
        notes.push({
          id: nextId++,
          pitch,
          startPpq: barStart + hit.offset,
          durationPpq: Math.min(hit.dur, barPpq - hit.offset - 0.03),
          velocity: hit.vel,
          channel: 1,
        });
      }
    } else if (grooveStyle === 2) {
      // Octave disco/synthwave bounce on 8th grid
      const step = 0.5;
      const steps = Math.max(2, Math.round(barPpq / step));
      for (let s = 0; s < steps; s++) {
        const pitch =
          s === steps - 1
            ? approachMidi
            : s % 2 === 0
            ? rootMidi
            : s === steps - 3
            ? fifthMidi
            : octaveMidi;
        notes.push({
          id: nextId++,
          pitch,
          startPpq: barStart + s * step,
          durationPpq: step * 0.82,
          velocity: s % 2 === 0 ? 0.9 : 0.76,
          channel: 1,
        });
      }
    } else {
      // Deep melodic anchor: strong root on beat 1, fifth/third pickup, leading fill
      notes.push({
        id: nextId++,
        pitch: rootMidi,
        startPpq: barStart,
        durationPpq: Math.min(1.4, barPpq * 0.35),
        velocity: 0.94,
        channel: 1,
      });
      if (barPpq >= 2) {
        notes.push({
          id: nextId++,
          pitch: fifthMidi,
          startPpq: barStart + 1.5,
          durationPpq: 0.45,
          velocity: 0.78,
          channel: 1,
        });
      }
      if (barPpq >= 3) {
        notes.push({
          id: nextId++,
          pitch: rootMidi,
          startPpq: barStart + 2.0,
          durationPpq: 0.9,
          velocity: 0.86,
          channel: 1,
        });
      }
      if (barPpq >= 3.75) {
        notes.push({
          id: nextId++,
          pitch: approachMidi,
          startPpq: barStart + barPpq - 0.5,
          durationPpq: 0.45,
          velocity: 0.75,
          channel: 1,
        });
      }
    }
  }

  return notes;
}

function generateMelodyNotes(
  scaleRoot: number,
  scaleType: ScaleType,
  bars: number,
  barPpq: number
): MidiNote[] {
  const intervals = getHarmonicScaleIntervals(scaleType);
  const progression = selectProgressionDegrees(scaleType, bars);
  const ladder = buildScalePitchLadder(scaleRoot, scaleType, 60, 81);
  if (ladder.length === 0) return [];

  const tonicStartPitch = closestMidiForPitchClass(
    getEffectivePitchClassForDegree(scaleRoot, intervals, 0),
    66,
    60,
    76
  );
  const findNearestLadderIdx = (pitch: number): number => {
    let best = 0;
    let dist = 999;
    ladder.forEach((p, idx) => {
      const d = Math.abs(p - pitch);
      if (d < dist) {
        dist = d;
        best = idx;
      }
    });
    return best;
  };

  // Build 1-bar rhythmic motif template (A) and variation (B)
  const buildRhythmBar = (isCadenceBar: boolean): { offset: number; dur: number; strong: boolean }[] => {
    if (isCadenceBar) {
      return [
        { offset: 0, dur: 0.5, strong: true },
        { offset: 0.5, dur: 0.5, strong: false },
        { offset: 1.0, dur: 0.75, strong: false },
        { offset: 1.75, dur: 0.25, strong: false },
        { offset: 2.0, dur: Math.max(0.75, barPpq - 2.2), strong: true },
      ].filter((s) => s.offset < barPpq - 0.15);
    }

    const patterns = [
      [
        { offset: 0, dur: 0.75, strong: true },
        { offset: 0.75, dur: 0.25, strong: false },
        { offset: 1.0, dur: 0.5, strong: false },
        { offset: 1.5, dur: 0.5, strong: false },
        { offset: 2.0, dur: 0.5, strong: true },
        { offset: 2.5, dur: 0.5, strong: false },
        { offset: 3.0, dur: 0.75, strong: false },
      ],
      [
        { offset: 0, dur: 0.5, strong: true },
        { offset: 0.5, dur: 0.5, strong: false },
        { offset: 1.0, dur: 0.5, strong: false },
        { offset: 1.5, dur: 1.0, strong: false },
        { offset: 2.5, dur: 0.5, strong: false },
        { offset: 3.0, dur: 0.5, strong: true },
        { offset: 3.5, dur: 0.45, strong: false },
      ],
      [
        { offset: 0.5, dur: 0.5, strong: true },
        { offset: 1.0, dur: 0.5, strong: false },
        { offset: 1.5, dur: 0.5, strong: false },
        { offset: 2.0, dur: 0.75, strong: true },
        { offset: 2.75, dur: 0.25, strong: false },
        { offset: 3.0, dur: 0.85, strong: false },
      ],
    ];
    return pickRandom(patterns).filter((s) => s.offset < barPpq - 0.1);
  };

  const motifA = buildRhythmBar(false);
  const motifB = buildRhythmBar(false);
  const notes: MidiNote[] = [];
  let nextId = 1;

  let curIdx = findNearestLadderIdx(tonicStartPitch);
  let prevStepDelta = 0;
  let gapFillTargetDir = 0; // +1 or -1 after a leap >= 3 steps

  // Store bar-0 motif offsets/intervals so bar 2 can echo motif A (call & response!)
  const motifADegreeDeltas: number[] = [];

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barPpq;
    const isFinalBar = bar === bars - 1;
    const isClimaxBar = bars >= 4 && bar === bars - 2;
    const chordPcs = new Set(
      getDiatonicChordPitchClasses(scaleRoot, intervals, progression[bar], false)
    );

    const rhythmSlots = isFinalBar
      ? buildRhythmBar(true)
      : bar % 2 === 0
      ? motifA
      : motifB;

    for (let sIdx = 0; sIdx < rhythmSlots.length; sIdx++) {
      const slot = rhythmSlots[sIdx];
      const isFinalNote = isFinalBar && sIdx === rhythmSlots.length - 1;

      if (isFinalNote) {
        // Cadential resolution onto tonic or 3rd/5th of home key
        const tonicPc = getEffectivePitchClassForDegree(scaleRoot, intervals, 0);
        const fifthPc = getEffectivePitchClassForDegree(scaleRoot, intervals, Math.min(4, intervals.length - 1));
        const resolvePc = Math.random() > 0.25 ? tonicPc : fifthPc;
        const resolvedPitch = closestMidiForPitchClass(resolvePc, ladder[curIdx], ladder[0], ladder[ladder.length - 1]);
        curIdx = findNearestLadderIdx(resolvedPitch);
      } else if (bar === 2 && sIdx < motifADegreeDeltas.length && Math.random() > 0.35) {
        // Echo motif A contour shifted slightly higher for bar-3 phrase climax
        const delta = motifADegreeDeltas[sIdx] + (sIdx === 0 ? 1 : 0);
        curIdx = Math.min(ladder.length - 1, Math.max(0, curIdx + delta));
      } else {
        // Counterpoint / Voice-leading step selection
        let stepDelta = 0;
        if (gapFillTargetDir !== 0) {
          // Rule of gap-fill: step back in opposite direction after a leap
          stepDelta = gapFillTargetDir * (Math.random() > 0.3 ? 1 : 2);
          gapFillTargetDir = 0;
        } else {
          const r = Math.random();
          const dirBias = isClimaxBar && curIdx < ladder.length - 4 ? 0.65 : 0.5;
          const dir = Math.random() < dirBias ? 1 : -1;
          if (r < 0.68) {
            stepDelta = dir * 1; // Stepwise conjunct motion (primary rule)
          } else if (r < 0.88) {
            stepDelta = dir * 2; // Skip of a 3rd
          } else if (r < 0.96) {
            stepDelta = dir * 3; // Leap of a 4th -> trigger gap fill
          } else {
            stepDelta = dir * 4; // Leap of a 5th -> trigger gap fill
          }
          // Avoid repeating exact same pitch twice on strong transitions
          if (stepDelta === 0 && prevStepDelta === 0) stepDelta = dir;
        }

        let candidateIdx = Math.min(ladder.length - 1, Math.max(0, curIdx + stepDelta));

        // On strong beats, gravitate to chord tones of current bar's harmony
        if (slot.strong && !chordPcs.has(ladder[candidateIdx] % 12)) {
          const up = candidateIdx + 1 < ladder.length && chordPcs.has(ladder[candidateIdx + 1] % 12);
          const down = candidateIdx - 1 >= 0 && chordPcs.has(ladder[candidateIdx - 1] % 12);
          if (up && down) {
            candidateIdx += Math.random() > 0.5 ? 1 : -1;
          } else if (up) {
            candidateIdx += 1;
          } else if (down) {
            candidateIdx -= 1;
          }
        }

        const actualDelta = candidateIdx - curIdx;
        if (Math.abs(actualDelta) >= 3) {
          gapFillTargetDir = actualDelta > 0 ? -1 : 1;
        }
        if (bar === 0) {
          motifADegreeDeltas.push(actualDelta);
        }
        prevStepDelta = actualDelta;
        curIdx = candidateIdx;
      }

      const safeDur = Math.min(slot.dur * 0.92, (bar + 1) * barPpq - (barStart + slot.offset) - 0.03);
      if (safeDur < 0.1) continue;

      notes.push({
        id: nextId++,
        pitch: ladder[curIdx],
        startPpq: barStart + slot.offset,
        durationPpq: safeDur,
        velocity: isFinalNote
          ? 0.86
          : slot.strong
          ? 0.82 + Math.random() * 0.1
          : 0.62 + Math.random() * 0.14,
        channel: 1,
      });
    }
  }

  return notes;
}

function generateRiffNotes(
  scaleRoot: number,
  scaleType: ScaleType,
  bars: number,
  barPpq: number
): MidiNote[] {
  const intervals = getHarmonicScaleIntervals(scaleType);
  const ladder = buildScalePitchLadder(scaleRoot, scaleType, 48, 72);
  if (ladder.length === 0) return [];

  // Anchor degrees for punchy riffs: Root (0), 3rd (2), 4th (3), 5th (4), 7th (6 or top)
  const tonicPc = getEffectivePitchClassForDegree(scaleRoot, intervals, 0);
  const rootMid = closestMidiForPitchClass(tonicPc, 55, 50, 62);

  let rootIdx = 0;
  let bestDist = 999;
  ladder.forEach((p, idx) => {
    const d = Math.abs(p - rootMid);
    if (d < bestDist) {
      bestDist = d;
      rootIdx = idx;
    }
  });

  // Riff pitch pool anchored around rootIdx (characteristic hook intervals)
  const poolIndices = Array.from(
    new Set(
      [
        rootIdx,
        rootIdx,
        rootIdx + 1,
        rootIdx + 2,
        rootIdx + 3,
        rootIdx + 4,
        rootIdx + intervals.length - 1, // sub-tonic / leading or b7 below root
        rootIdx - 1,
        rootIdx - 2,
        rootIdx + intervals.length, // octave pop
      ].filter((idx) => idx >= 0 && idx < ladder.length)
    )
  );

  // Build 1-bar syncopated riff hook cell
  const cellRhythm = [
    [
      { offset: 0, dur: 0.35, accent: true },
      { offset: 0.5, dur: 0.22, accent: false },
      { offset: 0.75, dur: 0.4, accent: true },
      { offset: 1.5, dur: 0.22, accent: false },
      { offset: 1.75, dur: 0.4, accent: true },
      { offset: 2.5, dur: 0.35, accent: false },
      { offset: 3.0, dur: 0.4, accent: true },
      { offset: 3.5, dur: 0.35, accent: false },
    ],
    [
      { offset: 0, dur: 0.45, accent: true },
      { offset: 0.75, dur: 0.22, accent: false },
      { offset: 1.0, dur: 0.22, accent: false },
      { offset: 1.5, dur: 0.45, accent: true },
      { offset: 2.25, dur: 0.22, accent: false },
      { offset: 2.5, dur: 0.4, accent: false },
      { offset: 3.25, dur: 0.55, accent: true },
    ],
  ];

  const chosenRhythm = pickRandom(cellRhythm).filter((s) => s.offset < barPpq - 0.1);
  const addPowerDoubleStops = Math.random() > 0.55;

  // Construct core 1-bar riff pitch pattern (always starting & anchoring on tonic)
  const coreIndices: number[] = chosenRhythm.map((slot, i) => {
    if (i === 0) return rootIdx;
    if (slot.accent && Math.random() > 0.45) {
      // Favor root, 3rd, 5th, or octave on accents
      const strongChoices = [rootIdx, rootIdx + 2, rootIdx + 4, rootIdx + intervals.length].filter(
        (idx) => idx >= 0 && idx < ladder.length
      );
      return strongChoices.length > 0 ? pickRandom(strongChoices) : rootIdx;
    }
    return pickRandom(poolIndices);
  });

  const notes: MidiNote[] = [];
  let nextId = 1;

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barPpq;
    const isTurnaroundBar = bar === bars - 1 || (bars >= 4 && bar === 1 && Math.random() > 0.5);

    chosenRhythm.forEach((slot, i) => {
      let idx = coreIndices[i];
      if (isTurnaroundBar && i >= chosenRhythm.length - 3) {
        // Turnaround variation at end of phrase (ascend or cadence back to root)
        if (i === chosenRhythm.length - 1) {
          idx = rootIdx;
        } else {
          idx = Math.min(ladder.length - 1, Math.max(0, rootIdx + (i % 2 === 0 ? 3 : 2)));
        }
      }

      const safeDur = Math.min(slot.dur, (bar + 1) * barPpq - (barStart + slot.offset) - 0.02);
      if (safeDur < 0.08) return;

      const mainPitch = ladder[idx];
      notes.push({
        id: nextId++,
        pitch: mainPitch,
        startPpq: barStart + slot.offset,
        durationPpq: safeDur,
        velocity: slot.accent ? 0.9 + Math.random() * 0.07 : 0.64 + Math.random() * 0.12,
        channel: 1,
      });

      // Optional diatonic 5th/4th power dyad on downbeat accents
      if (addPowerDoubleStops && slot.accent && i === 0 && idx + 4 < ladder.length) {
        notes.push({
          id: nextId++,
          pitch: ladder[idx + 4],
          startPpq: barStart + slot.offset,
          durationPpq: safeDur,
          velocity: 0.78,
          channel: 1,
        });
      }
    });
  }

  return notes;
}

export function generateMusicalPattern(options: GeneratePatternOptions): MidiSequence {
  const {
    type,
    scaleRoot,
    scaleType,
    bars = 4,
    bpm = 120,
    timeSigNumerator = 4,
    timeSigDenominator = 4,
    keySource = 'app',
  } = options;

  const barPpq = timeSigNumerator * (4 / timeSigDenominator);
  const totalLengthPpq = bars * barPpq;

  let rawNotes: MidiNote[];
  switch (type) {
    case 'melody':
      rawNotes = generateMelodyNotes(scaleRoot, scaleType, bars, barPpq);
      break;
    case 'riff':
      rawNotes = generateRiffNotes(scaleRoot, scaleType, bars, barPpq);
      break;
    case 'bass':
      rawNotes = generateBassLineNotes(scaleRoot, scaleType, bars, barPpq);
      break;
    case 'chords':
      rawNotes = generateChordsNotes(scaleRoot, scaleType, bars, barPpq);
      break;
  }

  const compliantNotes = enforceKeyCompliance(rawNotes, scaleRoot, scaleType);

  const rootName = getNoteName(scaleRoot);
  const scaleLabel = SCALE_DEFINITIONS[scaleType]?.name || scaleType;
  const typeLabel =
    type === 'melody'
      ? 'Melody'
      : type === 'riff'
      ? 'Riff'
      : type === 'bass'
      ? 'Bass Line'
      : 'Chords';

  return {
    name: `${rootName} ${scaleLabel} ${typeLabel}${keySource === 'daw' ? ' (DAW)' : ''}`,
    pack: 'Rule-Based Generator',
    bpm,
    timeSigNumerator,
    timeSigDenominator,
    totalLengthPpq,
    notes: compliantNotes,
  };
}
