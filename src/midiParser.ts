import { MidiNote, MidiSequence } from './types';

// Preset MIDI patterns for instant auditioning across distinct keys, genres, and voicings
export const PRESET_SEQUENCES: MidiSequence[] = [
  {
    name: 'Neo-Soul Silk Chords (C Minor)',
    bpm: 104,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: Cm9
      { id: 1, pitch: 36, startPpq: 0.0, durationPpq: 3.8, velocity: 0.82, channel: 1 },
      { id: 2, pitch: 63, startPpq: 0.0, durationPpq: 3.8, velocity: 0.74, channel: 1 },
      { id: 3, pitch: 67, startPpq: 0.0, durationPpq: 3.8, velocity: 0.76, channel: 1 },
      { id: 4, pitch: 70, startPpq: 0.0, durationPpq: 3.8, velocity: 0.8, channel: 1 },
      { id: 5, pitch: 74, startPpq: 0.0, durationPpq: 3.8, velocity: 0.85, channel: 1 },
      // Bar 2: Fm9
      { id: 6, pitch: 41, startPpq: 4.0, durationPpq: 3.8, velocity: 0.84, channel: 1 },
      { id: 7, pitch: 63, startPpq: 4.0, durationPpq: 3.8, velocity: 0.72, channel: 1 },
      { id: 8, pitch: 68, startPpq: 4.0, durationPpq: 3.8, velocity: 0.77, channel: 1 },
      { id: 9, pitch: 72, startPpq: 4.0, durationPpq: 3.8, velocity: 0.79, channel: 1 },
      { id: 10, pitch: 79, startPpq: 4.0, durationPpq: 3.8, velocity: 0.86, channel: 1 },
      // Bar 3: Bb13
      { id: 11, pitch: 46, startPpq: 8.0, durationPpq: 3.8, velocity: 0.85, channel: 1 },
      { id: 12, pitch: 62, startPpq: 8.0, durationPpq: 3.8, velocity: 0.75, channel: 1 },
      { id: 13, pitch: 68, startPpq: 8.0, durationPpq: 3.8, velocity: 0.76, channel: 1 },
      { id: 14, pitch: 72, startPpq: 8.0, durationPpq: 3.8, velocity: 0.8, channel: 1 },
      { id: 15, pitch: 79, startPpq: 8.0, durationPpq: 3.8, velocity: 0.88, channel: 1 },
      // Bar 4: EbMaj9
      { id: 16, pitch: 39, startPpq: 12.0, durationPpq: 3.8, velocity: 0.83, channel: 1 },
      { id: 17, pitch: 62, startPpq: 12.0, durationPpq: 3.8, velocity: 0.74, channel: 1 },
      { id: 18, pitch: 67, startPpq: 12.0, durationPpq: 3.8, velocity: 0.78, channel: 1 },
      { id: 19, pitch: 70, startPpq: 12.0, durationPpq: 3.8, velocity: 0.79, channel: 1 },
      { id: 20, pitch: 77, startPpq: 12.0, durationPpq: 3.8, velocity: 0.87, channel: 1 },
    ],
  },
  {
    name: 'Lo-Fi Chill Hop (F Major)',
    bpm: 84,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: FMaj9 (soft strum offset)
      { id: 21, pitch: 41, startPpq: 0.0, durationPpq: 3.6, velocity: 0.72, channel: 1 }, // F2
      { id: 22, pitch: 57, startPpq: 0.04, durationPpq: 3.6, velocity: 0.68, channel: 1 }, // A3
      { id: 23, pitch: 60, startPpq: 0.08, durationPpq: 3.5, velocity: 0.7, channel: 1 }, // C4
      { id: 24, pitch: 64, startPpq: 0.12, durationPpq: 3.5, velocity: 0.74, channel: 1 }, // E4
      { id: 25, pitch: 67, startPpq: 0.16, durationPpq: 3.4, velocity: 0.77, channel: 1 }, // G4
      // Bar 2: Dm9
      { id: 26, pitch: 38, startPpq: 4.0, durationPpq: 3.6, velocity: 0.75, channel: 1 }, // D2
      { id: 27, pitch: 57, startPpq: 4.04, durationPpq: 3.6, velocity: 0.69, channel: 1 }, // A3
      { id: 28, pitch: 60, startPpq: 4.08, durationPpq: 3.5, velocity: 0.72, channel: 1 }, // C4
      { id: 29, pitch: 65, startPpq: 4.12, durationPpq: 3.5, velocity: 0.75, channel: 1 }, // F4
      { id: 30, pitch: 69, startPpq: 4.16, durationPpq: 3.4, velocity: 0.78, channel: 1 }, // A4
      // Bar 3: Gm9
      { id: 31, pitch: 43, startPpq: 8.0, durationPpq: 3.6, velocity: 0.74, channel: 1 }, // G2
      { id: 32, pitch: 58, startPpq: 8.04, durationPpq: 3.6, velocity: 0.68, channel: 1 }, // Bb3
      { id: 33, pitch: 62, startPpq: 8.08, durationPpq: 3.5, velocity: 0.71, channel: 1 }, // D4
      { id: 34, pitch: 65, startPpq: 8.12, durationPpq: 3.5, velocity: 0.74, channel: 1 }, // F4
      { id: 35, pitch: 69, startPpq: 8.16, durationPpq: 3.4, velocity: 0.76, channel: 1 }, // A4
      // Bar 4: C9sus4 -> C7
      { id: 36, pitch: 36, startPpq: 12.0, durationPpq: 3.6, velocity: 0.76, channel: 1 }, // C2
      { id: 37, pitch: 55, startPpq: 12.04, durationPpq: 3.6, velocity: 0.69, channel: 1 }, // G3
      { id: 38, pitch: 58, startPpq: 12.08, durationPpq: 3.5, velocity: 0.73, channel: 1 }, // Bb3
      { id: 39, pitch: 62, startPpq: 12.12, durationPpq: 3.5, velocity: 0.75, channel: 1 }, // D4
      { id: 40, pitch: 65, startPpq: 12.16, durationPpq: 3.4, velocity: 0.79, channel: 1 }, // F4
    ],
  },
  {
    name: 'Trap Dark Bells (D Minor)',
    bpm: 140,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: Dm bass pedal + high bell melody
      { id: 41, pitch: 38, startPpq: 0.0, durationPpq: 3.5, velocity: 0.95, channel: 1 }, // D2 808
      { id: 42, pitch: 74, startPpq: 0.0, durationPpq: 0.8, velocity: 0.88, channel: 1 }, // D5
      { id: 43, pitch: 77, startPpq: 1.0, durationPpq: 0.8, velocity: 0.82, channel: 1 }, // F5
      { id: 44, pitch: 81, startPpq: 2.0, durationPpq: 0.8, velocity: 0.85, channel: 1 }, // A5
      { id: 45, pitch: 86, startPpq: 3.0, durationPpq: 0.45, velocity: 0.9, channel: 1 }, // D6
      { id: 46, pitch: 84, startPpq: 3.5, durationPpq: 0.45, velocity: 0.84, channel: 1 }, // C6
      // Bar 2: Bb
      { id: 47, pitch: 34, startPpq: 4.0, durationPpq: 3.5, velocity: 0.92, channel: 1 }, // Bb1
      { id: 48, pitch: 74, startPpq: 4.0, durationPpq: 0.8, velocity: 0.85, channel: 1 }, // D5
      { id: 49, pitch: 77, startPpq: 5.0, durationPpq: 0.8, velocity: 0.82, channel: 1 }, // F5
      { id: 50, pitch: 82, startPpq: 6.0, durationPpq: 0.8, velocity: 0.86, channel: 1 }, // Bb5
      { id: 51, pitch: 81, startPpq: 7.0, durationPpq: 0.8, velocity: 0.8, channel: 1 }, // A5
      // Bar 3: Gm
      { id: 52, pitch: 31, startPpq: 8.0, durationPpq: 3.5, velocity: 0.94, channel: 1 }, // G1
      { id: 53, pitch: 74, startPpq: 8.0, durationPpq: 0.8, velocity: 0.84, channel: 1 }, // D5
      { id: 54, pitch: 79, startPpq: 9.0, durationPpq: 0.8, velocity: 0.85, channel: 1 }, // G5
      { id: 55, pitch: 82, startPpq: 10.0, durationPpq: 0.8, velocity: 0.88, channel: 1 }, // Bb5
      { id: 56, pitch: 84, startPpq: 11.0, durationPpq: 0.8, velocity: 0.82, channel: 1 }, // C6
      // Bar 4: A7 tension with fast roll
      { id: 57, pitch: 33, startPpq: 12.0, durationPpq: 3.5, velocity: 0.96, channel: 1 }, // A1
      { id: 58, pitch: 73, startPpq: 12.0, durationPpq: 0.8, velocity: 0.86, channel: 1 }, // C#5
      { id: 59, pitch: 76, startPpq: 13.0, durationPpq: 0.8, velocity: 0.84, channel: 1 }, // E5
      { id: 60, pitch: 81, startPpq: 14.0, durationPpq: 0.45, velocity: 0.88, channel: 1 }, // A5
      { id: 61, pitch: 85, startPpq: 14.5, durationPpq: 0.22, velocity: 0.9, channel: 1 }, // C#6
      { id: 62, pitch: 88, startPpq: 14.75, durationPpq: 0.22, velocity: 0.92, channel: 1 }, // E6
      { id: 63, pitch: 85, startPpq: 15.0, durationPpq: 0.45, velocity: 0.86, channel: 1 }, // C#6
      { id: 64, pitch: 81, startPpq: 15.5, durationPpq: 0.45, velocity: 0.82, channel: 1 }, // A5
    ],
  },
  {
    name: 'House Driving Stabs (G Minor)',
    bpm: 124,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: Gm7 stabs on 0.0, 1.5, 2.75
      { id: 65, pitch: 43, startPpq: 0.0, durationPpq: 0.4, velocity: 0.92, channel: 1 }, // G2
      { id: 66, pitch: 55, startPpq: 0.0, durationPpq: 0.4, velocity: 0.85, channel: 1 }, // G3
      { id: 67, pitch: 58, startPpq: 0.0, durationPpq: 0.4, velocity: 0.84, channel: 1 }, // Bb3
      { id: 68, pitch: 62, startPpq: 0.0, durationPpq: 0.4, velocity: 0.88, channel: 1 }, // D4
      { id: 69, pitch: 65, startPpq: 0.0, durationPpq: 0.4, velocity: 0.9, channel: 1 }, // F4

      { id: 70, pitch: 55, startPpq: 1.5, durationPpq: 0.4, velocity: 0.82, channel: 1 },
      { id: 71, pitch: 58, startPpq: 1.5, durationPpq: 0.4, velocity: 0.81, channel: 1 },
      { id: 72, pitch: 62, startPpq: 1.5, durationPpq: 0.4, velocity: 0.85, channel: 1 },
      { id: 73, pitch: 65, startPpq: 1.5, durationPpq: 0.4, velocity: 0.86, channel: 1 },

      { id: 74, pitch: 55, startPpq: 2.75, durationPpq: 0.8, velocity: 0.88, channel: 1 },
      { id: 75, pitch: 58, startPpq: 2.75, durationPpq: 0.8, velocity: 0.86, channel: 1 },
      { id: 76, pitch: 62, startPpq: 2.75, durationPpq: 0.8, velocity: 0.9, channel: 1 },
      { id: 77, pitch: 65, startPpq: 2.75, durationPpq: 0.8, velocity: 0.92, channel: 1 },

      // Bar 2: EbMaj7 stabs on 4.0, 5.5, 6.75
      { id: 78, pitch: 39, startPpq: 4.0, durationPpq: 0.4, velocity: 0.9, channel: 1 }, // Eb2
      { id: 79, pitch: 55, startPpq: 4.0, durationPpq: 0.4, velocity: 0.83, channel: 1 }, // G3
      { id: 80, pitch: 58, startPpq: 4.0, durationPpq: 0.4, velocity: 0.85, channel: 1 }, // Bb3
      { id: 81, pitch: 62, startPpq: 4.0, durationPpq: 0.4, velocity: 0.88, channel: 1 }, // D4

      { id: 82, pitch: 55, startPpq: 5.5, durationPpq: 0.4, velocity: 0.82, channel: 1 },
      { id: 83, pitch: 58, startPpq: 5.5, durationPpq: 0.4, velocity: 0.83, channel: 1 },
      { id: 84, pitch: 62, startPpq: 5.5, durationPpq: 0.4, velocity: 0.87, channel: 1 },

      { id: 85, pitch: 55, startPpq: 6.75, durationPpq: 0.8, velocity: 0.89, channel: 1 },
      { id: 86, pitch: 58, startPpq: 6.75, durationPpq: 0.8, velocity: 0.88, channel: 1 },
      { id: 87, pitch: 62, startPpq: 6.75, durationPpq: 0.8, velocity: 0.91, channel: 1 },

      // Bar 3: F9 stabs
      { id: 88, pitch: 41, startPpq: 8.0, durationPpq: 0.4, velocity: 0.92, channel: 1 }, // F2
      { id: 89, pitch: 57, startPpq: 8.0, durationPpq: 0.4, velocity: 0.84, channel: 1 }, // A3
      { id: 90, pitch: 60, startPpq: 8.0, durationPpq: 0.4, velocity: 0.86, channel: 1 }, // C4
      { id: 91, pitch: 63, startPpq: 8.0, durationPpq: 0.4, velocity: 0.88, channel: 1 }, // Eb4
      { id: 92, pitch: 67, startPpq: 8.0, durationPpq: 0.4, velocity: 0.91, channel: 1 }, // G4

      { id: 93, pitch: 57, startPpq: 9.5, durationPpq: 0.4, velocity: 0.83, channel: 1 },
      { id: 94, pitch: 60, startPpq: 9.5, durationPpq: 0.4, velocity: 0.85, channel: 1 },
      { id: 95, pitch: 63, startPpq: 9.5, durationPpq: 0.4, velocity: 0.87, channel: 1 },

      // Bar 4: Dm7 turnaround stabs
      { id: 96, pitch: 38, startPpq: 12.0, durationPpq: 0.4, velocity: 0.94, channel: 1 }, // D2
      { id: 97, pitch: 53, startPpq: 12.0, durationPpq: 0.4, velocity: 0.84, channel: 1 }, // F3
      { id: 98, pitch: 57, startPpq: 12.0, durationPpq: 0.4, velocity: 0.86, channel: 1 }, // A3
      { id: 99, pitch: 60, startPpq: 12.0, durationPpq: 0.4, velocity: 0.89, channel: 1 }, // C4
      { id: 100, pitch: 53, startPpq: 13.5, durationPpq: 0.4, velocity: 0.82, channel: 1 },
      { id: 101, pitch: 57, startPpq: 13.5, durationPpq: 0.4, velocity: 0.84, channel: 1 },
      { id: 102, pitch: 60, startPpq: 13.5, durationPpq: 0.4, velocity: 0.87, channel: 1 },
    ],
  },
  {
    name: 'Cinematic Epic Major (D Major)',
    bpm: 96,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: D(add9)
      { id: 103, pitch: 38, startPpq: 0.0, durationPpq: 3.8, velocity: 0.88, channel: 1 }, // D2
      { id: 104, pitch: 45, startPpq: 0.0, durationPpq: 3.8, velocity: 0.8, channel: 1 },  // A2
      { id: 105, pitch: 50, startPpq: 0.0, durationPpq: 3.8, velocity: 0.82, channel: 1 }, // D3
      { id: 106, pitch: 54, startPpq: 0.0, durationPpq: 3.8, velocity: 0.84, channel: 1 }, // F#3
      { id: 107, pitch: 57, startPpq: 0.0, durationPpq: 3.8, velocity: 0.86, channel: 1 }, // A3
      { id: 108, pitch: 64, startPpq: 0.0, durationPpq: 3.8, velocity: 0.9, channel: 1 },  // E4 (add9)
      // Bar 2: Bm7
      { id: 109, pitch: 35, startPpq: 4.0, durationPpq: 3.8, velocity: 0.86, channel: 1 }, // B1
      { id: 110, pitch: 42, startPpq: 4.0, durationPpq: 3.8, velocity: 0.78, channel: 1 }, // F#2
      { id: 111, pitch: 47, startPpq: 4.0, durationPpq: 3.8, velocity: 0.8, channel: 1 },  // B2
      { id: 112, pitch: 50, startPpq: 4.0, durationPpq: 3.8, velocity: 0.82, channel: 1 }, // D3
      { id: 113, pitch: 54, startPpq: 4.0, durationPpq: 3.8, velocity: 0.85, channel: 1 }, // F#3
      { id: 114, pitch: 57, startPpq: 4.0, durationPpq: 3.8, velocity: 0.88, channel: 1 }, // A3
      // Bar 3: G(add9)
      { id: 115, pitch: 31, startPpq: 8.0, durationPpq: 3.8, velocity: 0.89, channel: 1 }, // G1
      { id: 116, pitch: 38, startPpq: 8.0, durationPpq: 3.8, velocity: 0.8, channel: 1 },  // D2
      { id: 117, pitch: 43, startPpq: 8.0, durationPpq: 3.8, velocity: 0.82, channel: 1 }, // G2
      { id: 118, pitch: 47, startPpq: 8.0, durationPpq: 3.8, velocity: 0.83, channel: 1 }, // B2
      { id: 119, pitch: 50, startPpq: 8.0, durationPpq: 3.8, velocity: 0.86, channel: 1 }, // D3
      { id: 120, pitch: 57, startPpq: 8.0, durationPpq: 3.8, velocity: 0.9, channel: 1 },  // A3 (add9)
      // Bar 4: A(sus4) -> A
      { id: 121, pitch: 33, startPpq: 12.0, durationPpq: 3.8, velocity: 0.91, channel: 1 }, // A1
      { id: 122, pitch: 40, startPpq: 12.0, durationPpq: 3.8, velocity: 0.82, channel: 1 }, // E2
      { id: 123, pitch: 45, startPpq: 12.0, durationPpq: 3.8, velocity: 0.84, channel: 1 }, // A2
      { id: 124, pitch: 49, startPpq: 12.0, durationPpq: 3.8, velocity: 0.86, channel: 1 }, // C#3
      { id: 125, pitch: 52, startPpq: 12.0, durationPpq: 3.8, velocity: 0.88, channel: 1 }, // E3
      { id: 126, pitch: 59, startPpq: 12.0, durationPpq: 3.8, velocity: 0.92, channel: 1 }, // B3
    ],
  },
  {
    name: 'Jazz Blues Turnaround (Bb Blues)',
    bpm: 118,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: Bb13
      { id: 127, pitch: 46, startPpq: 0.0, durationPpq: 3.6, velocity: 0.86, channel: 1 }, // Bb2
      { id: 128, pitch: 62, startPpq: 0.0, durationPpq: 3.6, velocity: 0.76, channel: 1 }, // D4
      { id: 129, pitch: 68, startPpq: 0.0, durationPpq: 3.6, velocity: 0.78, channel: 1 }, // Ab4
      { id: 130, pitch: 72, startPpq: 0.0, durationPpq: 3.6, velocity: 0.82, channel: 1 }, // C5
      { id: 131, pitch: 79, startPpq: 0.0, durationPpq: 3.6, velocity: 0.88, channel: 1 }, // G5
      // Bar 2: Eb9
      { id: 132, pitch: 39, startPpq: 4.0, durationPpq: 3.6, velocity: 0.84, channel: 1 }, // Eb2
      { id: 133, pitch: 55, startPpq: 4.0, durationPpq: 3.6, velocity: 0.74, channel: 1 }, // G3
      { id: 134, pitch: 61, startPpq: 4.0, durationPpq: 3.6, velocity: 0.77, channel: 1 }, // Db4
      { id: 135, pitch: 65, startPpq: 4.0, durationPpq: 3.6, velocity: 0.8, channel: 1 },  // F4
      { id: 136, pitch: 70, startPpq: 4.0, durationPpq: 3.6, velocity: 0.85, channel: 1 }, // Bb4
      // Bar 3: F7#9
      { id: 137, pitch: 41, startPpq: 8.0, durationPpq: 3.6, velocity: 0.88, channel: 1 }, // F2
      { id: 138, pitch: 57, startPpq: 8.0, durationPpq: 3.6, velocity: 0.76, channel: 1 }, // A3
      { id: 139, pitch: 63, startPpq: 8.0, durationPpq: 3.6, velocity: 0.8, channel: 1 },  // Eb4
      { id: 140, pitch: 68, startPpq: 8.0, durationPpq: 3.6, velocity: 0.84, channel: 1 }, // G#4 (#9)
      // Bar 4: Bb7 -> Chromatic walk
      { id: 141, pitch: 46, startPpq: 12.0, durationPpq: 1.8, velocity: 0.85, channel: 1 }, // Bb2
      { id: 142, pitch: 62, startPpq: 12.0, durationPpq: 1.8, velocity: 0.75, channel: 1 }, // D4
      { id: 143, pitch: 68, startPpq: 12.0, durationPpq: 1.8, velocity: 0.78, channel: 1 }, // Ab4
      { id: 144, pitch: 45, startPpq: 14.0, durationPpq: 1.0, velocity: 0.8, channel: 1 },  // A2 chromatic passing
      { id: 145, pitch: 46, startPpq: 15.0, durationPpq: 0.8, velocity: 0.88, channel: 1 }, // Bb2
    ],
  },
  {
    name: 'Synthwave Cyber Arp (A Minor)',
    bpm: 128,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: Am (A2 bass + 16th arp: A3, C4, E4, A4, E4, C4, A3, E4...)
      { id: 146, pitch: 33, startPpq: 0.0, durationPpq: 3.8, velocity: 0.95, channel: 1 },
      { id: 147, pitch: 57, startPpq: 0.0, durationPpq: 0.22, velocity: 0.82, channel: 1 },
      { id: 148, pitch: 60, startPpq: 0.25, durationPpq: 0.22, velocity: 0.8, channel: 1 },
      { id: 149, pitch: 64, startPpq: 0.5, durationPpq: 0.22, velocity: 0.84, channel: 1 },
      { id: 150, pitch: 69, startPpq: 0.75, durationPpq: 0.22, velocity: 0.9, channel: 1 },
      { id: 151, pitch: 64, startPpq: 1.0, durationPpq: 0.22, velocity: 0.81, channel: 1 },
      { id: 152, pitch: 60, startPpq: 1.25, durationPpq: 0.22, velocity: 0.79, channel: 1 },
      { id: 153, pitch: 57, startPpq: 1.5, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 154, pitch: 64, startPpq: 1.75, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 155, pitch: 69, startPpq: 2.0, durationPpq: 0.22, velocity: 0.92, channel: 1 },
      { id: 156, pitch: 72, startPpq: 2.25, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 157, pitch: 69, startPpq: 2.5, durationPpq: 0.22, velocity: 0.84, channel: 1 },
      { id: 158, pitch: 64, startPpq: 2.75, durationPpq: 0.22, velocity: 0.86, channel: 1 },
      { id: 159, pitch: 60, startPpq: 3.0, durationPpq: 0.22, velocity: 0.82, channel: 1 },
      { id: 160, pitch: 57, startPpq: 3.25, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 161, pitch: 60, startPpq: 3.5, durationPpq: 0.22, velocity: 0.87, channel: 1 },
      { id: 162, pitch: 64, startPpq: 3.75, durationPpq: 0.22, velocity: 0.89, channel: 1 },

      // Bar 2: F (F2 bass + arp)
      { id: 163, pitch: 29, startPpq: 4.0, durationPpq: 3.8, velocity: 0.94, channel: 1 },
      { id: 164, pitch: 53, startPpq: 4.0, durationPpq: 0.22, velocity: 0.84, channel: 1 },
      { id: 165, pitch: 57, startPpq: 4.25, durationPpq: 0.22, velocity: 0.82, channel: 1 },
      { id: 166, pitch: 60, startPpq: 4.5, durationPpq: 0.22, velocity: 0.86, channel: 1 },
      { id: 167, pitch: 65, startPpq: 4.75, durationPpq: 0.22, velocity: 0.91, channel: 1 },
      { id: 168, pitch: 60, startPpq: 5.0, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 169, pitch: 57, startPpq: 5.25, durationPpq: 0.22, velocity: 0.81, channel: 1 },
      { id: 170, pitch: 53, startPpq: 5.5, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 171, pitch: 65, startPpq: 5.75, durationPpq: 0.22, velocity: 0.88, channel: 1 },

      // Bar 3: C (C2 bass + arp)
      { id: 172, pitch: 36, startPpq: 8.0, durationPpq: 3.8, velocity: 0.93, channel: 1 },
      { id: 173, pitch: 55, startPpq: 8.0, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 174, pitch: 60, startPpq: 8.25, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 175, pitch: 64, startPpq: 8.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 176, pitch: 67, startPpq: 8.75, durationPpq: 0.22, velocity: 0.92, channel: 1 },
      { id: 177, pitch: 64, startPpq: 9.0, durationPpq: 0.22, velocity: 0.84, channel: 1 },
      { id: 178, pitch: 60, startPpq: 9.25, durationPpq: 0.22, velocity: 0.82, channel: 1 },

      // Bar 4: G (G1 bass + arp)
      { id: 179, pitch: 31, startPpq: 12.0, durationPpq: 3.8, velocity: 0.95, channel: 1 },
      { id: 180, pitch: 55, startPpq: 12.0, durationPpq: 0.22, velocity: 0.84, channel: 1 },
      { id: 181, pitch: 59, startPpq: 12.25, durationPpq: 0.22, velocity: 0.86, channel: 1 },
      { id: 182, pitch: 62, startPpq: 12.5, durationPpq: 0.22, velocity: 0.89, channel: 1 },
      { id: 183, pitch: 67, startPpq: 12.75, durationPpq: 0.22, velocity: 0.93, channel: 1 },
    ],
  },
  {
    name: 'Spanish Flamenco Cadence (A Phrygian)',
    bpm: 116,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: Am (Andalusian step 1)
      { id: 184, pitch: 33, startPpq: 0.0, durationPpq: 3.6, velocity: 0.88, channel: 1 }, // A1
      { id: 185, pitch: 45, startPpq: 0.0, durationPpq: 3.6, velocity: 0.78, channel: 1 }, // A2
      { id: 186, pitch: 52, startPpq: 0.0, durationPpq: 3.6, velocity: 0.8, channel: 1 },  // E3
      { id: 187, pitch: 57, startPpq: 0.0, durationPpq: 3.6, velocity: 0.82, channel: 1 }, // A3
      { id: 188, pitch: 60, startPpq: 0.0, durationPpq: 3.6, velocity: 0.85, channel: 1 }, // C4
      { id: 189, pitch: 64, startPpq: 0.0, durationPpq: 3.6, velocity: 0.89, channel: 1 }, // E4
      // Bar 2: G (Andalusian step 2)
      { id: 190, pitch: 31, startPpq: 4.0, durationPpq: 3.6, velocity: 0.86, channel: 1 }, // G1
      { id: 191, pitch: 43, startPpq: 4.0, durationPpq: 3.6, velocity: 0.77, channel: 1 }, // G2
      { id: 192, pitch: 50, startPpq: 4.0, durationPpq: 3.6, velocity: 0.79, channel: 1 }, // D3
      { id: 193, pitch: 55, startPpq: 4.0, durationPpq: 3.6, velocity: 0.81, channel: 1 }, // G3
      { id: 194, pitch: 59, startPpq: 4.0, durationPpq: 3.6, velocity: 0.84, channel: 1 }, // B3
      { id: 195, pitch: 62, startPpq: 4.0, durationPpq: 3.6, velocity: 0.87, channel: 1 }, // D4
      // Bar 3: F (Andalusian step 3 - Flat II tension)
      { id: 196, pitch: 29, startPpq: 8.0, durationPpq: 3.6, velocity: 0.9, channel: 1 },  // F1
      { id: 197, pitch: 41, startPpq: 8.0, durationPpq: 3.6, velocity: 0.8, channel: 1 },  // F2
      { id: 198, pitch: 48, startPpq: 8.0, durationPpq: 3.6, velocity: 0.82, channel: 1 }, // C3
      { id: 199, pitch: 53, startPpq: 8.0, durationPpq: 3.6, velocity: 0.84, channel: 1 }, // F3
      { id: 200, pitch: 57, startPpq: 8.0, durationPpq: 3.6, velocity: 0.86, channel: 1 }, // A3
      { id: 201, pitch: 60, startPpq: 8.0, durationPpq: 3.6, velocity: 0.9, channel: 1 },  // C4
      // Bar 4: E Major (Phrygian dominant resolution)
      { id: 202, pitch: 28, startPpq: 12.0, durationPpq: 3.8, velocity: 0.95, channel: 1 }, // E1
      { id: 203, pitch: 40, startPpq: 12.0, durationPpq: 3.8, velocity: 0.84, channel: 1 }, // E2
      { id: 204, pitch: 47, startPpq: 12.0, durationPpq: 3.8, velocity: 0.85, channel: 1 }, // B2
      { id: 205, pitch: 52, startPpq: 12.0, durationPpq: 3.8, velocity: 0.87, channel: 1 }, // E3
      { id: 206, pitch: 56, startPpq: 12.0, durationPpq: 3.8, velocity: 0.92, channel: 1 }, // G#3
      { id: 207, pitch: 59, startPpq: 12.0, durationPpq: 3.8, velocity: 0.94, channel: 1 }, // B3
      { id: 208, pitch: 64, startPpq: 12.0, durationPpq: 3.8, velocity: 0.97, channel: 1 }, // E4
    ],
  },
  {
    name: 'Funk Clavinet Groove (E Dorian)',
    bpm: 114,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: Em7 syncopated funky chops
      { id: 209, pitch: 28, startPpq: 0.0, durationPpq: 0.4, velocity: 0.95, channel: 1 }, // E1 slap
      { id: 210, pitch: 40, startPpq: 0.5, durationPpq: 0.3, velocity: 0.82, channel: 1 }, // E2
      { id: 211, pitch: 55, startPpq: 0.75, durationPpq: 0.3, velocity: 0.86, channel: 1 }, // G3
      { id: 212, pitch: 62, startPpq: 0.75, durationPpq: 0.3, velocity: 0.88, channel: 1 }, // D4
      { id: 213, pitch: 64, startPpq: 0.75, durationPpq: 0.3, velocity: 0.9, channel: 1 },  // E4
      { id: 214, pitch: 28, startPpq: 1.5, durationPpq: 0.4, velocity: 0.88, channel: 1 },
      { id: 215, pitch: 55, startPpq: 2.25, durationPpq: 0.3, velocity: 0.84, channel: 1 },
      { id: 216, pitch: 62, startPpq: 2.25, durationPpq: 0.3, velocity: 0.87, channel: 1 },
      { id: 217, pitch: 67, startPpq: 2.75, durationPpq: 0.4, velocity: 0.92, channel: 1 }, // G4
      // Bar 2: A9 chop
      { id: 218, pitch: 33, startPpq: 4.0, durationPpq: 0.4, velocity: 0.92, channel: 1 }, // A1
      { id: 219, pitch: 55, startPpq: 4.75, durationPpq: 0.35, velocity: 0.86, channel: 1 }, // G3
      { id: 220, pitch: 61, startPpq: 4.75, durationPpq: 0.35, velocity: 0.88, channel: 1 }, // C#4
      { id: 221, pitch: 64, startPpq: 4.75, durationPpq: 0.35, velocity: 0.89, channel: 1 }, // E4
      { id: 222, pitch: 69, startPpq: 4.75, durationPpq: 0.35, velocity: 0.94, channel: 1 }, // A4
      { id: 223, pitch: 33, startPpq: 6.0, durationPpq: 0.4, velocity: 0.85, channel: 1 },
      { id: 224, pitch: 55, startPpq: 6.75, durationPpq: 0.35, velocity: 0.87, channel: 1 },
      { id: 225, pitch: 61, startPpq: 6.75, durationPpq: 0.35, velocity: 0.9, channel: 1 },
      // Bar 3: Bm7 chop
      { id: 226, pitch: 35, startPpq: 8.0, durationPpq: 0.4, velocity: 0.93, channel: 1 }, // B1
      { id: 227, pitch: 57, startPpq: 8.75, durationPpq: 0.35, velocity: 0.86, channel: 1 }, // A3
      { id: 228, pitch: 62, startPpq: 8.75, durationPpq: 0.35, velocity: 0.89, channel: 1 }, // D4
      { id: 229, pitch: 66, startPpq: 8.75, durationPpq: 0.35, velocity: 0.91, channel: 1 }, // F#4
      // Bar 4: Em7 return
      { id: 230, pitch: 28, startPpq: 12.0, durationPpq: 0.4, velocity: 0.96, channel: 1 },
      { id: 231, pitch: 55, startPpq: 12.75, durationPpq: 0.35, velocity: 0.88, channel: 1 },
      { id: 232, pitch: 62, startPpq: 12.75, durationPpq: 0.35, velocity: 0.91, channel: 1 },
      { id: 233, pitch: 67, startPpq: 13.5, durationPpq: 0.5, velocity: 0.95, channel: 1 },
    ],
  },
  {
    name: 'Afrobeats & R&B Bounce (F# Minor)',
    bpm: 102,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: F#m7
      { id: 234, pitch: 42, startPpq: 0.0, durationPpq: 1.5, velocity: 0.88, channel: 1 }, // F#2
      { id: 235, pitch: 57, startPpq: 0.75, durationPpq: 1.2, velocity: 0.82, channel: 1 }, // A3
      { id: 236, pitch: 61, startPpq: 0.75, durationPpq: 1.2, velocity: 0.84, channel: 1 }, // C#4
      { id: 237, pitch: 64, startPpq: 0.75, durationPpq: 1.2, velocity: 0.86, channel: 1 }, // E4
      { id: 238, pitch: 69, startPpq: 2.25, durationPpq: 0.7, velocity: 0.89, channel: 1 }, // A4
      // Bar 2: Bm7
      { id: 239, pitch: 47, startPpq: 4.0, durationPpq: 1.5, velocity: 0.86, channel: 1 }, // B2
      { id: 240, pitch: 57, startPpq: 4.75, durationPpq: 1.2, velocity: 0.81, channel: 1 }, // A3
      { id: 241, pitch: 62, startPpq: 4.75, durationPpq: 1.2, velocity: 0.84, channel: 1 }, // D4
      { id: 242, pitch: 66, startPpq: 4.75, durationPpq: 1.2, velocity: 0.87, channel: 1 }, // F#4
      // Bar 3: C#m7
      { id: 243, pitch: 37, startPpq: 8.0, durationPpq: 1.5, velocity: 0.89, channel: 1 }, // C#2
      { id: 244, pitch: 61, startPpq: 8.75, durationPpq: 1.2, velocity: 0.83, channel: 1 }, // C#4
      { id: 245, pitch: 64, startPpq: 8.75, durationPpq: 1.2, velocity: 0.85, channel: 1 }, // E4
      { id: 246, pitch: 68, startPpq: 8.75, durationPpq: 1.2, velocity: 0.88, channel: 1 }, // G#4
      // Bar 4: Dmaj7
      { id: 247, pitch: 38, startPpq: 12.0, durationPpq: 1.5, velocity: 0.9, channel: 1 }, // D2
      { id: 248, pitch: 57, startPpq: 12.75, durationPpq: 1.2, velocity: 0.82, channel: 1 }, // A3
      { id: 249, pitch: 61, startPpq: 12.75, durationPpq: 1.2, velocity: 0.85, channel: 1 }, // C#4
      { id: 250, pitch: 66, startPpq: 12.75, durationPpq: 1.2, velocity: 0.89, channel: 1 }, // F#4
      { id: 251, pitch: 69, startPpq: 14.25, durationPpq: 1.0, velocity: 0.92, channel: 1 }, // A4
    ],
  },
];

/**
 * Parses binary ArrayBuffer of a .mid file into MidiSequence
 */
export function parseMidiFile(arrayBuffer: ArrayBuffer, fileName: string): MidiSequence {
  const data = new DataView(arrayBuffer);
  let offset = 0;

  if (data.byteLength < 14) {
    throw new Error('Not a valid MIDI file: File is too small (< 14 bytes)');
  }

  // Verify Header chunk 'MThd'
  const headerId = String.fromCharCode(
    data.getUint8(offset++),
    data.getUint8(offset++),
    data.getUint8(offset++),
    data.getUint8(offset++)
  );

  if (headerId !== 'MThd') {
    throw new Error('Not a valid MIDI file: Missing MThd header chunk');
  }

  const headerLength = data.getUint32(offset);
  offset += 4;
  // format (0 = single track, 1 = multitrack synchronous, 2 = multitrack asynchronous)
  const format = data.getUint16(offset);
  offset += 2;
  const numTracks = data.getUint16(offset);
  offset += 2;
  const timeDivision = data.getUint16(offset);
  offset += 2;

  const ticksPerQuarter = (timeDivision & 0x8000) === 0 ? Math.max(24, timeDivision) : 480;

  // Advance past any remaining header bytes in case headerLength > 6
  const headerEnd = 8 + headerLength;
  if (offset < headerEnd) {
    offset = headerEnd;
  }

  let bpm = 120;
  let timeSigNum = 4;
  let timeSigDen = 4;
  const rawEvents: Array<{ tick: number; type: 'on' | 'off'; pitch: number; vel: number; ch: number }> = [];

  // Parse all chunks in the file
  while (offset + 8 <= data.byteLength) {
    const chunkType = String.fromCharCode(
      data.getUint8(offset),
      data.getUint8(offset + 1),
      data.getUint8(offset + 2),
      data.getUint8(offset + 3)
    );
    offset += 4;
    const chunkLength = data.getUint32(offset);
    offset += 4;
    const trackEnd = Math.min(data.byteLength, offset + chunkLength);

    if (chunkType !== 'MTrk') {
      // Non-track chunk (e.g. metadata), skip to trackEnd
      offset = trackEnd;
      continue;
    }

    let currentTick = 0;
    let runningStatus = 0;

    while (offset < trackEnd && offset < data.byteLength) {
      // Read variable-length delta time
      let delta = 0;
      let b = 0;
      do {
        if (offset >= data.byteLength) break;
        b = data.getUint8(offset++);
        delta = (delta << 7) | (b & 0x7f);
      } while (b & 0x80);

      currentTick += delta;
      if (offset >= data.byteLength) break;

      let status = data.getUint8(offset);
      if (status >= 0x80) {
        offset++;
        if (status < 0xf0) {
          // Channel voice message updates running status
          runningStatus = status;
        } else {
          // Meta or SysEx event does not set running status
          runningStatus = 0;
        }
      } else {
        // Running status applies
        if (runningStatus === 0) {
          // Invalid running status, skip this byte
          offset++;
          continue;
        }
        status = runningStatus;
      }

      const msgType = status & 0xf0;
      const channel = (status & 0x0f) + 1;

      if (msgType === 0x90) {
        // Note On
        if (offset + 1 >= data.byteLength) break;
        const pitch = data.getUint8(offset++);
        const vel = data.getUint8(offset++);
        if (vel > 0) {
          rawEvents.push({ tick: currentTick, type: 'on', pitch, vel: vel / 127, ch: channel });
        } else {
          // Note On with velocity 0 is Note Off
          rawEvents.push({ tick: currentTick, type: 'off', pitch, vel: 0, ch: channel });
        }
      } else if (msgType === 0x80) {
        // Note Off
        if (offset + 1 >= data.byteLength) break;
        const pitch = data.getUint8(offset++);
        const vel = data.getUint8(offset++);
        rawEvents.push({ tick: currentTick, type: 'off', pitch, vel: vel / 127, ch: channel });
      } else if (status === 0xff) {
        // Meta event
        if (offset >= data.byteLength) break;
        const metaType = data.getUint8(offset++);
        let metaLen = 0;
        let mb = 0;
        do {
          if (offset >= data.byteLength) break;
          mb = data.getUint8(offset++);
          metaLen = (metaLen << 7) | (mb & 0x7f);
        } while (mb & 0x80);

        if (metaType === 0x51 && metaLen === 3 && offset + 2 < data.byteLength) {
          // Set Tempo: 3 bytes microseconds per quarter note
          const mpqn = (data.getUint8(offset) << 16) | (data.getUint8(offset + 1) << 8) | data.getUint8(offset + 2);
          if (mpqn > 0) {
            bpm = Math.round(60000000 / mpqn);
          }
        } else if (metaType === 0x58 && metaLen >= 2 && offset + 1 < data.byteLength) {
          // Time Signature
          timeSigNum = data.getUint8(offset);
          timeSigDen = Math.pow(2, data.getUint8(offset + 1));
        }
        offset += metaLen;
      } else if (status === 0xf0 || status === 0xf7) {
        // SysEx
        let sysLen = 0;
        let sb = 0;
        do {
          if (offset >= data.byteLength) break;
          sb = data.getUint8(offset++);
          sysLen = (sysLen << 7) | (sb & 0x7f);
        } while (sb & 0x80);
        offset += sysLen;
      } else if (msgType === 0xa0 || msgType === 0xb0 || msgType === 0xe0) {
        // Polyphonic aftertouch, CC, Pitch Bend: 2 data bytes
        offset += 2;
      } else if (msgType === 0xc0 || msgType === 0xd0) {
        // Program Change, Channel Pressure: 1 data byte
        offset += 1;
      }
    }

    offset = trackEnd;
  }

  // Sort and pair Note-On with Note-Off
  rawEvents.sort((a, b) => a.tick - b.tick);

  const notes: MidiNote[] = [];
  let nextId = 1;
  const active: Record<string, { tick: number; vel: number }> = {};
  let lastTick = 0;

  for (const ev of rawEvents) {
    const key = `${ev.ch}_${ev.pitch}`;
    lastTick = Math.max(lastTick, ev.tick);

    if (ev.type === 'on') {
      // If already active on this channel and pitch, close the earlier note
      if (active[key]) {
        const startTick = active[key].tick;
        const durationTick = Math.max(ticksPerQuarter * 0.1, ev.tick - startTick);
        notes.push({
          id: nextId++,
          pitch: ev.pitch,
          startPpq: startTick / ticksPerQuarter,
          durationPpq: durationTick / ticksPerQuarter,
          velocity: active[key].vel,
          channel: ev.ch,
        });
      }
      active[key] = { tick: ev.tick, vel: ev.vel };
    } else if (ev.type === 'off' && active[key]) {
      const startTick = active[key].tick;
      const durationTick = Math.max(ticksPerQuarter * 0.1, ev.tick - startTick);
      notes.push({
        id: nextId++,
        pitch: ev.pitch,
        startPpq: startTick / ticksPerQuarter,
        durationPpq: durationTick / ticksPerQuarter,
        velocity: active[key].vel,
        channel: ev.ch,
      });
      delete active[key];
    }
  }

  // Close any notes that were left open at the end of the sequence
  for (const key of Object.keys(active)) {
    const act = active[key];
    const [chStr, pitchStr] = key.split('_');
    const startTick = act.tick;
    const durationTick = Math.max(ticksPerQuarter * 0.25, lastTick - startTick);
    notes.push({
      id: nextId++,
      pitch: Number(pitchStr),
      startPpq: startTick / ticksPerQuarter,
      durationPpq: durationTick / ticksPerQuarter,
      velocity: act.vel,
      channel: Number(chStr),
    });
  }

  // Calculate sequence length rounded to bar boundaries
  let maxPpq = 4;
  for (const n of notes) {
    maxPpq = Math.max(maxPpq, n.startPpq + n.durationPpq);
  }
  const barPpq = (timeSigNum || 4) * (4 / (timeSigDen || 4));
  const totalLengthPpq = Math.max(barPpq, Math.ceil(maxPpq / barPpq) * barPpq);

  return {
    name: fileName.replace(/\.[^/.]+$/, ''),
    bpm: Math.min(300, Math.max(30, bpm)),
    timeSigNumerator: timeSigNum || 4,
    timeSigDenominator: timeSigDen || 4,
    totalLengthPpq,
    notes,
  };
}

/**
 * Serializes sequence with transpose, velocity scale/offset, and tempo to .mid binary
 */
export interface MidiExportConfig {
  format?: 0 | 1; // 0 = Type 0 (Single Track), 1 = Type 1 (Multi-Track)
  transpose?: number;
  velocityScale?: number;
  velocityOffset?: number;
  bpm?: number;
  trackName?: string;
}

/**
 * Serializes sequence with transpose, velocity scale/offset, and tempo to .mid binary (Type 0 or Type 1)
 */
export function serializeMidiFile(
  sequence: MidiSequence,
  transposeOrConfig?: number | MidiExportConfig,
  velocityScale = 1.0,
  velocityOffset = 0,
  bpm = 120
): Uint8Array {
  let format: 0 | 1 = 0;
  let transpose = 0;
  let velScale = velocityScale;
  let velOffset = velocityOffset;
  let exportBpm = bpm;
  let customTrackName = sequence.name || 'Midilens Sequence';

  if (typeof transposeOrConfig === 'object' && transposeOrConfig !== null) {
    format = transposeOrConfig.format ?? 0;
    transpose = transposeOrConfig.transpose ?? 0;
    velScale = transposeOrConfig.velocityScale ?? 1.0;
    velOffset = transposeOrConfig.velocityOffset ?? 0;
    exportBpm = transposeOrConfig.bpm ?? sequence.bpm ?? 120;
    if (transposeOrConfig.trackName) customTrackName = transposeOrConfig.trackName;
  } else if (typeof transposeOrConfig === 'number') {
    transpose = transposeOrConfig;
    exportBpm = bpm;
  }

  const ticksPerQuarter = 960;
  const bytes: number[] = [];

  const writeUint16 = (val: number) => {
    bytes.push((val >> 8) & 0xff, val & 0xff);
  };

  const writeUint32 = (val: number) => {
    bytes.push((val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff);
  };

  const encodeVarLength = (val: number): number[] => {
    const buffer: number[] = [];
    buffer.push(val & 0x7f);
    let shifted = val >> 7;
    while (shifted > 0) {
      buffer.push((shifted & 0x7f) | 0x80);
      shifted >>= 7;
    }
    const res: number[] = [];
    for (let i = buffer.length - 1; i >= 0; i--) {
      res.push(buffer[i]);
    }
    return res;
  };

  const encodeMetaText = (type: number, text: string): number[] => {
    const textBytes = Array.from(new TextEncoder().encode(text));
    return [...encodeVarLength(0), 0xff, type, ...encodeVarLength(textBytes.length), ...textBytes];
  };

  interface MidiRawEvent {
    tick: number;
    type: 'on' | 'off';
    pitch: number;
    velocity: number;
    channel: number;
  }

  const prepareNoteEvents = (): MidiRawEvent[] => {
    const events: MidiRawEvent[] = [];
    for (const n of sequence.notes) {
      const pitch = Math.min(127, Math.max(0, n.pitch + transpose));
      const vel = Math.min(127, Math.max(1, Math.round(n.velocity * 127 * velScale + velOffset)));
      const startTick = Math.round(n.startPpq * ticksPerQuarter);
      const endTick = Math.round((n.startPpq + n.durationPpq) * ticksPerQuarter);

      events.push({ tick: startTick, type: 'on', pitch, velocity: vel, channel: n.channel || 1 });
      events.push({ tick: endTick, type: 'off', pitch, velocity: 0, channel: n.channel || 1 });
    }
    events.sort((a, b) => a.tick - b.tick);
    return events;
  };

  const mpqn = Math.round(60000000 / Math.max(20, exportBpm));
  const denPow = Math.round(Math.log2(sequence.timeSigDenominator || 4));

  if (format === 0) {
    // Header Chunk: 'MThd', length 6, format 0, 1 track
    bytes.push(0x4d, 0x54, 0x68, 0x64);
    writeUint32(6);
    writeUint16(0); // format 0
    writeUint16(1); // 1 track
    writeUint16(ticksPerQuarter);

    // Track 0
    const trackBytes: number[] = [];
    // Track Name
    trackBytes.push(...encodeMetaText(0x03, customTrackName));

    // Tempo meta event
    trackBytes.push(...encodeVarLength(0), 0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff);

    // Time Sig meta event
    trackBytes.push(...encodeVarLength(0), 0xff, 0x58, 0x04, sequence.timeSigNumerator || 4, denPow, 24, 8);

    // Note events
    const rawEvents = prepareNoteEvents();
    let lastTick = 0;
    for (const ev of rawEvents) {
      const delta = Math.max(0, ev.tick - lastTick);
      lastTick = ev.tick;

      trackBytes.push(...encodeVarLength(delta));
      const status = (ev.type === 'on' ? 0x90 : 0x80) | ((ev.channel - 1) & 0x0f);
      trackBytes.push(status, ev.pitch, ev.velocity);
    }

    // End of Track meta event
    trackBytes.push(...encodeVarLength(ticksPerQuarter), 0xff, 0x2f, 0x00);

    // Track Chunk 'MTrk'
    bytes.push(0x4d, 0x54, 0x72, 0x6b);
    writeUint32(trackBytes.length);
    bytes.push(...trackBytes);
  } else {
    // Type 1 (Multi-Track): Track 0 = Conductor (Tempo/TimeSig), Track 1 = Notes Track
    bytes.push(0x4d, 0x54, 0x68, 0x64);
    writeUint32(6);
    writeUint16(1); // format 1
    writeUint16(2); // 2 tracks
    writeUint16(ticksPerQuarter);

    // Track 0: Conductor Track
    const conductorBytes: number[] = [];
    conductorBytes.push(...encodeMetaText(0x03, 'Conductor Track'));
    conductorBytes.push(...encodeVarLength(0), 0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff);
    conductorBytes.push(...encodeVarLength(0), 0xff, 0x58, 0x04, sequence.timeSigNumerator || 4, denPow, 24, 8);
    conductorBytes.push(...encodeVarLength(0), 0xff, 0x2f, 0x00);

    bytes.push(0x4d, 0x54, 0x72, 0x6b);
    writeUint32(conductorBytes.length);
    bytes.push(...conductorBytes);

    // Track 1: Notes Track
    const notesTrackBytes: number[] = [];
    notesTrackBytes.push(...encodeMetaText(0x03, customTrackName));

    const rawEvents = prepareNoteEvents();
    let lastTick = 0;
    for (const ev of rawEvents) {
      const delta = Math.max(0, ev.tick - lastTick);
      lastTick = ev.tick;

      notesTrackBytes.push(...encodeVarLength(delta));
      const status = (ev.type === 'on' ? 0x90 : 0x80) | ((ev.channel - 1) & 0x0f);
      notesTrackBytes.push(status, ev.pitch, ev.velocity);
    }

    notesTrackBytes.push(...encodeVarLength(ticksPerQuarter), 0xff, 0x2f, 0x00);

    bytes.push(0x4d, 0x54, 0x72, 0x6b);
    writeUint32(notesTrackBytes.length);
    bytes.push(...notesTrackBytes);
  }

  return new Uint8Array(bytes);
}
