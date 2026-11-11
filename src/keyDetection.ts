import { KeyResult, MidiNote } from './types';

// Standard Krumhansl-Kessler probe tone ratings
const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const SHARP_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function getNoteName(pitchClass: number, useFlats = false): string {
  const idx = ((pitchClass % 12) + 12) % 12;
  return useFlats ? FLAT_NOTE_NAMES[idx] : SHARP_NOTE_NAMES[idx];
}

export function getKeyName(rootPitch: number, isMinor: boolean): string {
  let preferFlat = false;
  if (isMinor) {
    preferFlat = [1, 3, 8, 10].includes(rootPitch);
  } else {
    preferFlat = [1, 3, 5, 8, 10].includes(rootPitch);
  }
  return `${getNoteName(rootPitch, preferFlat)} ${isMinor ? 'Minor' : 'Major'}`;
}

export function computePearsonCorrelation(x: number[], y: number[]): number {
  const meanX = x.reduce((a, b) => a + b, 0) / 12;
  const meanY = y.reduce((a, b) => a + b, 0) / 12;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < 12; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den <= 1e-7) return 0;
  return num / den;
}

export function analyzeKeyFromNotes(notes: MidiNote[]): KeyResult {
  const weights = new Array(12).fill(0);

  for (const n of notes) {
    const pc = ((n.pitch % 12) + 12) % 12;
    weights[pc] += Math.max(0.1, n.durationPpq) * (n.velocity > 0 ? n.velocity : 0.8);
  }

  return analyzePitchClassWeights(weights);
}

export function analyzePitchClassWeights(weights: number[]): KeyResult {
  const totalSum = weights.reduce((a, b) => a + b, 0);
  if (totalSum <= 0.0001) {
    return {
      rootPitch: 0,
      isMinor: false,
      confidence: 0,
      keyName: 'Undetected (C Major)',
      pitchClassWeights: weights,
      correlation: 0,
    };
  }

  interface Candidate {
    root: number;
    isMinor: boolean;
    r: number;
  }
  const candidates: Candidate[] = [];

  for (let root = 0; root < 12; root++) {
    // Major shift
    const shiftedMajor = new Array(12);
    for (let i = 0; i < 12; i++) {
      shiftedMajor[i] = KRUMHANSL_MAJOR[((i - root) % 12 + 12) % 12];
    }
    const rMaj = computePearsonCorrelation(weights, shiftedMajor);
    candidates.push({ root, isMinor: false, r: rMaj });

    // Minor shift
    const shiftedMinor = new Array(12);
    for (let i = 0; i < 12; i++) {
      shiftedMinor[i] = KRUMHANSL_MINOR[((i - root) % 12 + 12) % 12];
    }
    const rMin = computePearsonCorrelation(weights, shiftedMinor);
    candidates.push({ root, isMinor: true, r: rMin });
  }

  candidates.sort((a, b) => b.r - a.r);

  const winner = candidates[0];
  const runnerUp = candidates[1];

  const separation = Math.max(0, winner.r - runnerUp.r);
  const normCorr = Math.min(1, Math.max(0, (winner.r + 1) * 0.5));
  const confidence = Math.min(0.99, Math.max(0.05, normCorr * 0.6 + separation * 2 * 0.4));

  return {
    rootPitch: winner.root,
    isMinor: winner.isMinor,
    confidence,
    keyName: getKeyName(winner.root, winner.isMinor),
    pitchClassWeights: weights,
    correlation: winner.r,
  };
}

export function calculateSemitoneOffsetToTarget(detectedRoot: number, targetRoot: number): number {
  let diff = (targetRoot - detectedRoot) % 12;
  if (diff < 0) diff += 12;
  if (diff > 6) diff -= 12;
  return diff;
}
