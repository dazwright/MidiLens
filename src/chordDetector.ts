import { getNoteName } from './keyDetection';

export interface ChordAnalysisResult {
  fullName: string;        // e.g. "Cmaj7" or "Am9 / C"
  rootNote: string;        // e.g. "C"
  quality: string;         // e.g. "Major 7th", "Minor 9th", "Power Chord"
  bassNote: string;        // e.g. "E"
  isSlashChord: boolean;   // true if bass != root
  intervals: string[];     // e.g. ["R", "3", "5", "7"]
  pitches: number[];       // raw pitch values
  pitchNames: string[];    // e.g. ["C4", "E4", "G4", "B4"]
  pitchClasses: number[];  // unique 0-11 pitch classes
}

// Chord Definitions Map
interface ChordTemplate {
  name: string;
  shortName: string;
  intervals: number[]; // semitones relative to root
  displayIntervals: string[];
}

const CHORD_TEMPLATES: ChordTemplate[] = [
  // Triads & Basic
  { name: 'Major', shortName: '', intervals: [0, 4, 7], displayIntervals: ['1', '3', '5'] },
  { name: 'Minor', shortName: 'm', intervals: [0, 3, 7], displayIntervals: ['1', 'b3', '5'] },
  { name: 'Diminished', shortName: 'dim', intervals: [0, 3, 6], displayIntervals: ['1', 'b3', 'b5'] },
  { name: 'Augmented', shortName: 'aug', intervals: [0, 4, 8], displayIntervals: ['1', '3', '#5'] },
  { name: 'Suspended 4', shortName: 'sus4', intervals: [0, 5, 7], displayIntervals: ['1', '4', '5'] },
  { name: 'Suspended 2', shortName: 'sus2', intervals: [0, 2, 7], displayIntervals: ['1', '2', '5'] },
  { name: 'Power Chord', shortName: '5', intervals: [0, 7], displayIntervals: ['1', '5'] },

  // 7th Chords
  { name: 'Major 7th', shortName: 'maj7', intervals: [0, 4, 7, 11], displayIntervals: ['1', '3', '5', '7'] },
  { name: 'Minor 7th', shortName: 'm7', intervals: [0, 3, 7, 10], displayIntervals: ['1', 'b3', '5', 'b7'] },
  { name: 'Dominant 7th', shortName: '7', intervals: [0, 4, 7, 10], displayIntervals: ['1', '3', '5', 'b7'] },
  { name: 'Half-Diminished 7th', shortName: 'm7b5', intervals: [0, 3, 6, 10], displayIntervals: ['1', 'b3', 'b5', 'b7'] },
  { name: 'Diminished 7th', shortName: 'dim7', intervals: [0, 3, 6, 9], displayIntervals: ['1', 'b3', 'b5', 'bb7'] },
  { name: 'Minor-Major 7th', shortName: 'mM7', intervals: [0, 3, 7, 11], displayIntervals: ['1', 'b3', '5', '7'] },
  { name: 'Augmented 7th', shortName: 'aug7', intervals: [0, 4, 8, 10], displayIntervals: ['1', '3', '#5', 'b7'] },
  { name: '7th Flat 5', shortName: '7b5', intervals: [0, 4, 6, 10], displayIntervals: ['1', '3', 'b5', 'b7'] },

  // 6th & Add Chords
  { name: 'Major 6th', shortName: '6', intervals: [0, 4, 7, 9], displayIntervals: ['1', '3', '5', '6'] },
  { name: 'Minor 6th', shortName: 'm6', intervals: [0, 3, 7, 9], displayIntervals: ['1', 'b3', '5', '6'] },
  { name: 'Add 9', shortName: 'add9', intervals: [0, 4, 7, 2], displayIntervals: ['1', '3', '5', '9'] },
  { name: 'Minor Add 9', shortName: 'm(add9)', intervals: [0, 3, 7, 2], displayIntervals: ['1', 'b3', '5', '9'] },
  { name: '6/9', shortName: '6/9', intervals: [0, 4, 7, 9, 2], displayIntervals: ['1', '3', '5', '6', '9'] },

  // Extended Chords
  { name: 'Dominant 9th', shortName: '9', intervals: [0, 4, 7, 10, 2], displayIntervals: ['1', '3', '5', 'b7', '9'] },
  { name: 'Major 9th', shortName: 'maj9', intervals: [0, 4, 7, 11, 2], displayIntervals: ['1', '3', '5', '7', '9'] },
  { name: 'Minor 9th', shortName: 'm9', intervals: [0, 3, 7, 10, 2], displayIntervals: ['1', 'b3', '5', 'b7', '9'] },
  { name: '7th Sharp 9', shortName: '7#9', intervals: [0, 4, 7, 10, 3], displayIntervals: ['1', '3', '5', 'b7', '#9'] },
  { name: '7th Flat 9', shortName: '7b9', intervals: [0, 4, 7, 10, 1], displayIntervals: ['1', '3', '5', 'b7', 'b9'] },
  { name: 'Dominant 11th', shortName: '11', intervals: [0, 4, 7, 10, 2, 5], displayIntervals: ['1', '3', '5', 'b7', '9', '11'] },
  { name: 'Minor 11th', shortName: 'm11', intervals: [0, 3, 7, 10, 2, 5], displayIntervals: ['1', 'b3', '5', 'b7', '9', '11'] },
  { name: 'Dominant 13th', shortName: '13', intervals: [0, 4, 7, 10, 2, 9], displayIntervals: ['1', '3', '5', 'b7', '9', '13'] },
];

export function detectChordFromPitches(pitches: number[], preferFlat = false): ChordAnalysisResult {
  if (!pitches || pitches.length === 0) {
    return {
      fullName: 'No Notes Active',
      rootNote: '-',
      quality: 'Silence',
      bassNote: '-',
      isSlashChord: false,
      intervals: [],
      pitches: [],
      pitchNames: [],
      pitchClasses: [],
    };
  }

  // Sort pitches lowest to highest
  const sortedPitches = [...pitches].sort((a, b) => a - b);
  const bassPitch = sortedPitches[0];
  const bassPc = ((bassPitch % 12) + 12) % 12;
  const bassName = getNoteName(bassPc, preferFlat);

  // Format pitch names like "C4", "E4", "G4"
  const pitchNames = sortedPitches.map((p) => {
    const pc = ((p % 12) + 12) % 12;
    const oct = Math.floor(p / 12) - 1;
    return `${getNoteName(pc, preferFlat)}${oct}`;
  });

  // Extract unique pitch classes
  const uniquePcsSet = new Set<number>();
  sortedPitches.forEach((p) => uniquePcsSet.add(((p % 12) + 12) % 12));
  const uniquePcs = Array.from(uniquePcsSet);

  // Single note check
  if (uniquePcs.length === 1) {
    const noteName = getNoteName(uniquePcs[0], preferFlat);
    return {
      fullName: noteName,
      rootNote: noteName,
      quality: 'Single Note',
      bassNote: noteName,
      isSlashChord: false,
      intervals: ['1'],
      pitches: sortedPitches,
      pitchNames,
      pitchClasses: uniquePcs,
    };
  }

  // Two note check (Dyad / Interval)
  if (uniquePcs.length === 2) {
    const intervalSemitones = (uniquePcs[1] - uniquePcs[0] + 12) % 12;
    const rootName = getNoteName(uniquePcs[0], preferFlat);
    const otherName = getNoteName(uniquePcs[1], preferFlat);

    if (intervalSemitones === 7) {
      return {
        fullName: `${rootName}5`,
        rootNote: rootName,
        quality: 'Power Chord (Fifth)',
        bassNote: bassName,
        isSlashChord: bassPc !== uniquePcs[0],
        intervals: ['1', '5'],
        pitches: sortedPitches,
        pitchNames,
        pitchClasses: uniquePcs,
      };
    } else if (intervalSemitones === 4) {
      return {
        fullName: `${rootName} (no 5)`,
        rootNote: rootName,
        quality: 'Major Dyad',
        bassNote: bassName,
        isSlashChord: bassPc !== uniquePcs[0],
        intervals: ['1', '3'],
        pitches: sortedPitches,
        pitchNames,
        pitchClasses: uniquePcs,
      };
    } else if (intervalSemitones === 3) {
      return {
        fullName: `${rootName}m (no 5)`,
        rootNote: rootName,
        quality: 'Minor Dyad',
        bassNote: bassName,
        isSlashChord: bassPc !== uniquePcs[0],
        intervals: ['1', 'b3'],
        pitches: sortedPitches,
        pitchNames,
        pitchClasses: uniquePcs,
      };
    }
  }

  // Evaluate candidate roots against chord templates
  interface ScoredCandidate {
    rootPc: number;
    template: ChordTemplate;
    matchedCount: number;
    missingEssentialCount: number;
    extraCount: number;
    score: number;
  }

  const scoredCandidates: ScoredCandidate[] = [];

  for (const candidateRootPc of uniquePcs) {
    // Relative intervals in semitones (0 to 11) from candidate root
    const normalizedIntervals = uniquePcs.map((pc) => (pc - candidateRootPc + 12) % 12);
    const intervalSet = new Set(normalizedIntervals);

    for (const template of CHORD_TEMPLATES) {
      const templateSet = new Set(template.intervals.map((i) => i % 12));
      let matchedCount = 0;

      templateSet.forEach((i) => {
        if (intervalSet.has(i)) matchedCount++;
      });

      const missingCount = templateSet.size - matchedCount;
      const extraCount = intervalSet.size - matchedCount;

      // Must match at least root and 3rd/5th or 2+ essential tones
      if (matchedCount >= 2 && matchedCount >= Math.min(3, templateSet.size - 1)) {
        let score = matchedCount * 10 - missingCount * 4 - extraCount * 3;

        // Bonus if candidate root matches the bass note
        if (candidateRootPc === bassPc) score += 5;

        // Bonus for exact template match
        if (missingCount === 0 && extraCount === 0) score += 15;

        scoredCandidates.push({
          rootPc: candidateRootPc,
          template,
          matchedCount,
          missingEssentialCount: missingCount,
          extraCount,
          score,
        });
      }
    }
  }

  if (scoredCandidates.length === 0) {
    // Fallback: Custom cluster chord representation
    const bassRootName = getNoteName(bassPc, preferFlat);
    return {
      fullName: `${bassRootName} Cluster`,
      rootNote: bassRootName,
      quality: 'Complex Harmonic Cluster',
      bassNote: bassName,
      isSlashChord: false,
      intervals: uniquePcs.map((pc) => `${(pc - bassPc + 12) % 12}st`),
      pitches: sortedPitches,
      pitchNames,
      pitchClasses: uniquePcs,
    };
  }

  // Sort best candidate first
  scoredCandidates.sort((a, b) => b.score - a.score);
  const best = scoredCandidates[0];

  const rootName = getNoteName(best.rootPc, preferFlat);
  const isSlash = bassPc !== best.rootPc;
  const chordSymbol = `${rootName}${best.template.shortName}${isSlash ? `/${bassName}` : ''}`;

  return {
    fullName: chordSymbol,
    rootNote: rootName,
    quality: best.template.name,
    bassNote: bassName,
    isSlashChord: isSlash,
    intervals: best.template.displayIntervals,
    pitches: sortedPitches,
    pitchNames,
    pitchClasses: uniquePcs,
  };
}
