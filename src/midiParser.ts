import { MidiNote, MidiSequence } from './types';

// Preset MIDI patterns for instant auditioning across distinct keys, genres, and voicings
export const PRESET_SEQUENCES: MidiSequence[] = [
  {
    name: 'Neo-Soul Silk Chords (C Minor)',
    pack: 'Soul, Jazz & Gospel',
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
    pack: 'Hip-Hop, Trap & Drill',
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
    pack: 'Hip-Hop, Trap & Drill',
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
    pack: 'House, Techno & Trance',
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
    pack: 'Ambient & Cinematic',
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
    pack: 'Soul, Jazz & Gospel',
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
    pack: 'Synthwave, Disco & Pop',
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
    pack: 'World & Latin Groove',
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
    pack: 'World & Latin Groove',
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
    pack: 'World & Latin Groove',
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
  {
    name: 'Ambient Ethereal Wash (Eb Major)',
    pack: 'Ambient & Cinematic',
    bpm: 68,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: Ebmaj9 lush ambient pad
      { id: 252, pitch: 39, startPpq: 0.0, durationPpq: 3.9, velocity: 0.65, channel: 1 }, // Eb2
      { id: 253, pitch: 51, startPpq: 0.1, durationPpq: 3.8, velocity: 0.62, channel: 1 }, // Eb3
      { id: 254, pitch: 58, startPpq: 0.2, durationPpq: 3.7, velocity: 0.68, channel: 1 }, // Bb3
      { id: 255, pitch: 62, startPpq: 0.3, durationPpq: 3.6, velocity: 0.72, channel: 1 }, // D4
      { id: 256, pitch: 65, startPpq: 0.4, durationPpq: 3.5, velocity: 0.75, channel: 1 }, // F4
      { id: 257, pitch: 70, startPpq: 0.5, durationPpq: 3.4, velocity: 0.78, channel: 1 }, // Bb4
      // Bar 2: Abmaj7(add9)
      { id: 258, pitch: 32, startPpq: 4.0, durationPpq: 3.9, velocity: 0.68, channel: 1 }, // Ab1
      { id: 259, pitch: 48, startPpq: 4.1, durationPpq: 3.8, velocity: 0.64, channel: 1 }, // C3
      { id: 260, pitch: 55, startPpq: 4.2, durationPpq: 3.7, velocity: 0.7, channel: 1 },  // G3
      { id: 261, pitch: 60, startPpq: 4.3, durationPpq: 3.6, velocity: 0.74, channel: 1 }, // C4
      { id: 262, pitch: 63, startPpq: 4.4, durationPpq: 3.5, velocity: 0.76, channel: 1 }, // Eb4
      { id: 263, pitch: 67, startPpq: 4.5, durationPpq: 3.4, velocity: 0.82, channel: 1 }, // G4
      // Bar 3: Cm11
      { id: 264, pitch: 36, startPpq: 8.0, durationPpq: 3.9, velocity: 0.66, channel: 1 }, // C2
      { id: 265, pitch: 48, startPpq: 8.1, durationPpq: 3.8, velocity: 0.63, channel: 1 }, // C3
      { id: 266, pitch: 55, startPpq: 8.2, durationPpq: 3.7, velocity: 0.69, channel: 1 }, // G3
      { id: 267, pitch: 58, startPpq: 8.3, durationPpq: 3.6, velocity: 0.72, channel: 1 }, // Bb3
      { id: 268, pitch: 63, startPpq: 8.4, durationPpq: 3.5, velocity: 0.76, channel: 1 }, // Eb4
      { id: 269, pitch: 65, startPpq: 8.5, durationPpq: 3.4, velocity: 0.8, channel: 1 },  // F4 (11th)
      // Bar 4: Fm9 -> Ebmaj9
      { id: 270, pitch: 29, startPpq: 12.0, durationPpq: 3.9, velocity: 0.7, channel: 1 }, // F1
      { id: 271, pitch: 48, startPpq: 12.1, durationPpq: 3.8, velocity: 0.65, channel: 1 }, // C3
      { id: 272, pitch: 53, startPpq: 12.2, durationPpq: 3.7, velocity: 0.72, channel: 1 }, // F3
      { id: 273, pitch: 56, startPpq: 12.3, durationPpq: 3.6, velocity: 0.75, channel: 1 }, // Ab3
      { id: 274, pitch: 60, startPpq: 12.4, durationPpq: 3.5, velocity: 0.78, channel: 1 }, // C4
      { id: 275, pitch: 67, startPpq: 12.5, durationPpq: 3.4, velocity: 0.84, channel: 1 }, // G4
    ],
  },
  {
    name: 'Dark Ambient Ominous Drone (C Phrygian)',
    pack: 'Ambient & Cinematic',
    bpm: 58,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Subterranean C pedal drone + dissonant b2/b6 cluster swells
      { id: 276, pitch: 24, startPpq: 0.0, durationPpq: 15.8, velocity: 0.95, channel: 1 }, // C0 Sub
      { id: 277, pitch: 36, startPpq: 0.0, durationPpq: 15.8, velocity: 0.8, channel: 1 },  // C1 Bass
      { id: 278, pitch: 48, startPpq: 0.0, durationPpq: 7.8, velocity: 0.6, channel: 1 },   // C2
      { id: 279, pitch: 49, startPpq: 2.0, durationPpq: 5.8, velocity: 0.72, channel: 1 },  // Db2 (b2 tension)
      { id: 280, pitch: 55, startPpq: 4.0, durationPpq: 7.8, velocity: 0.68, channel: 1 },  // G2
      { id: 281, pitch: 56, startPpq: 6.0, durationPpq: 9.8, velocity: 0.75, channel: 1 },  // Ab2 (b6 tension)
      { id: 282, pitch: 61, startPpq: 8.0, durationPpq: 7.8, velocity: 0.78, channel: 1 },  // Db3
      { id: 283, pitch: 62, startPpq: 10.0, durationPpq: 5.8, velocity: 0.82, channel: 1 }, // D3
      { id: 284, pitch: 67, startPpq: 12.0, durationPpq: 3.8, velocity: 0.85, channel: 1 }, // G3
      { id: 285, pitch: 71, startPpq: 14.0, durationPpq: 1.8, velocity: 0.88, channel: 1 }, // B3
    ],
  },
  {
    name: 'Synthwave Outrun Bassline (F Minor)',
    pack: 'Synthwave, Disco & Pop',
    bpm: 124,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Driving 1/16th octaved saw bass line (F1/F2, Eb1/Eb2, Db1/Db2, C1/C2)
      { id: 286, pitch: 29, startPpq: 0.0, durationPpq: 0.22, velocity: 0.95, channel: 1 },
      { id: 287, pitch: 41, startPpq: 0.25, durationPpq: 0.22, velocity: 0.82, channel: 1 },
      { id: 288, pitch: 29, startPpq: 0.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 289, pitch: 41, startPpq: 0.75, durationPpq: 0.22, velocity: 0.84, channel: 1 },
      { id: 290, pitch: 29, startPpq: 1.0, durationPpq: 0.22, velocity: 0.92, channel: 1 },
      { id: 291, pitch: 41, startPpq: 1.25, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 292, pitch: 29, startPpq: 1.5, durationPpq: 0.22, velocity: 0.89, channel: 1 },
      { id: 293, pitch: 41, startPpq: 1.75, durationPpq: 0.22, velocity: 0.86, channel: 1 },
      { id: 294, pitch: 29, startPpq: 2.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 295, pitch: 41, startPpq: 2.25, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 296, pitch: 29, startPpq: 2.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 297, pitch: 41, startPpq: 2.75, durationPpq: 0.22, velocity: 0.87, channel: 1 },
      { id: 298, pitch: 29, startPpq: 3.0, durationPpq: 0.22, velocity: 0.96, channel: 1 },
      { id: 299, pitch: 41, startPpq: 3.25, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 300, pitch: 29, startPpq: 3.5, durationPpq: 0.22, velocity: 0.9, channel: 1 },
      { id: 301, pitch: 41, startPpq: 3.75, durationPpq: 0.22, velocity: 0.89, channel: 1 },

      { id: 302, pitch: 27, startPpq: 4.0, durationPpq: 0.22, velocity: 0.95, channel: 1 },
      { id: 303, pitch: 39, startPpq: 4.25, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 304, pitch: 27, startPpq: 4.5, durationPpq: 0.22, velocity: 0.89, channel: 1 },
      { id: 305, pitch: 39, startPpq: 4.75, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 306, pitch: 27, startPpq: 5.0, durationPpq: 0.22, velocity: 0.92, channel: 1 },
      { id: 307, pitch: 39, startPpq: 5.25, durationPpq: 0.22, velocity: 0.84, channel: 1 },
      { id: 308, pitch: 27, startPpq: 5.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 309, pitch: 39, startPpq: 5.75, durationPpq: 0.22, velocity: 0.87, channel: 1 },
      { id: 310, pitch: 27, startPpq: 6.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 311, pitch: 39, startPpq: 6.25, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 312, pitch: 27, startPpq: 6.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 313, pitch: 39, startPpq: 6.75, durationPpq: 0.22, velocity: 0.87, channel: 1 },
      { id: 314, pitch: 27, startPpq: 7.0, durationPpq: 0.22, velocity: 0.96, channel: 1 },
      { id: 315, pitch: 39, startPpq: 7.25, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 316, pitch: 27, startPpq: 7.5, durationPpq: 0.22, velocity: 0.9, channel: 1 },
      { id: 317, pitch: 39, startPpq: 7.75, durationPpq: 0.22, velocity: 0.89, channel: 1 },

      { id: 318, pitch: 25, startPpq: 8.0, durationPpq: 0.22, velocity: 0.95, channel: 1 },
      { id: 319, pitch: 37, startPpq: 8.25, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 320, pitch: 25, startPpq: 8.5, durationPpq: 0.22, velocity: 0.89, channel: 1 },
      { id: 321, pitch: 37, startPpq: 8.75, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 322, pitch: 25, startPpq: 9.0, durationPpq: 0.22, velocity: 0.92, channel: 1 },
      { id: 323, pitch: 37, startPpq: 9.25, durationPpq: 0.22, velocity: 0.84, channel: 1 },
      { id: 324, pitch: 25, startPpq: 9.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 325, pitch: 37, startPpq: 9.75, durationPpq: 0.22, velocity: 0.87, channel: 1 },
      { id: 326, pitch: 25, startPpq: 10.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 327, pitch: 37, startPpq: 10.25, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 328, pitch: 25, startPpq: 10.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 329, pitch: 37, startPpq: 10.75, durationPpq: 0.22, velocity: 0.87, channel: 1 },
      { id: 330, pitch: 25, startPpq: 11.0, durationPpq: 0.22, velocity: 0.96, channel: 1 },
      { id: 331, pitch: 37, startPpq: 11.25, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 332, pitch: 25, startPpq: 11.5, durationPpq: 0.22, velocity: 0.9, channel: 1 },
      { id: 333, pitch: 37, startPpq: 11.75, durationPpq: 0.22, velocity: 0.89, channel: 1 },

      { id: 334, pitch: 24, startPpq: 12.0, durationPpq: 0.22, velocity: 0.95, channel: 1 },
      { id: 335, pitch: 36, startPpq: 12.25, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 336, pitch: 24, startPpq: 12.5, durationPpq: 0.22, velocity: 0.89, channel: 1 },
      { id: 337, pitch: 36, startPpq: 12.75, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 338, pitch: 24, startPpq: 13.0, durationPpq: 0.22, velocity: 0.92, channel: 1 },
      { id: 339, pitch: 36, startPpq: 13.25, durationPpq: 0.22, velocity: 0.84, channel: 1 },
      { id: 340, pitch: 24, startPpq: 13.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 341, pitch: 36, startPpq: 13.75, durationPpq: 0.22, velocity: 0.87, channel: 1 },
      { id: 342, pitch: 24, startPpq: 14.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 343, pitch: 36, startPpq: 14.25, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 344, pitch: 24, startPpq: 14.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 345, pitch: 36, startPpq: 14.75, durationPpq: 0.22, velocity: 0.87, channel: 1 },
      { id: 346, pitch: 24, startPpq: 15.0, durationPpq: 0.22, velocity: 0.96, channel: 1 },
      { id: 347, pitch: 36, startPpq: 15.25, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 348, pitch: 24, startPpq: 15.5, durationPpq: 0.22, velocity: 0.9, channel: 1 },
      { id: 349, pitch: 36, startPpq: 15.75, durationPpq: 0.22, velocity: 0.89, channel: 1 },
    ],
  },
  {
    name: 'Deep House Velvet Chords (A Minor)',
    pack: 'House, Techno & Trance',
    bpm: 122,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Syncopated 90s Deep House Rhodes Chords (Am9, Dm9, Em9, Fmaj7)
      { id: 350, pitch: 33, startPpq: 0.0, durationPpq: 0.8, velocity: 0.9, channel: 1 },  // A1
      { id: 351, pitch: 57, startPpq: 0.0, durationPpq: 0.8, velocity: 0.8, channel: 1 },  // A3
      { id: 352, pitch: 60, startPpq: 0.0, durationPpq: 0.8, velocity: 0.82, channel: 1 }, // C4
      { id: 353, pitch: 64, startPpq: 0.0, durationPpq: 0.8, velocity: 0.85, channel: 1 }, // E4
      { id: 354, pitch: 67, startPpq: 0.0, durationPpq: 0.8, velocity: 0.88, channel: 1 }, // G4
      { id: 355, pitch: 71, startPpq: 0.0, durationPpq: 0.8, velocity: 0.92, channel: 1 }, // B4

      { id: 356, pitch: 57, startPpq: 1.5, durationPpq: 0.8, velocity: 0.82, channel: 1 },
      { id: 357, pitch: 60, startPpq: 1.5, durationPpq: 0.8, velocity: 0.84, channel: 1 },
      { id: 358, pitch: 64, startPpq: 1.5, durationPpq: 0.8, velocity: 0.86, channel: 1 },
      { id: 359, pitch: 67, startPpq: 1.5, durationPpq: 0.8, velocity: 0.89, channel: 1 },
      { id: 360, pitch: 71, startPpq: 1.5, durationPpq: 0.8, velocity: 0.91, channel: 1 },

      { id: 361, pitch: 57, startPpq: 2.75, durationPpq: 1.0, velocity: 0.85, channel: 1 },
      { id: 362, pitch: 60, startPpq: 2.75, durationPpq: 1.0, velocity: 0.86, channel: 1 },
      { id: 363, pitch: 64, startPpq: 2.75, durationPpq: 1.0, velocity: 0.88, channel: 1 },
      { id: 364, pitch: 67, startPpq: 2.75, durationPpq: 1.0, velocity: 0.9, channel: 1 },
      { id: 365, pitch: 71, startPpq: 2.75, durationPpq: 1.0, velocity: 0.93, channel: 1 },

      { id: 366, pitch: 38, startPpq: 4.0, durationPpq: 0.8, velocity: 0.88, channel: 1 }, // D2
      { id: 367, pitch: 57, startPpq: 4.0, durationPpq: 0.8, velocity: 0.81, channel: 1 },
      { id: 368, pitch: 60, startPpq: 4.0, durationPpq: 0.8, velocity: 0.83, channel: 1 },
      { id: 369, pitch: 65, startPpq: 4.0, durationPpq: 0.8, velocity: 0.86, channel: 1 },
      { id: 370, pitch: 69, startPpq: 4.0, durationPpq: 0.8, velocity: 0.89, channel: 1 },

      { id: 371, pitch: 57, startPpq: 5.5, durationPpq: 0.8, velocity: 0.82, channel: 1 },
      { id: 372, pitch: 60, startPpq: 5.5, durationPpq: 0.8, velocity: 0.84, channel: 1 },
      { id: 373, pitch: 65, startPpq: 5.5, durationPpq: 0.8, velocity: 0.87, channel: 1 },
      { id: 374, pitch: 69, startPpq: 5.5, durationPpq: 0.8, velocity: 0.9, channel: 1 },

      { id: 375, pitch: 40, startPpq: 8.0, durationPpq: 0.8, velocity: 0.9, channel: 1 },  // E2
      { id: 376, pitch: 59, startPpq: 8.0, durationPpq: 0.8, velocity: 0.82, channel: 1 },
      { id: 377, pitch: 62, startPpq: 8.0, durationPpq: 0.8, velocity: 0.84, channel: 1 },
      { id: 378, pitch: 67, startPpq: 8.0, durationPpq: 0.8, velocity: 0.87, channel: 1 },
      { id: 379, pitch: 71, startPpq: 8.0, durationPpq: 0.8, velocity: 0.9, channel: 1 },

      { id: 380, pitch: 41, startPpq: 12.0, durationPpq: 1.8, velocity: 0.91, channel: 1 }, // F2
      { id: 381, pitch: 60, startPpq: 12.0, durationPpq: 1.8, velocity: 0.84, channel: 1 },
      { id: 382, pitch: 64, startPpq: 12.0, durationPpq: 1.8, velocity: 0.86, channel: 1 },
      { id: 383, pitch: 67, startPpq: 12.0, durationPpq: 1.8, velocity: 0.89, channel: 1 },

      { id: 384, pitch: 40, startPpq: 14.0, durationPpq: 1.8, velocity: 0.93, channel: 1 }, // E2
      { id: 385, pitch: 58, startPpq: 14.0, durationPpq: 1.8, velocity: 0.85, channel: 1 },
      { id: 386, pitch: 62, startPpq: 14.0, durationPpq: 1.8, velocity: 0.88, channel: 1 },
      { id: 387, pitch: 68, startPpq: 14.0, durationPpq: 1.8, velocity: 0.92, channel: 1 },
    ],
  },
  {
    name: 'Berlin Hypnotic Techno Loop (C Minor)',
    pack: 'House, Techno & Trance',
    bpm: 132,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Driving 132 BPM peak-hour techno synth loop in C Minor
      { id: 388, pitch: 36, startPpq: 0.0, durationPpq: 0.22, velocity: 0.98, channel: 1 }, // C2 accent
      { id: 389, pitch: 48, startPpq: 0.25, durationPpq: 0.22, velocity: 0.75, channel: 1 }, // C3
      { id: 390, pitch: 51, startPpq: 0.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },  // Eb3
      { id: 391, pitch: 36, startPpq: 0.75, durationPpq: 0.22, velocity: 0.7, channel: 1 },
      { id: 392, pitch: 55, startPpq: 1.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },  // G3
      { id: 393, pitch: 48, startPpq: 1.25, durationPpq: 0.22, velocity: 0.72, channel: 1 },
      { id: 394, pitch: 58, startPpq: 1.5, durationPpq: 0.22, velocity: 0.86, channel: 1 },  // Bb3
      { id: 395, pitch: 51, startPpq: 1.75, durationPpq: 0.22, velocity: 0.78, channel: 1 },
      { id: 396, pitch: 36, startPpq: 2.0, durationPpq: 0.22, velocity: 0.96, channel: 1 },
      { id: 397, pitch: 60, startPpq: 2.25, durationPpq: 0.22, velocity: 0.82, channel: 1 }, // C4
      { id: 398, pitch: 58, startPpq: 2.5, durationPpq: 0.22, velocity: 0.85, channel: 1 },
      { id: 399, pitch: 55, startPpq: 2.75, durationPpq: 0.22, velocity: 0.79, channel: 1 },
      { id: 400, pitch: 51, startPpq: 3.0, durationPpq: 0.22, velocity: 0.92, channel: 1 },
      { id: 401, pitch: 48, startPpq: 3.25, durationPpq: 0.22, velocity: 0.74, channel: 1 },

      { id: 402, pitch: 39, startPpq: 4.0, durationPpq: 0.22, velocity: 0.98, channel: 1 }, // Eb2
      { id: 403, pitch: 51, startPpq: 4.25, durationPpq: 0.22, velocity: 0.75, channel: 1 },
      { id: 404, pitch: 55, startPpq: 4.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 405, pitch: 39, startPpq: 4.75, durationPpq: 0.22, velocity: 0.7, channel: 1 },
      { id: 406, pitch: 58, startPpq: 5.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 407, pitch: 51, startPpq: 5.25, durationPpq: 0.22, velocity: 0.72, channel: 1 },
      { id: 408, pitch: 62, startPpq: 5.5, durationPpq: 0.22, velocity: 0.86, channel: 1 }, // D4
      { id: 409, pitch: 55, startPpq: 5.75, durationPpq: 0.22, velocity: 0.78, channel: 1 },

      { id: 410, pitch: 41, startPpq: 8.0, durationPpq: 0.22, velocity: 0.98, channel: 1 }, // F2
      { id: 411, pitch: 53, startPpq: 8.25, durationPpq: 0.22, velocity: 0.75, channel: 1 },
      { id: 412, pitch: 56, startPpq: 8.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 413, pitch: 41, startPpq: 8.75, durationPpq: 0.22, velocity: 0.7, channel: 1 },
      { id: 414, pitch: 60, startPpq: 9.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 415, pitch: 53, startPpq: 9.25, durationPpq: 0.22, velocity: 0.72, channel: 1 },
      { id: 416, pitch: 65, startPpq: 9.5, durationPpq: 0.22, velocity: 0.86, channel: 1 }, // F4

      { id: 417, pitch: 43, startPpq: 12.0, durationPpq: 0.22, velocity: 0.98, channel: 1 }, // G2
      { id: 418, pitch: 55, startPpq: 12.25, durationPpq: 0.22, velocity: 0.75, channel: 1 },
      { id: 419, pitch: 58, startPpq: 12.5, durationPpq: 0.22, velocity: 0.88, channel: 1 },
      { id: 420, pitch: 43, startPpq: 12.75, durationPpq: 0.22, velocity: 0.7, channel: 1 },
      { id: 421, pitch: 62, startPpq: 13.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 422, pitch: 55, startPpq: 13.25, durationPpq: 0.22, velocity: 0.72, channel: 1 },
      { id: 423, pitch: 67, startPpq: 13.5, durationPpq: 0.22, velocity: 0.86, channel: 1 }, // G4
    ],
  },
  {
    name: 'Acid 303 Resonant Line (D Minor)',
    pack: 'House, Techno & Trance',
    bpm: 130,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Iconic 303 squelch acid line in D Minor with slides & accents
      { id: 424, pitch: 38, startPpq: 0.0, durationPpq: 0.45, velocity: 0.98, channel: 1 }, // D2 Accent
      { id: 425, pitch: 38, startPpq: 0.5, durationPpq: 0.22, velocity: 0.65, channel: 1 }, // D2
      { id: 426, pitch: 50, startPpq: 0.75, durationPpq: 0.45, velocity: 0.9, channel: 1 },  // D3 Accent slide
      { id: 427, pitch: 41, startPpq: 1.25, durationPpq: 0.22, velocity: 0.7, channel: 1 },  // F2
      { id: 428, pitch: 38, startPpq: 1.5, durationPpq: 0.45, velocity: 0.88, channel: 1 }, // D2
      { id: 429, pitch: 45, startPpq: 2.0, durationPpq: 0.45, velocity: 0.92, channel: 1 }, // A2
      { id: 430, pitch: 53, startPpq: 2.5, durationPpq: 0.45, velocity: 0.96, channel: 1 }, // F3 Accent slide
      { id: 431, pitch: 50, startPpq: 3.0, durationPpq: 0.45, velocity: 0.84, channel: 1 }, // D3
      { id: 432, pitch: 48, startPpq: 3.5, durationPpq: 0.45, velocity: 0.8, channel: 1 },  // C3

      { id: 433, pitch: 38, startPpq: 4.0, durationPpq: 0.45, velocity: 0.98, channel: 1 },
      { id: 434, pitch: 38, startPpq: 4.5, durationPpq: 0.22, velocity: 0.65, channel: 1 },
      { id: 435, pitch: 57, startPpq: 4.75, durationPpq: 0.45, velocity: 0.92, channel: 1 }, // A3 Accent slide
      { id: 436, pitch: 41, startPpq: 5.25, durationPpq: 0.22, velocity: 0.72, channel: 1 },
      { id: 437, pitch: 38, startPpq: 5.5, durationPpq: 0.45, velocity: 0.88, channel: 1 },
      { id: 438, pitch: 48, startPpq: 6.0, durationPpq: 0.45, velocity: 0.94, channel: 1 }, // C3
      { id: 439, pitch: 55, startPpq: 6.5, durationPpq: 0.45, velocity: 0.96, channel: 1 }, // G3 Accent slide
      { id: 440, pitch: 53, startPpq: 7.0, durationPpq: 0.45, velocity: 0.86, channel: 1 }, // F3
      { id: 441, pitch: 50, startPpq: 7.5, durationPpq: 0.45, velocity: 0.82, channel: 1 }, // D3

      { id: 442, pitch: 38, startPpq: 8.0, durationPpq: 0.45, velocity: 0.98, channel: 1 },
      { id: 443, pitch: 38, startPpq: 8.5, durationPpq: 0.22, velocity: 0.65, channel: 1 },
      { id: 444, pitch: 50, startPpq: 8.75, durationPpq: 0.45, velocity: 0.9, channel: 1 },
      { id: 445, pitch: 41, startPpq: 9.25, durationPpq: 0.22, velocity: 0.7, channel: 1 },
      { id: 446, pitch: 38, startPpq: 9.5, durationPpq: 0.45, velocity: 0.88, channel: 1 },
      { id: 447, pitch: 45, startPpq: 10.0, durationPpq: 0.45, velocity: 0.92, channel: 1 },
      { id: 448, pitch: 53, startPpq: 10.5, durationPpq: 0.45, velocity: 0.96, channel: 1 },
      { id: 449, pitch: 50, startPpq: 11.0, durationPpq: 0.45, velocity: 0.84, channel: 1 },

      { id: 450, pitch: 38, startPpq: 12.0, durationPpq: 0.45, velocity: 0.98, channel: 1 },
      { id: 451, pitch: 50, startPpq: 12.5, durationPpq: 0.45, velocity: 0.95, channel: 1 },
      { id: 452, pitch: 62, startPpq: 13.0, durationPpq: 0.45, velocity: 0.98, channel: 1 }, // D4 High Accent
      { id: 453, pitch: 57, startPpq: 13.5, durationPpq: 0.45, velocity: 0.88, channel: 1 },
      { id: 454, pitch: 53, startPpq: 14.0, durationPpq: 0.45, velocity: 0.9, channel: 1 },
      { id: 455, pitch: 50, startPpq: 14.5, durationPpq: 0.45, velocity: 0.85, channel: 1 },
    ],
  },
  {
    name: 'Gospel Passing Chords (Ab Major)',
    pack: 'Soul, Jazz & Gospel',
    bpm: 76,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: AbMaj9 -> C7b9 passing
      { id: 456, pitch: 44, startPpq: 0.0, durationPpq: 2.3, velocity: 0.86, channel: 1 }, // Ab2
      { id: 457, pitch: 60, startPpq: 0.02, durationPpq: 2.2, velocity: 0.74, channel: 1 }, // C4
      { id: 458, pitch: 63, startPpq: 0.04, durationPpq: 2.2, velocity: 0.76, channel: 1 }, // Eb4
      { id: 459, pitch: 67, startPpq: 0.06, durationPpq: 2.2, velocity: 0.8, channel: 1 }, // G4
      { id: 460, pitch: 70, startPpq: 0.08, durationPpq: 2.2, velocity: 0.84, channel: 1 }, // Bb4
      { id: 461, pitch: 36, startPpq: 2.5, durationPpq: 1.4, velocity: 0.84, channel: 1 }, // C2
      { id: 462, pitch: 58, startPpq: 2.5, durationPpq: 1.4, velocity: 0.76, channel: 1 }, // Bb3
      { id: 463, pitch: 61, startPpq: 2.5, durationPpq: 1.4, velocity: 0.78, channel: 1 }, // Db4
      { id: 464, pitch: 64, startPpq: 2.5, durationPpq: 1.4, velocity: 0.82, channel: 1 }, // E4
      { id: 465, pitch: 67, startPpq: 2.5, durationPpq: 1.4, velocity: 0.85, channel: 1 }, // G4
      // Bar 2: Fm11 -> Eb/G -> AbMaj7
      { id: 466, pitch: 41, startPpq: 4.0, durationPpq: 2.3, velocity: 0.88, channel: 1 }, // F2
      { id: 467, pitch: 60, startPpq: 4.0, durationPpq: 2.2, velocity: 0.75, channel: 1 }, // C4
      { id: 468, pitch: 63, startPpq: 4.0, durationPpq: 2.2, velocity: 0.78, channel: 1 }, // Eb4
      { id: 469, pitch: 68, startPpq: 4.0, durationPpq: 2.2, velocity: 0.82, channel: 1 }, // Ab4
      { id: 470, pitch: 70, startPpq: 4.0, durationPpq: 2.2, velocity: 0.86, channel: 1 }, // Bb4
      { id: 471, pitch: 43, startPpq: 6.5, durationPpq: 1.4, velocity: 0.83, channel: 1 }, // G2
      { id: 472, pitch: 58, startPpq: 6.5, durationPpq: 1.4, velocity: 0.75, channel: 1 }, // Bb3
      { id: 473, pitch: 63, startPpq: 6.5, durationPpq: 1.4, velocity: 0.79, channel: 1 }, // Eb4
      { id: 474, pitch: 67, startPpq: 6.5, durationPpq: 1.4, velocity: 0.84, channel: 1 }, // G4
      // Bar 3: Bbm9 -> Adim7 chromatic walk
      { id: 475, pitch: 46, startPpq: 8.0, durationPpq: 2.3, velocity: 0.87, channel: 1 }, // Bb2
      { id: 476, pitch: 61, startPpq: 8.0, durationPpq: 2.2, velocity: 0.76, channel: 1 }, // Db4
      { id: 477, pitch: 65, startPpq: 8.0, durationPpq: 2.2, velocity: 0.78, channel: 1 }, // F4
      { id: 478, pitch: 68, startPpq: 8.0, durationPpq: 2.2, velocity: 0.82, channel: 1 }, // Ab4
      { id: 479, pitch: 72, startPpq: 8.0, durationPpq: 2.2, velocity: 0.86, channel: 1 }, // C5
      { id: 480, pitch: 45, startPpq: 10.5, durationPpq: 1.4, velocity: 0.85, channel: 1 }, // A2
      { id: 481, pitch: 60, startPpq: 10.5, durationPpq: 1.4, velocity: 0.77, channel: 1 }, // C4
      { id: 482, pitch: 63, startPpq: 10.5, durationPpq: 1.4, velocity: 0.79, channel: 1 }, // Eb4
      { id: 483, pitch: 66, startPpq: 10.5, durationPpq: 1.4, velocity: 0.83, channel: 1 }, // Gb4
      // Bar 4: Eb13sus4 -> Eb7b9 turnaround
      { id: 484, pitch: 39, startPpq: 12.0, durationPpq: 2.0, velocity: 0.89, channel: 1 }, // Eb2
      { id: 485, pitch: 58, startPpq: 12.0, durationPpq: 2.0, velocity: 0.76, channel: 1 }, // Bb3
      { id: 486, pitch: 61, startPpq: 12.0, durationPpq: 2.0, velocity: 0.79, channel: 1 }, // Db4
      { id: 487, pitch: 65, startPpq: 12.0, durationPpq: 2.0, velocity: 0.82, channel: 1 }, // F4
      { id: 488, pitch: 68, startPpq: 12.0, durationPpq: 2.0, velocity: 0.86, channel: 1 }, // Ab4
      { id: 489, pitch: 72, startPpq: 12.0, durationPpq: 2.0, velocity: 0.89, channel: 1 }, // C5
      { id: 490, pitch: 61, startPpq: 14.25, durationPpq: 1.6, velocity: 0.82, channel: 1 }, // Db4
      { id: 491, pitch: 64, startPpq: 14.25, durationPpq: 1.6, velocity: 0.84, channel: 1 }, // E4
      { id: 492, pitch: 67, startPpq: 14.25, durationPpq: 1.6, velocity: 0.87, channel: 1 }, // G4
      { id: 493, pitch: 70, startPpq: 14.25, durationPpq: 1.6, velocity: 0.9, channel: 1 }, // Bb4
    ],
  },
  {
    name: 'Modern Trap Soul Keys (F# Minor)',
    pack: 'Soul, Jazz & Gospel',
    bpm: 112,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: F#m11 moody late-night Rhodes
      { id: 494, pitch: 42, startPpq: 0.0, durationPpq: 3.7, velocity: 0.84, channel: 1 }, // F#2
      { id: 495, pitch: 57, startPpq: 0.04, durationPpq: 3.6, velocity: 0.7, channel: 1 }, // A3
      { id: 496, pitch: 61, startPpq: 0.08, durationPpq: 3.6, velocity: 0.72, channel: 1 }, // C#4
      { id: 497, pitch: 64, startPpq: 0.12, durationPpq: 3.5, velocity: 0.76, channel: 1 }, // E4
      { id: 498, pitch: 71, startPpq: 0.16, durationPpq: 3.5, velocity: 0.82, channel: 1 }, // B4
      { id: 499, pitch: 76, startPpq: 2.5, durationPpq: 1.2, velocity: 0.78, channel: 1 }, // E5 melody touch
      // Bar 2: Dmaj9
      { id: 500, pitch: 38, startPpq: 4.0, durationPpq: 3.7, velocity: 0.85, channel: 1 }, // D2
      { id: 501, pitch: 57, startPpq: 4.04, durationPpq: 3.6, velocity: 0.71, channel: 1 }, // A3
      { id: 502, pitch: 61, startPpq: 4.08, durationPpq: 3.6, velocity: 0.74, channel: 1 }, // C#4
      { id: 503, pitch: 66, startPpq: 4.12, durationPpq: 3.5, velocity: 0.77, channel: 1 }, // F#4
      { id: 504, pitch: 64, startPpq: 4.16, durationPpq: 3.5, velocity: 0.8, channel: 1 }, // E4
      { id: 505, pitch: 73, startPpq: 6.75, durationPpq: 1.0, velocity: 0.8, channel: 1 }, // C#5
      // Bar 3: Bm9
      { id: 506, pitch: 35, startPpq: 8.0, durationPpq: 3.7, velocity: 0.86, channel: 1 }, // B1
      { id: 507, pitch: 57, startPpq: 8.04, durationPpq: 3.6, velocity: 0.72, channel: 1 }, // A3
      { id: 508, pitch: 61, startPpq: 8.08, durationPpq: 3.6, velocity: 0.75, channel: 1 }, // C#4
      { id: 509, pitch: 62, startPpq: 8.12, durationPpq: 3.5, velocity: 0.78, channel: 1 }, // D4
      { id: 510, pitch: 66, startPpq: 8.16, durationPpq: 3.5, velocity: 0.82, channel: 1 }, // F#4
      // Bar 4: C#m7 -> G#dim
      { id: 511, pitch: 37, startPpq: 12.0, durationPpq: 2.3, velocity: 0.86, channel: 1 }, // C#2
      { id: 512, pitch: 56, startPpq: 12.04, durationPpq: 2.2, velocity: 0.73, channel: 1 }, // G#3
      { id: 513, pitch: 59, startPpq: 12.08, durationPpq: 2.2, velocity: 0.76, channel: 1 }, // B3
      { id: 514, pitch: 64, startPpq: 12.12, durationPpq: 2.2, velocity: 0.81, channel: 1 }, // E4
      { id: 515, pitch: 68, startPpq: 14.5, durationPpq: 1.3, velocity: 0.84, channel: 1 }, // G#4
      { id: 516, pitch: 71, startPpq: 14.5, durationPpq: 1.3, velocity: 0.86, channel: 1 }, // B4
    ],
  },
  {
    name: '90s Boom Bap Rhodes (D Minor)',
    pack: 'Hip-Hop, Trap & Drill',
    bpm: 90,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Dusty swung boom bap sample chops: Dm9 -> Gm9 -> BbMaj7 -> A7alt
      { id: 517, pitch: 38, startPpq: 0.0, durationPpq: 1.4, velocity: 0.88, channel: 1 }, // D2
      { id: 518, pitch: 60, startPpq: 0.02, durationPpq: 1.4, velocity: 0.78, channel: 1 }, // C4
      { id: 519, pitch: 64, startPpq: 0.04, durationPpq: 1.4, velocity: 0.8, channel: 1 }, // E4
      { id: 520, pitch: 65, startPpq: 0.06, durationPpq: 1.4, velocity: 0.82, channel: 1 }, // F4
      { id: 521, pitch: 69, startPpq: 0.08, durationPpq: 1.4, velocity: 0.85, channel: 1 }, // A4
      { id: 522, pitch: 60, startPpq: 1.75, durationPpq: 0.45, velocity: 0.72, channel: 1 },
      { id: 523, pitch: 64, startPpq: 1.75, durationPpq: 0.45, velocity: 0.74, channel: 1 },
      { id: 524, pitch: 69, startPpq: 1.75, durationPpq: 0.45, velocity: 0.77, channel: 1 },
      { id: 525, pitch: 38, startPpq: 2.5, durationPpq: 1.1, velocity: 0.84, channel: 1 },
      { id: 526, pitch: 60, startPpq: 2.52, durationPpq: 1.1, velocity: 0.79, channel: 1 },
      { id: 527, pitch: 65, startPpq: 2.54, durationPpq: 1.1, velocity: 0.82, channel: 1 },
      // Bar 2: Gm9
      { id: 528, pitch: 43, startPpq: 4.0, durationPpq: 1.4, velocity: 0.87, channel: 1 }, // G2
      { id: 529, pitch: 58, startPpq: 4.02, durationPpq: 1.4, velocity: 0.77, channel: 1 }, // Bb3
      { id: 530, pitch: 62, startPpq: 4.04, durationPpq: 1.4, velocity: 0.8, channel: 1 }, // D4
      { id: 531, pitch: 65, startPpq: 4.06, durationPpq: 1.4, velocity: 0.82, channel: 1 }, // F4
      { id: 532, pitch: 69, startPpq: 4.08, durationPpq: 1.4, velocity: 0.85, channel: 1 }, // A4
      { id: 533, pitch: 58, startPpq: 6.5, durationPpq: 1.1, velocity: 0.79, channel: 1 },
      { id: 534, pitch: 62, startPpq: 6.5, durationPpq: 1.1, velocity: 0.81, channel: 1 },
      { id: 535, pitch: 69, startPpq: 6.5, durationPpq: 1.1, velocity: 0.84, channel: 1 },
      // Bar 3: BbMaj7
      { id: 536, pitch: 34, startPpq: 8.0, durationPpq: 2.2, velocity: 0.89, channel: 1 }, // Bb1
      { id: 537, pitch: 58, startPpq: 8.02, durationPpq: 2.2, velocity: 0.78, channel: 1 },
      { id: 538, pitch: 62, startPpq: 8.04, durationPpq: 2.2, velocity: 0.8, channel: 1 },
      { id: 539, pitch: 65, startPpq: 8.06, durationPpq: 2.2, velocity: 0.83, channel: 1 },
      { id: 540, pitch: 69, startPpq: 8.08, durationPpq: 2.2, velocity: 0.86, channel: 1 },
      // Bar 4: A7#5
      { id: 541, pitch: 33, startPpq: 12.0, durationPpq: 2.0, velocity: 0.9, channel: 1 }, // A1
      { id: 542, pitch: 55, startPpq: 12.0, durationPpq: 2.0, velocity: 0.79, channel: 1 }, // G3
      { id: 543, pitch: 61, startPpq: 12.0, durationPpq: 2.0, velocity: 0.82, channel: 1 }, // C#4
      { id: 544, pitch: 65, startPpq: 12.0, durationPpq: 2.0, velocity: 0.85, channel: 1 }, // F4 (#5)
      { id: 545, pitch: 60, startPpq: 14.75, durationPpq: 0.9, velocity: 0.82, channel: 1 }, // C4 (#9)
    ],
  },
  {
    name: 'West Coast G-Funk Lead (G Minor)',
    pack: 'Hip-Hop, Trap & Drill',
    bpm: 96,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Funky G1/G2 octave bass + iconic high sine whistle topline
      { id: 546, pitch: 31, startPpq: 0.0, durationPpq: 0.8, velocity: 0.94, channel: 1 }, // G1
      { id: 547, pitch: 43, startPpq: 1.0, durationPpq: 0.4, velocity: 0.86, channel: 1 }, // G2
      { id: 548, pitch: 31, startPpq: 1.5, durationPpq: 0.8, velocity: 0.9, channel: 1 }, // G1
      { id: 549, pitch: 41, startPpq: 3.0, durationPpq: 0.4, velocity: 0.85, channel: 1 }, // F2
      { id: 550, pitch: 43, startPpq: 3.5, durationPpq: 0.4, velocity: 0.88, channel: 1 }, // G2
      { id: 551, pitch: 79, startPpq: 0.0, durationPpq: 0.9, velocity: 0.84, channel: 1 }, // G5 whistle
      { id: 552, pitch: 82, startPpq: 1.0, durationPpq: 0.9, velocity: 0.88, channel: 1 }, // Bb5
      { id: 553, pitch: 84, startPpq: 2.0, durationPpq: 0.7, velocity: 0.9, channel: 1 }, // C6
      { id: 554, pitch: 86, startPpq: 2.75, durationPpq: 1.1, velocity: 0.92, channel: 1 }, // D6

      // Bar 2: Eb bass + whistle descent
      { id: 555, pitch: 27, startPpq: 4.0, durationPpq: 0.8, velocity: 0.93, channel: 1 }, // Eb1
      { id: 556, pitch: 39, startPpq: 5.0, durationPpq: 0.4, velocity: 0.85, channel: 1 }, // Eb2
      { id: 557, pitch: 27, startPpq: 5.5, durationPpq: 0.8, velocity: 0.89, channel: 1 },
      { id: 558, pitch: 82, startPpq: 4.5, durationPpq: 0.9, velocity: 0.86, channel: 1 }, // Bb5
      { id: 559, pitch: 79, startPpq: 5.5, durationPpq: 1.4, velocity: 0.88, channel: 1 }, // G5
      { id: 560, pitch: 77, startPpq: 7.0, durationPpq: 0.8, velocity: 0.84, channel: 1 }, // F5

      // Bar 3: Cm bass + whistle bounce
      { id: 561, pitch: 36, startPpq: 8.0, durationPpq: 0.8, velocity: 0.94, channel: 1 }, // C2
      { id: 562, pitch: 48, startPpq: 9.0, durationPpq: 0.4, velocity: 0.86, channel: 1 }, // C3
      { id: 563, pitch: 36, startPpq: 9.5, durationPpq: 0.8, velocity: 0.9, channel: 1 },
      { id: 564, pitch: 79, startPpq: 8.0, durationPpq: 0.9, velocity: 0.85, channel: 1 }, // G5
      { id: 565, pitch: 84, startPpq: 9.0, durationPpq: 1.2, velocity: 0.91, channel: 1 }, // C6
      { id: 566, pitch: 82, startPpq: 10.5, durationPpq: 1.2, velocity: 0.87, channel: 1 }, // Bb5

      // Bar 4: D7 turnaround
      { id: 567, pitch: 38, startPpq: 12.0, durationPpq: 0.8, velocity: 0.95, channel: 1 }, // D2
      { id: 568, pitch: 50, startPpq: 13.0, durationPpq: 0.4, velocity: 0.87, channel: 1 }, // D3
      { id: 569, pitch: 81, startPpq: 12.0, durationPpq: 1.4, velocity: 0.89, channel: 1 }, // A5
      { id: 570, pitch: 78, startPpq: 13.5, durationPpq: 1.2, velocity: 0.88, channel: 1 }, // F#5
      { id: 571, pitch: 79, startPpq: 15.0, durationPpq: 0.8, velocity: 0.92, channel: 1 }, // G5
    ],
  },
  {
    name: 'UK Drill Dark Piano (C Minor)',
    pack: 'Hip-Hop, Trap & Drill',
    bpm: 142,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: Haunting Cm triplet-accented arpeggio + sub root
      { id: 572, pitch: 36, startPpq: 0.0, durationPpq: 3.5, velocity: 0.96, channel: 1 }, // C2
      { id: 573, pitch: 60, startPpq: 0.0, durationPpq: 0.7, velocity: 0.85, channel: 1 }, // C4
      { id: 574, pitch: 63, startPpq: 0.75, durationPpq: 0.7, velocity: 0.82, channel: 1 }, // Eb4
      { id: 575, pitch: 67, startPpq: 1.5, durationPpq: 0.7, velocity: 0.88, channel: 1 }, // G4
      { id: 576, pitch: 72, startPpq: 2.25, durationPpq: 0.7, velocity: 0.9, channel: 1 }, // C5
      { id: 577, pitch: 74, startPpq: 3.0, durationPpq: 0.45, velocity: 0.86, channel: 1 }, // D5 (9th rub)
      { id: 578, pitch: 75, startPpq: 3.5, durationPpq: 0.45, velocity: 0.89, channel: 1 }, // Eb5
      // Bar 2: Ab
      { id: 579, pitch: 32, startPpq: 4.0, durationPpq: 3.5, velocity: 0.95, channel: 1 }, // Ab1
      { id: 580, pitch: 60, startPpq: 4.0, durationPpq: 0.7, velocity: 0.84, channel: 1 }, // C4
      { id: 581, pitch: 63, startPpq: 4.75, durationPpq: 0.7, velocity: 0.82, channel: 1 }, // Eb4
      { id: 582, pitch: 68, startPpq: 5.5, durationPpq: 0.7, velocity: 0.87, channel: 1 }, // Ab4
      { id: 583, pitch: 72, startPpq: 6.25, durationPpq: 0.7, velocity: 0.9, channel: 1 }, // C5
      { id: 584, pitch: 75, startPpq: 7.0, durationPpq: 0.9, velocity: 0.88, channel: 1 }, // Eb5
      // Bar 3: Fm
      { id: 585, pitch: 29, startPpq: 8.0, durationPpq: 3.5, velocity: 0.94, channel: 1 }, // F1
      { id: 586, pitch: 56, startPpq: 8.0, durationPpq: 0.7, velocity: 0.83, channel: 1 }, // Ab3
      { id: 587, pitch: 60, startPpq: 8.75, durationPpq: 0.7, velocity: 0.81, channel: 1 }, // C4
      { id: 588, pitch: 65, startPpq: 9.5, durationPpq: 0.7, velocity: 0.86, channel: 1 }, // F4
      { id: 589, pitch: 68, startPpq: 10.25, durationPpq: 0.7, velocity: 0.89, channel: 1 }, // Ab4
      { id: 590, pitch: 72, startPpq: 11.0, durationPpq: 0.9, velocity: 0.87, channel: 1 }, // C5
      // Bar 4: G7b9 tension
      { id: 591, pitch: 31, startPpq: 12.0, durationPpq: 3.5, velocity: 0.97, channel: 1 }, // G1
      { id: 592, pitch: 59, startPpq: 12.0, durationPpq: 0.7, velocity: 0.86, channel: 1 }, // B3
      { id: 593, pitch: 62, startPpq: 12.75, durationPpq: 0.7, velocity: 0.84, channel: 1 }, // D4
      { id: 594, pitch: 67, startPpq: 13.5, durationPpq: 0.7, velocity: 0.89, channel: 1 }, // G4
      { id: 595, pitch: 68, startPpq: 14.25, durationPpq: 0.7, velocity: 0.92, channel: 1 }, // Ab4 (b9)
      { id: 596, pitch: 71, startPpq: 15.0, durationPpq: 0.9, velocity: 0.94, channel: 1 }, // B4
    ],
  },
  {
    name: 'Melodic Techno Pluck Arp (G Minor)',
    pack: 'House, Techno & Trance',
    bpm: 126,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Hypnotic Afterlife-style 1/16th pluck motif: Gm9 -> EbMaj7 -> Cm9 -> D7
      { id: 597, pitch: 31, startPpq: 0.0, durationPpq: 3.8, velocity: 0.94, channel: 1 }, // G1 sub
      { id: 598, pitch: 55, startPpq: 0.0, durationPpq: 0.22, velocity: 0.82, channel: 1 }, // G3
      { id: 599, pitch: 58, startPpq: 0.25, durationPpq: 0.22, velocity: 0.74, channel: 1 }, // Bb3
      { id: 600, pitch: 62, startPpq: 0.5, durationPpq: 0.22, velocity: 0.88, channel: 1 }, // D4
      { id: 601, pitch: 69, startPpq: 0.75, durationPpq: 0.22, velocity: 0.92, channel: 1 }, // A4 (9th)
      { id: 602, pitch: 62, startPpq: 1.0, durationPpq: 0.22, velocity: 0.8, channel: 1 },
      { id: 603, pitch: 58, startPpq: 1.25, durationPpq: 0.22, velocity: 0.76, channel: 1 },
      { id: 604, pitch: 69, startPpq: 1.5, durationPpq: 0.22, velocity: 0.9, channel: 1 },
      { id: 605, pitch: 62, startPpq: 1.75, durationPpq: 0.22, velocity: 0.82, channel: 1 },
      { id: 606, pitch: 55, startPpq: 2.0, durationPpq: 0.22, velocity: 0.84, channel: 1 },
      { id: 607, pitch: 58, startPpq: 2.25, durationPpq: 0.22, velocity: 0.75, channel: 1 },
      { id: 608, pitch: 62, startPpq: 2.5, durationPpq: 0.22, velocity: 0.89, channel: 1 },
      { id: 609, pitch: 69, startPpq: 2.75, durationPpq: 0.22, velocity: 0.93, channel: 1 },
      { id: 610, pitch: 70, startPpq: 3.0, durationPpq: 0.22, velocity: 0.95, channel: 1 }, // Bb4
      { id: 611, pitch: 69, startPpq: 3.5, durationPpq: 0.22, velocity: 0.86, channel: 1 },

      { id: 612, pitch: 39, startPpq: 4.0, durationPpq: 3.8, velocity: 0.93, channel: 1 }, // Eb2 sub
      { id: 613, pitch: 55, startPpq: 4.0, durationPpq: 0.22, velocity: 0.82, channel: 1 },
      { id: 614, pitch: 58, startPpq: 4.25, durationPpq: 0.22, velocity: 0.76, channel: 1 },
      { id: 615, pitch: 62, startPpq: 4.5, durationPpq: 0.22, velocity: 0.89, channel: 1 },
      { id: 616, pitch: 67, startPpq: 4.75, durationPpq: 0.22, velocity: 0.92, channel: 1 },
      { id: 617, pitch: 62, startPpq: 5.0, durationPpq: 0.22, velocity: 0.8, channel: 1 },
      { id: 618, pitch: 58, startPpq: 5.25, durationPpq: 0.22, velocity: 0.76, channel: 1 },
      { id: 619, pitch: 67, startPpq: 5.5, durationPpq: 0.22, velocity: 0.9, channel: 1 },
      { id: 620, pitch: 62, startPpq: 5.75, durationPpq: 0.22, velocity: 0.82, channel: 1 },

      { id: 621, pitch: 36, startPpq: 8.0, durationPpq: 3.8, velocity: 0.93, channel: 1 }, // C2 sub
      { id: 622, pitch: 55, startPpq: 8.0, durationPpq: 0.22, velocity: 0.83, channel: 1 },
      { id: 623, pitch: 60, startPpq: 8.25, durationPpq: 0.22, velocity: 0.78, channel: 1 },
      { id: 624, pitch: 63, startPpq: 8.5, durationPpq: 0.22, velocity: 0.89, channel: 1 },
      { id: 625, pitch: 67, startPpq: 8.75, durationPpq: 0.22, velocity: 0.92, channel: 1 },
      { id: 626, pitch: 74, startPpq: 9.5, durationPpq: 0.22, velocity: 0.95, channel: 1 }, // D5 (9th)
      { id: 627, pitch: 67, startPpq: 10.0, durationPpq: 0.22, velocity: 0.86, channel: 1 },

      { id: 628, pitch: 38, startPpq: 12.0, durationPpq: 3.8, velocity: 0.95, channel: 1 }, // D2 sub
      { id: 629, pitch: 54, startPpq: 12.0, durationPpq: 0.22, velocity: 0.84, channel: 1 }, // F#3
      { id: 630, pitch: 57, startPpq: 12.25, durationPpq: 0.22, velocity: 0.78, channel: 1 }, // A3
      { id: 631, pitch: 62, startPpq: 12.5, durationPpq: 0.22, velocity: 0.88, channel: 1 }, // D4
      { id: 632, pitch: 69, startPpq: 12.75, durationPpq: 0.22, velocity: 0.93, channel: 1 }, // A4
      { id: 633, pitch: 72, startPpq: 13.5, durationPpq: 0.22, velocity: 0.94, channel: 1 }, // C5
      { id: 634, pitch: 70, startPpq: 14.5, durationPpq: 0.22, velocity: 0.9, channel: 1 }, // Bb4
      { id: 635, pitch: 69, startPpq: 15.25, durationPpq: 0.22, velocity: 0.88, channel: 1 }, // A4
    ],
  },
  {
    name: 'Progressive House Euphoria (E Major)',
    pack: 'House, Techno & Trance',
    bpm: 124,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Driving dotted-8th chord plucks (Eadd9 -> B/D# -> C#m7 -> Aadd9)
      { id: 636, pitch: 40, startPpq: 0.0, durationPpq: 0.35, velocity: 0.92, channel: 1 }, // E2
      { id: 637, pitch: 59, startPpq: 0.0, durationPpq: 0.35, velocity: 0.84, channel: 1 }, // B3
      { id: 638, pitch: 64, startPpq: 0.0, durationPpq: 0.35, velocity: 0.86, channel: 1 }, // E4
      { id: 639, pitch: 66, startPpq: 0.0, durationPpq: 0.35, velocity: 0.88, channel: 1 }, // F#4
      { id: 640, pitch: 68, startPpq: 0.0, durationPpq: 0.35, velocity: 0.9, channel: 1 }, // G#4

      { id: 641, pitch: 59, startPpq: 0.75, durationPpq: 0.35, velocity: 0.82, channel: 1 },
      { id: 642, pitch: 64, startPpq: 0.75, durationPpq: 0.35, velocity: 0.85, channel: 1 },
      { id: 643, pitch: 68, startPpq: 0.75, durationPpq: 0.35, velocity: 0.89, channel: 1 },

      { id: 644, pitch: 59, startPpq: 1.5, durationPpq: 0.4, velocity: 0.86, channel: 1 },
      { id: 645, pitch: 64, startPpq: 1.5, durationPpq: 0.4, velocity: 0.88, channel: 1 },
      { id: 646, pitch: 68, startPpq: 1.5, durationPpq: 0.4, velocity: 0.92, channel: 1 },

      { id: 647, pitch: 40, startPpq: 2.25, durationPpq: 0.35, velocity: 0.9, channel: 1 },
      { id: 648, pitch: 64, startPpq: 2.25, durationPpq: 0.35, velocity: 0.85, channel: 1 },
      { id: 649, pitch: 66, startPpq: 2.25, durationPpq: 0.35, velocity: 0.88, channel: 1 },
      { id: 650, pitch: 71, startPpq: 3.0, durationPpq: 0.6, velocity: 0.94, channel: 1 }, // B4 lift

      // Bar 2: B/D#
      { id: 651, pitch: 39, startPpq: 4.0, durationPpq: 0.35, velocity: 0.92, channel: 1 }, // D#2
      { id: 652, pitch: 59, startPpq: 4.0, durationPpq: 0.35, velocity: 0.84, channel: 1 },
      { id: 653, pitch: 63, startPpq: 4.0, durationPpq: 0.35, velocity: 0.86, channel: 1 }, // D#4
      { id: 654, pitch: 66, startPpq: 4.0, durationPpq: 0.35, velocity: 0.89, channel: 1 }, // F#4
      { id: 655, pitch: 59, startPpq: 4.75, durationPpq: 0.35, velocity: 0.83, channel: 1 },
      { id: 656, pitch: 63, startPpq: 4.75, durationPpq: 0.35, velocity: 0.86, channel: 1 },
      { id: 657, pitch: 66, startPpq: 5.5, durationPpq: 0.4, velocity: 0.9, channel: 1 },
      { id: 658, pitch: 71, startPpq: 6.25, durationPpq: 0.5, velocity: 0.92, channel: 1 },

      // Bar 3: C#m7
      { id: 659, pitch: 37, startPpq: 8.0, durationPpq: 0.35, velocity: 0.92, channel: 1 }, // C#2
      { id: 660, pitch: 59, startPpq: 8.0, durationPpq: 0.35, velocity: 0.84, channel: 1 },
      { id: 661, pitch: 61, startPpq: 8.0, durationPpq: 0.35, velocity: 0.86, channel: 1 },
      { id: 662, pitch: 64, startPpq: 8.0, durationPpq: 0.35, velocity: 0.89, channel: 1 },
      { id: 663, pitch: 68, startPpq: 8.75, durationPpq: 0.35, velocity: 0.87, channel: 1 },
      { id: 664, pitch: 64, startPpq: 9.5, durationPpq: 0.4, velocity: 0.9, channel: 1 },
      { id: 665, pitch: 73, startPpq: 10.25, durationPpq: 0.5, velocity: 0.93, channel: 1 }, // C#5

      // Bar 4: Aadd9
      { id: 666, pitch: 33, startPpq: 12.0, durationPpq: 0.35, velocity: 0.94, channel: 1 }, // A1
      { id: 667, pitch: 57, startPpq: 12.0, durationPpq: 0.35, velocity: 0.85, channel: 1 },
      { id: 668, pitch: 61, startPpq: 12.0, durationPpq: 0.35, velocity: 0.87, channel: 1 },
      { id: 669, pitch: 64, startPpq: 12.0, durationPpq: 0.35, velocity: 0.9, channel: 1 },
      { id: 670, pitch: 71, startPpq: 12.75, durationPpq: 0.35, velocity: 0.89, channel: 1 },
      { id: 671, pitch: 68, startPpq: 13.5, durationPpq: 0.4, velocity: 0.91, channel: 1 },
      { id: 672, pitch: 66, startPpq: 14.25, durationPpq: 0.5, velocity: 0.9, channel: 1 },
    ],
  },
  {
    name: 'Uplifting Trance Anthem (A Minor)',
    pack: 'House, Techno & Trance',
    bpm: 138,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Euphoric supersaw chords: Fmaj7 -> G6 -> Em7 -> Am9 with driving 16th energy
      { id: 673, pitch: 29, startPpq: 0.0, durationPpq: 3.8, velocity: 0.96, channel: 1 }, // F1
      { id: 674, pitch: 57, startPpq: 0.0, durationPpq: 1.8, velocity: 0.86, channel: 1 }, // A3
      { id: 675, pitch: 60, startPpq: 0.0, durationPpq: 1.8, velocity: 0.88, channel: 1 }, // C4
      { id: 676, pitch: 64, startPpq: 0.0, durationPpq: 1.8, velocity: 0.9, channel: 1 }, // E4
      { id: 677, pitch: 72, startPpq: 0.5, durationPpq: 0.22, velocity: 0.92, channel: 1 }, // C5
      { id: 678, pitch: 76, startPpq: 1.0, durationPpq: 0.22, velocity: 0.94, channel: 1 }, // E5
      { id: 679, pitch: 77, startPpq: 2.0, durationPpq: 0.45, velocity: 0.95, channel: 1 }, // F5
      { id: 680, pitch: 76, startPpq: 2.5, durationPpq: 0.45, velocity: 0.9, channel: 1 }, // E5
      { id: 681, pitch: 72, startPpq: 3.0, durationPpq: 0.7, velocity: 0.92, channel: 1 }, // C5

      { id: 682, pitch: 31, startPpq: 4.0, durationPpq: 3.8, velocity: 0.96, channel: 1 }, // G1
      { id: 683, pitch: 59, startPpq: 4.0, durationPpq: 1.8, velocity: 0.86, channel: 1 }, // B3
      { id: 684, pitch: 62, startPpq: 4.0, durationPpq: 1.8, velocity: 0.88, channel: 1 }, // D4
      { id: 685, pitch: 67, startPpq: 4.0, durationPpq: 1.8, velocity: 0.91, channel: 1 }, // G4
      { id: 686, pitch: 74, startPpq: 4.5, durationPpq: 0.22, velocity: 0.92, channel: 1 }, // D5
      { id: 687, pitch: 79, startPpq: 5.0, durationPpq: 0.22, velocity: 0.95, channel: 1 }, // G5
      { id: 688, pitch: 76, startPpq: 6.0, durationPpq: 0.9, velocity: 0.93, channel: 1 }, // E5

      { id: 689, pitch: 28, startPpq: 8.0, durationPpq: 3.8, velocity: 0.96, channel: 1 }, // E1
      { id: 690, pitch: 55, startPpq: 8.0, durationPpq: 1.8, velocity: 0.86, channel: 1 }, // G3
      { id: 691, pitch: 59, startPpq: 8.0, durationPpq: 1.8, velocity: 0.88, channel: 1 }, // B3
      { id: 692, pitch: 62, startPpq: 8.0, durationPpq: 1.8, velocity: 0.9, channel: 1 }, // D4
      { id: 693, pitch: 71, startPpq: 8.5, durationPpq: 0.22, velocity: 0.92, channel: 1 }, // B4
      { id: 694, pitch: 74, startPpq: 9.0, durationPpq: 0.22, velocity: 0.94, channel: 1 }, // D5
      { id: 695, pitch: 79, startPpq: 10.0, durationPpq: 0.9, velocity: 0.96, channel: 1 }, // G5

      { id: 696, pitch: 33, startPpq: 12.0, durationPpq: 3.8, velocity: 0.98, channel: 1 }, // A1
      { id: 697, pitch: 57, startPpq: 12.0, durationPpq: 1.8, velocity: 0.88, channel: 1 }, // A3
      { id: 698, pitch: 60, startPpq: 12.0, durationPpq: 1.8, velocity: 0.9, channel: 1 }, // C4
      { id: 699, pitch: 64, startPpq: 12.0, durationPpq: 1.8, velocity: 0.92, channel: 1 }, // E4
      { id: 700, pitch: 81, startPpq: 12.5, durationPpq: 0.7, velocity: 0.97, channel: 1 }, // A5 peak
      { id: 701, pitch: 79, startPpq: 13.5, durationPpq: 0.7, velocity: 0.94, channel: 1 }, // G5
      { id: 702, pitch: 76, startPpq: 14.5, durationPpq: 1.0, velocity: 0.92, channel: 1 }, // E5
    ],
  },
  {
    name: 'UK Garage 2-Step Chords (C# Minor)',
    pack: 'UKG & Drum & Bass',
    bpm: 134,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Skippy 2-step M1 organ/piano stabs: C#m9 -> Aadd9 -> F#m9 -> G#m7
      { id: 703, pitch: 37, startPpq: 0.0, durationPpq: 0.45, velocity: 0.95, channel: 1 }, // C#2 sub
      { id: 704, pitch: 56, startPpq: 0.0, durationPpq: 0.35, velocity: 0.84, channel: 1 }, // G#3
      { id: 705, pitch: 59, startPpq: 0.0, durationPpq: 0.35, velocity: 0.86, channel: 1 }, // B3
      { id: 706, pitch: 63, startPpq: 0.0, durationPpq: 0.35, velocity: 0.89, channel: 1 }, // D#4
      { id: 707, pitch: 64, startPpq: 0.0, durationPpq: 0.35, velocity: 0.91, channel: 1 }, // E4
      { id: 708, pitch: 56, startPpq: 0.75, durationPpq: 0.25, velocity: 0.82, channel: 1 },
      { id: 709, pitch: 59, startPpq: 0.75, durationPpq: 0.25, velocity: 0.84, channel: 1 },
      { id: 710, pitch: 64, startPpq: 0.75, durationPpq: 0.25, velocity: 0.88, channel: 1 },
      { id: 711, pitch: 37, startPpq: 2.25, durationPpq: 0.6, velocity: 0.9, channel: 1 },
      { id: 712, pitch: 59, startPpq: 2.25, durationPpq: 0.35, velocity: 0.87, channel: 1 },
      { id: 713, pitch: 63, startPpq: 2.25, durationPpq: 0.35, velocity: 0.89, channel: 1 },
      { id: 714, pitch: 68, startPpq: 3.5, durationPpq: 0.35, velocity: 0.91, channel: 1 }, // G#4 pickup

      // Bar 2: Aadd9
      { id: 715, pitch: 33, startPpq: 4.0, durationPpq: 0.45, velocity: 0.94, channel: 1 }, // A1
      { id: 716, pitch: 57, startPpq: 4.0, durationPpq: 0.35, velocity: 0.84, channel: 1 },
      { id: 717, pitch: 61, startPpq: 4.0, durationPpq: 0.35, velocity: 0.86, channel: 1 },
      { id: 718, pitch: 64, startPpq: 4.0, durationPpq: 0.35, velocity: 0.89, channel: 1 },
      { id: 719, pitch: 59, startPpq: 4.75, durationPpq: 0.25, velocity: 0.85, channel: 1 },
      { id: 720, pitch: 64, startPpq: 6.25, durationPpq: 0.35, velocity: 0.88, channel: 1 },
      { id: 721, pitch: 68, startPpq: 6.25, durationPpq: 0.35, velocity: 0.9, channel: 1 },

      // Bar 3: F#m9
      { id: 722, pitch: 30, startPpq: 8.0, durationPpq: 0.45, velocity: 0.95, channel: 1 }, // F#1
      { id: 723, pitch: 57, startPpq: 8.0, durationPpq: 0.35, velocity: 0.84, channel: 1 },
      { id: 724, pitch: 61, startPpq: 8.0, durationPpq: 0.35, velocity: 0.86, channel: 1 },
      { id: 725, pitch: 64, startPpq: 8.0, durationPpq: 0.35, velocity: 0.88, channel: 1 },
      { id: 726, pitch: 68, startPpq: 8.0, durationPpq: 0.35, velocity: 0.92, channel: 1 },
      { id: 727, pitch: 57, startPpq: 8.75, durationPpq: 0.25, velocity: 0.82, channel: 1 },
      { id: 728, pitch: 64, startPpq: 10.25, durationPpq: 0.35, velocity: 0.88, channel: 1 },

      // Bar 4: G#m7
      { id: 729, pitch: 32, startPpq: 12.0, durationPpq: 0.45, velocity: 0.96, channel: 1 }, // G#1
      { id: 730, pitch: 56, startPpq: 12.0, durationPpq: 0.35, velocity: 0.85, channel: 1 },
      { id: 731, pitch: 59, startPpq: 12.0, durationPpq: 0.35, velocity: 0.87, channel: 1 },
      { id: 732, pitch: 63, startPpq: 12.0, durationPpq: 0.35, velocity: 0.89, channel: 1 },
      { id: 733, pitch: 66, startPpq: 12.0, durationPpq: 0.35, velocity: 0.91, channel: 1 },
      { id: 734, pitch: 68, startPpq: 14.25, durationPpq: 0.45, velocity: 0.93, channel: 1 },
      { id: 735, pitch: 71, startPpq: 15.0, durationPpq: 0.45, velocity: 0.9, channel: 1 },
    ],
  },
  {
    name: 'Liquid DnB Piano Lush (Eb Minor)',
    pack: 'UKG & Drum & Bass',
    bpm: 174,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Rolling liquid DnB chords: Ebm9 -> CbMaj7 -> Abm9 -> Bbm7
      { id: 736, pitch: 39, startPpq: 0.0, durationPpq: 3.6, velocity: 0.9, channel: 1 }, // Eb2
      { id: 737, pitch: 58, startPpq: 0.0, durationPpq: 1.5, velocity: 0.8, channel: 1 }, // Bb3
      { id: 738, pitch: 61, startPpq: 0.0, durationPpq: 1.5, velocity: 0.82, channel: 1 }, // Db4
      { id: 739, pitch: 66, startPpq: 0.0, durationPpq: 1.5, velocity: 0.85, channel: 1 }, // Gb4
      { id: 740, pitch: 65, startPpq: 0.0, durationPpq: 1.5, velocity: 0.88, channel: 1 }, // F4 (9th)
      { id: 741, pitch: 75, startPpq: 1.5, durationPpq: 0.9, velocity: 0.92, channel: 1 }, // Eb5 melody
      { id: 742, pitch: 73, startPpq: 2.5, durationPpq: 1.1, velocity: 0.88, channel: 1 }, // Db5

      // Bar 2: BMaj7 (CbMaj7)
      { id: 743, pitch: 35, startPpq: 4.0, durationPpq: 3.6, velocity: 0.9, channel: 1 }, // B1
      { id: 744, pitch: 59, startPpq: 4.0, durationPpq: 1.5, velocity: 0.8, channel: 1 }, // B3
      { id: 745, pitch: 63, startPpq: 4.0, durationPpq: 1.5, velocity: 0.83, channel: 1 }, // Eb4
      { id: 746, pitch: 66, startPpq: 4.0, durationPpq: 1.5, velocity: 0.86, channel: 1 }, // Gb4
      { id: 747, pitch: 70, startPpq: 4.0, durationPpq: 1.5, velocity: 0.89, channel: 1 }, // Bb4
      { id: 748, pitch: 78, startPpq: 5.5, durationPpq: 1.9, velocity: 0.91, channel: 1 }, // Gb5

      // Bar 3: Abm9
      { id: 749, pitch: 32, startPpq: 8.0, durationPpq: 3.6, velocity: 0.91, channel: 1 }, // Ab1
      { id: 750, pitch: 56, startPpq: 8.0, durationPpq: 1.5, velocity: 0.81, channel: 1 }, // Ab3
      { id: 751, pitch: 59, startPpq: 8.0, durationPpq: 1.5, velocity: 0.84, channel: 1 }, // B3
      { id: 752, pitch: 63, startPpq: 8.0, durationPpq: 1.5, velocity: 0.87, channel: 1 }, // Eb4
      { id: 753, pitch: 70, startPpq: 8.0, durationPpq: 1.5, velocity: 0.9, channel: 1 }, // Bb4
      { id: 754, pitch: 75, startPpq: 9.5, durationPpq: 0.9, velocity: 0.92, channel: 1 }, // Eb5
      { id: 755, pitch: 73, startPpq: 10.5, durationPpq: 1.1, velocity: 0.89, channel: 1 }, // Db5

      // Bar 4: Bbm7
      { id: 756, pitch: 34, startPpq: 12.0, durationPpq: 3.6, velocity: 0.92, channel: 1 }, // Bb1
      { id: 757, pitch: 58, startPpq: 12.0, durationPpq: 1.8, velocity: 0.82, channel: 1 }, // Bb3
      { id: 758, pitch: 61, startPpq: 12.0, durationPpq: 1.8, velocity: 0.85, channel: 1 }, // Db4
      { id: 759, pitch: 65, startPpq: 12.0, durationPpq: 1.8, velocity: 0.88, channel: 1 }, // F4
      { id: 760, pitch: 68, startPpq: 12.0, durationPpq: 1.8, velocity: 0.91, channel: 1 }, // Ab4
      { id: 761, pitch: 73, startPpq: 14.0, durationPpq: 1.5, velocity: 0.94, channel: 1 }, // Db5
    ],
  },
  {
    name: 'Neurofunk Dark Reese Riff (F Phrygian)',
    pack: 'UKG & Drum & Bass',
    bpm: 172,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Chromatic b2 & tritone neurofunk bass stabs in F Phrygian
      { id: 762, pitch: 29, startPpq: 0.0, durationPpq: 1.3, velocity: 0.98, channel: 1 }, // F1
      { id: 763, pitch: 30, startPpq: 1.5, durationPpq: 0.6, velocity: 0.92, channel: 1 }, // Gb1 (b2)
      { id: 764, pitch: 29, startPpq: 2.25, durationPpq: 0.9, velocity: 0.95, channel: 1 }, // F1
      { id: 765, pitch: 35, startPpq: 3.25, durationPpq: 0.6, velocity: 0.94, channel: 1 }, // B1 (tritone)

      { id: 766, pitch: 29, startPpq: 4.0, durationPpq: 1.3, velocity: 0.98, channel: 1 }, // F1
      { id: 767, pitch: 41, startPpq: 5.5, durationPpq: 0.35, velocity: 0.96, channel: 1 }, // F2 octave stab
      { id: 768, pitch: 42, startPpq: 6.0, durationPpq: 0.8, velocity: 0.93, channel: 1 }, // Gb2
      { id: 769, pitch: 36, startPpq: 7.0, durationPpq: 0.8, velocity: 0.91, channel: 1 }, // C2

      { id: 770, pitch: 29, startPpq: 8.0, durationPpq: 1.3, velocity: 0.98, channel: 1 }, // F1
      { id: 771, pitch: 30, startPpq: 9.5, durationPpq: 0.6, velocity: 0.93, channel: 1 }, // Gb1
      { id: 772, pitch: 33, startPpq: 10.25, durationPpq: 0.8, velocity: 0.95, channel: 1 }, // A1
      { id: 773, pitch: 37, startPpq: 11.25, durationPpq: 0.6, velocity: 0.92, channel: 1 }, // Db2

      { id: 774, pitch: 30, startPpq: 12.0, durationPpq: 1.0, velocity: 0.97, channel: 1 }, // Gb1
      { id: 775, pitch: 29, startPpq: 13.25, durationPpq: 0.8, velocity: 0.95, channel: 1 }, // F1
      { id: 776, pitch: 41, startPpq: 14.5, durationPpq: 0.45, velocity: 0.98, channel: 1 }, // F2
      { id: 777, pitch: 48, startPpq: 15.25, durationPpq: 0.5, velocity: 0.96, channel: 1 }, // C3 stab
    ],
  },
  {
    name: 'Nu-Disco Funky Octave Bass (A Minor)',
    pack: 'Synthwave, Disco & Pop',
    bpm: 118,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // French Touch / Nu-Disco bouncy octave bass + disco string chords (Am7 -> Dm7 -> G13 -> Cmaj7)
      { id: 778, pitch: 33, startPpq: 0.0, durationPpq: 0.22, velocity: 0.96, channel: 1 }, // A1
      { id: 779, pitch: 45, startPpq: 0.5, durationPpq: 0.22, velocity: 0.88, channel: 1 }, // A2
      { id: 780, pitch: 33, startPpq: 1.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 781, pitch: 45, startPpq: 1.5, durationPpq: 0.22, velocity: 0.9, channel: 1 },
      { id: 782, pitch: 43, startPpq: 1.75, durationPpq: 0.22, velocity: 0.84, channel: 1 }, // G2
      { id: 783, pitch: 45, startPpq: 2.0, durationPpq: 0.22, velocity: 0.95, channel: 1 },
      { id: 784, pitch: 69, startPpq: 2.75, durationPpq: 0.35, velocity: 0.88, channel: 1 }, // A4 disco chop
      { id: 785, pitch: 72, startPpq: 2.75, durationPpq: 0.35, velocity: 0.9, channel: 1 }, // C5
      { id: 786, pitch: 76, startPpq: 2.75, durationPpq: 0.35, velocity: 0.92, channel: 1 }, // E5

      { id: 787, pitch: 38, startPpq: 4.0, durationPpq: 0.22, velocity: 0.96, channel: 1 }, // D2
      { id: 788, pitch: 50, startPpq: 4.5, durationPpq: 0.22, velocity: 0.88, channel: 1 }, // D3
      { id: 789, pitch: 38, startPpq: 5.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 790, pitch: 50, startPpq: 5.5, durationPpq: 0.22, velocity: 0.9, channel: 1 },
      { id: 791, pitch: 69, startPpq: 6.75, durationPpq: 0.35, velocity: 0.89, channel: 1 }, // A4
      { id: 792, pitch: 72, startPpq: 6.75, durationPpq: 0.35, velocity: 0.91, channel: 1 }, // C5
      { id: 793, pitch: 77, startPpq: 6.75, durationPpq: 0.35, velocity: 0.93, channel: 1 }, // F5

      { id: 794, pitch: 31, startPpq: 8.0, durationPpq: 0.22, velocity: 0.96, channel: 1 }, // G1
      { id: 795, pitch: 43, startPpq: 8.5, durationPpq: 0.22, velocity: 0.88, channel: 1 }, // G2
      { id: 796, pitch: 31, startPpq: 9.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 797, pitch: 43, startPpq: 9.5, durationPpq: 0.22, velocity: 0.9, channel: 1 },
      { id: 798, pitch: 71, startPpq: 10.75, durationPpq: 0.35, velocity: 0.89, channel: 1 }, // B4
      { id: 799, pitch: 74, startPpq: 10.75, durationPpq: 0.35, velocity: 0.91, channel: 1 }, // D5
      { id: 800, pitch: 79, startPpq: 10.75, durationPpq: 0.35, velocity: 0.94, channel: 1 }, // G5

      { id: 801, pitch: 36, startPpq: 12.0, durationPpq: 0.22, velocity: 0.96, channel: 1 }, // C2
      { id: 802, pitch: 48, startPpq: 12.5, durationPpq: 0.22, velocity: 0.89, channel: 1 }, // C3
      { id: 803, pitch: 36, startPpq: 13.0, durationPpq: 0.22, velocity: 0.94, channel: 1 },
      { id: 804, pitch: 48, startPpq: 13.5, durationPpq: 0.22, velocity: 0.91, channel: 1 },
      { id: 805, pitch: 72, startPpq: 14.75, durationPpq: 0.35, velocity: 0.92, channel: 1 }, // C5
      { id: 806, pitch: 76, startPpq: 14.75, durationPpq: 0.35, velocity: 0.94, channel: 1 }, // E5
      { id: 807, pitch: 79, startPpq: 14.75, durationPpq: 0.35, velocity: 0.96, channel: 1 }, // G5
    ],
  },
  {
    name: 'Hyperpop Glitchy Plucks (D Major)',
    pack: 'Synthwave, Disco & Pop',
    bpm: 156,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bright max-velocity pop/hyperpop chord stabs & octave jumps: D -> A -> Bm -> G
      { id: 808, pitch: 38, startPpq: 0.0, durationPpq: 0.4, velocity: 0.98, channel: 1 }, // D2
      { id: 809, pitch: 62, startPpq: 0.0, durationPpq: 0.35, velocity: 0.95, channel: 1 }, // D4
      { id: 810, pitch: 66, startPpq: 0.0, durationPpq: 0.35, velocity: 0.95, channel: 1 }, // F#4
      { id: 811, pitch: 69, startPpq: 0.0, durationPpq: 0.35, velocity: 0.96, channel: 1 }, // A4
      { id: 812, pitch: 86, startPpq: 0.75, durationPpq: 0.2, velocity: 0.98, channel: 1 }, // D6 glitch jump
      { id: 813, pitch: 81, startPpq: 1.0, durationPpq: 0.2, velocity: 0.94, channel: 1 }, // A5
      { id: 814, pitch: 78, startPpq: 1.5, durationPpq: 0.2, velocity: 0.96, channel: 1 }, // F#5
      { id: 815, pitch: 86, startPpq: 2.25, durationPpq: 0.2, velocity: 0.98, channel: 1 }, // D6
      { id: 816, pitch: 88, startPpq: 3.0, durationPpq: 0.45, velocity: 0.97, channel: 1 }, // E6

      { id: 817, pitch: 33, startPpq: 4.0, durationPpq: 0.4, velocity: 0.98, channel: 1 }, // A1
      { id: 818, pitch: 61, startPpq: 4.0, durationPpq: 0.35, velocity: 0.94, channel: 1 }, // C#4
      { id: 819, pitch: 64, startPpq: 4.0, durationPpq: 0.35, velocity: 0.95, channel: 1 }, // E4
      { id: 820, pitch: 69, startPpq: 4.0, durationPpq: 0.35, velocity: 0.96, channel: 1 }, // A4
      { id: 821, pitch: 85, startPpq: 4.75, durationPpq: 0.2, velocity: 0.98, channel: 1 }, // C#6
      { id: 822, pitch: 81, startPpq: 5.5, durationPpq: 0.3, velocity: 0.95, channel: 1 }, // A5
      { id: 823, pitch: 83, startPpq: 6.5, durationPpq: 0.4, velocity: 0.96, channel: 1 }, // B5

      { id: 824, pitch: 35, startPpq: 8.0, durationPpq: 0.4, velocity: 0.98, channel: 1 }, // B1
      { id: 825, pitch: 59, startPpq: 8.0, durationPpq: 0.35, velocity: 0.94, channel: 1 }, // B3
      { id: 826, pitch: 62, startPpq: 8.0, durationPpq: 0.35, velocity: 0.95, channel: 1 }, // D4
      { id: 827, pitch: 66, startPpq: 8.0, durationPpq: 0.35, velocity: 0.96, channel: 1 }, // F#4
      { id: 828, pitch: 83, startPpq: 8.75, durationPpq: 0.2, velocity: 0.98, channel: 1 }, // B5
      { id: 829, pitch: 86, startPpq: 9.5, durationPpq: 0.3, velocity: 0.97, channel: 1 }, // D6
      { id: 830, pitch: 85, startPpq: 10.5, durationPpq: 0.4, velocity: 0.95, channel: 1 }, // C#6

      { id: 831, pitch: 31, startPpq: 12.0, durationPpq: 0.4, velocity: 0.98, channel: 1 }, // G1
      { id: 832, pitch: 59, startPpq: 12.0, durationPpq: 0.35, velocity: 0.94, channel: 1 }, // B3
      { id: 833, pitch: 62, startPpq: 12.0, durationPpq: 0.35, velocity: 0.95, channel: 1 }, // D4
      { id: 834, pitch: 67, startPpq: 12.0, durationPpq: 0.35, velocity: 0.97, channel: 1 }, // G4
      { id: 835, pitch: 86, startPpq: 12.75, durationPpq: 0.2, velocity: 0.98, channel: 1 }, // D6
      { id: 836, pitch: 85, startPpq: 13.5, durationPpq: 0.2, velocity: 0.96, channel: 1 }, // C#6
      { id: 837, pitch: 81, startPpq: 14.5, durationPpq: 0.4, velocity: 0.95, channel: 1 }, // A5
    ],
  },
  {
    name: 'Dreamy Shoegaze Wall (E Lydian)',
    pack: 'Ambient & Cinematic',
    bpm: 88,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Lush #11 maj7 shoegaze chord washes in E Lydian (Emaj7#11 -> F#/E -> C#m9 -> Badd11)
      { id: 838, pitch: 40, startPpq: 0.0, durationPpq: 3.9, velocity: 0.78, channel: 1 }, // E2
      { id: 839, pitch: 52, startPpq: 0.05, durationPpq: 3.85, velocity: 0.72, channel: 1 }, // E3
      { id: 840, pitch: 59, startPpq: 0.1, durationPpq: 3.8, velocity: 0.74, channel: 1 }, // B3
      { id: 841, pitch: 63, startPpq: 0.15, durationPpq: 3.75, velocity: 0.78, channel: 1 }, // D#4
      { id: 842, pitch: 68, startPpq: 0.2, durationPpq: 3.7, velocity: 0.8, channel: 1 }, // G#4
      { id: 843, pitch: 70, startPpq: 0.25, durationPpq: 3.65, velocity: 0.83, channel: 1 }, // A#4 (#11 Lydian)

      { id: 844, pitch: 40, startPpq: 4.0, durationPpq: 3.9, velocity: 0.79, channel: 1 }, // E2 pedal
      { id: 845, pitch: 54, startPpq: 4.05, durationPpq: 3.85, velocity: 0.73, channel: 1 }, // F#3
      { id: 846, pitch: 61, startPpq: 4.1, durationPpq: 3.8, velocity: 0.76, channel: 1 }, // C#4
      { id: 847, pitch: 66, startPpq: 4.15, durationPpq: 3.75, velocity: 0.8, channel: 1 }, // F#4
      { id: 848, pitch: 70, startPpq: 4.2, durationPpq: 3.7, velocity: 0.84, channel: 1 }, // A#4

      { id: 849, pitch: 37, startPpq: 8.0, durationPpq: 3.9, velocity: 0.8, channel: 1 }, // C#2
      { id: 850, pitch: 56, startPpq: 8.05, durationPpq: 3.85, velocity: 0.74, channel: 1 }, // G#3
      { id: 851, pitch: 59, startPpq: 8.1, durationPpq: 3.8, velocity: 0.76, channel: 1 }, // B3
      { id: 852, pitch: 63, startPpq: 8.15, durationPpq: 3.75, velocity: 0.8, channel: 1 }, // D#4
      { id: 853, pitch: 64, startPpq: 8.2, durationPpq: 3.7, velocity: 0.83, channel: 1 }, // E4

      { id: 854, pitch: 35, startPpq: 12.0, durationPpq: 3.9, velocity: 0.82, channel: 1 }, // B1
      { id: 855, pitch: 54, startPpq: 12.05, durationPpq: 3.85, velocity: 0.75, channel: 1 }, // F#3
      { id: 856, pitch: 59, startPpq: 12.1, durationPpq: 3.8, velocity: 0.78, channel: 1 }, // B3
      { id: 857, pitch: 64, startPpq: 12.15, durationPpq: 3.75, velocity: 0.81, channel: 1 }, // E4
      { id: 858, pitch: 66, startPpq: 12.2, durationPpq: 3.7, velocity: 0.85, channel: 1 }, // F#4
    ],
  },
  {
    name: 'Bossa Nova Nylon Guitar (F Major)',
    pack: 'World & Latin Groove',
    bpm: 126,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Jobim-style syncopated Bossa comping: FMaj7 -> G7 -> Gm7 -> C9
      { id: 859, pitch: 41, startPpq: 0.0, durationPpq: 1.5, velocity: 0.82, channel: 1 }, // F2 bass
      { id: 860, pitch: 57, startPpq: 0.0, durationPpq: 0.45, velocity: 0.74, channel: 1 }, // A3
      { id: 861, pitch: 60, startPpq: 0.0, durationPpq: 0.45, velocity: 0.75, channel: 1 }, // C4
      { id: 862, pitch: 64, startPpq: 0.0, durationPpq: 0.45, velocity: 0.78, channel: 1 }, // E4
      { id: 863, pitch: 57, startPpq: 0.75, durationPpq: 0.45, velocity: 0.72, channel: 1 },
      { id: 864, pitch: 64, startPpq: 0.75, durationPpq: 0.45, velocity: 0.76, channel: 1 },
      { id: 865, pitch: 48, startPpq: 2.0, durationPpq: 1.5, velocity: 0.78, channel: 1 }, // C3 fifth bass
      { id: 866, pitch: 57, startPpq: 2.5, durationPpq: 0.7, velocity: 0.75, channel: 1 },
      { id: 867, pitch: 60, startPpq: 2.5, durationPpq: 0.7, velocity: 0.77, channel: 1 },
      { id: 868, pitch: 64, startPpq: 2.5, durationPpq: 0.7, velocity: 0.8, channel: 1 },

      // Bar 2: G13
      { id: 869, pitch: 43, startPpq: 4.0, durationPpq: 1.5, velocity: 0.82, channel: 1 }, // G2
      { id: 870, pitch: 59, startPpq: 4.0, durationPpq: 0.45, velocity: 0.74, channel: 1 }, // B3
      { id: 871, pitch: 64, startPpq: 4.0, durationPpq: 0.45, velocity: 0.77, channel: 1 }, // E4
      { id: 872, pitch: 65, startPpq: 4.0, durationPpq: 0.45, velocity: 0.79, channel: 1 }, // F4
      { id: 873, pitch: 59, startPpq: 4.75, durationPpq: 0.45, velocity: 0.73, channel: 1 },
      { id: 874, pitch: 65, startPpq: 4.75, durationPpq: 0.45, velocity: 0.76, channel: 1 },
      { id: 875, pitch: 50, startPpq: 6.0, durationPpq: 1.5, velocity: 0.78, channel: 1 }, // D3
      { id: 876, pitch: 64, startPpq: 6.5, durationPpq: 0.7, velocity: 0.78, channel: 1 },

      // Bar 3: Gm7
      { id: 877, pitch: 43, startPpq: 8.0, durationPpq: 1.5, velocity: 0.83, channel: 1 }, // G2
      { id: 878, pitch: 58, startPpq: 8.0, durationPpq: 0.45, velocity: 0.74, channel: 1 }, // Bb3
      { id: 879, pitch: 62, startPpq: 8.0, durationPpq: 0.45, velocity: 0.77, channel: 1 }, // D4
      { id: 880, pitch: 65, startPpq: 8.0, durationPpq: 0.45, velocity: 0.8, channel: 1 }, // F4
      { id: 881, pitch: 58, startPpq: 8.75, durationPpq: 0.45, velocity: 0.74, channel: 1 },
      { id: 882, pitch: 65, startPpq: 8.75, durationPpq: 0.45, velocity: 0.77, channel: 1 },
      { id: 883, pitch: 50, startPpq: 10.0, durationPpq: 1.5, velocity: 0.79, channel: 1 }, // D3

      // Bar 4: C9
      { id: 884, pitch: 36, startPpq: 12.0, durationPpq: 1.5, velocity: 0.84, channel: 1 }, // C2
      { id: 885, pitch: 58, startPpq: 12.0, durationPpq: 0.45, velocity: 0.75, channel: 1 }, // Bb3
      { id: 886, pitch: 62, startPpq: 12.0, durationPpq: 0.45, velocity: 0.78, channel: 1 }, // D4
      { id: 887, pitch: 64, startPpq: 12.0, durationPpq: 0.45, velocity: 0.8, channel: 1 }, // E4
      { id: 888, pitch: 58, startPpq: 13.5, durationPpq: 0.7, velocity: 0.76, channel: 1 },
      { id: 889, pitch: 62, startPpq: 13.5, durationPpq: 0.7, velocity: 0.79, channel: 1 },
      { id: 890, pitch: 64, startPpq: 13.5, durationPpq: 0.7, velocity: 0.82, channel: 1 },
    ],
  },
  {
    name: 'Reggaeton Perreo Pluck (B Minor)',
    pack: 'World & Latin Groove',
    bpm: 94,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Classic Bm -> G -> D -> A dembow syncopated synth pluck rhythm + sub bass
      { id: 891, pitch: 35, startPpq: 0.0, durationPpq: 1.4, velocity: 0.95, channel: 1 }, // B1 sub
      { id: 892, pitch: 59, startPpq: 0.0, durationPpq: 0.35, velocity: 0.85, channel: 1 }, // B3
      { id: 893, pitch: 62, startPpq: 0.0, durationPpq: 0.35, velocity: 0.87, channel: 1 }, // D4
      { id: 894, pitch: 66, startPpq: 0.0, durationPpq: 0.35, velocity: 0.9, channel: 1 }, // F#4
      { id: 895, pitch: 62, startPpq: 0.75, durationPpq: 0.35, velocity: 0.84, channel: 1 },
      { id: 896, pitch: 66, startPpq: 0.75, durationPpq: 0.35, velocity: 0.88, channel: 1 },
      { id: 897, pitch: 66, startPpq: 1.5, durationPpq: 0.35, velocity: 0.86, channel: 1 },
      { id: 898, pitch: 71, startPpq: 2.75, durationPpq: 0.45, velocity: 0.92, channel: 1 }, // B4

      { id: 899, pitch: 31, startPpq: 4.0, durationPpq: 1.4, velocity: 0.95, channel: 1 }, // G1 sub
      { id: 900, pitch: 59, startPpq: 4.0, durationPpq: 0.35, velocity: 0.85, channel: 1 }, // B3
      { id: 901, pitch: 62, startPpq: 4.0, durationPpq: 0.35, velocity: 0.87, channel: 1 }, // D4
      { id: 902, pitch: 67, startPpq: 4.0, durationPpq: 0.35, velocity: 0.9, channel: 1 }, // G4
      { id: 903, pitch: 62, startPpq: 4.75, durationPpq: 0.35, velocity: 0.84, channel: 1 },
      { id: 904, pitch: 67, startPpq: 4.75, durationPpq: 0.35, velocity: 0.88, channel: 1 },
      { id: 905, pitch: 67, startPpq: 5.5, durationPpq: 0.35, velocity: 0.86, channel: 1 },

      { id: 906, pitch: 38, startPpq: 8.0, durationPpq: 1.4, velocity: 0.95, channel: 1 }, // D2 sub
      { id: 907, pitch: 57, startPpq: 8.0, durationPpq: 0.35, velocity: 0.85, channel: 1 }, // A3
      { id: 908, pitch: 62, startPpq: 8.0, durationPpq: 0.35, velocity: 0.87, channel: 1 }, // D4
      { id: 909, pitch: 66, startPpq: 8.0, durationPpq: 0.35, velocity: 0.9, channel: 1 }, // F#4
      { id: 910, pitch: 62, startPpq: 8.75, durationPpq: 0.35, velocity: 0.84, channel: 1 },
      { id: 911, pitch: 66, startPpq: 8.75, durationPpq: 0.35, velocity: 0.88, channel: 1 },
      { id: 912, pitch: 69, startPpq: 10.75, durationPpq: 0.45, velocity: 0.92, channel: 1 }, // A4

      { id: 913, pitch: 33, startPpq: 12.0, durationPpq: 1.4, velocity: 0.96, channel: 1 }, // A1 sub
      { id: 914, pitch: 57, startPpq: 12.0, durationPpq: 0.35, velocity: 0.85, channel: 1 }, // A3
      { id: 915, pitch: 61, startPpq: 12.0, durationPpq: 0.35, velocity: 0.87, channel: 1 }, // C#4
      { id: 916, pitch: 64, startPpq: 12.0, durationPpq: 0.35, velocity: 0.9, channel: 1 }, // E4
      { id: 917, pitch: 61, startPpq: 12.75, durationPpq: 0.35, velocity: 0.85, channel: 1 },
      { id: 918, pitch: 64, startPpq: 12.75, durationPpq: 0.35, velocity: 0.89, channel: 1 },
      { id: 919, pitch: 69, startPpq: 14.75, durationPpq: 0.45, velocity: 0.93, channel: 1 }, // A4
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

  // Support RIFF-wrapped RMID files by locating the embedded 'MThd' header
  let headerId = String.fromCharCode(
    data.getUint8(offset),
    data.getUint8(offset + 1),
    data.getUint8(offset + 2),
    data.getUint8(offset + 3)
  );
  if (headerId === 'RIFF') {
    let foundMThd = -1;
    for (let i = 12; i + 14 <= data.byteLength; i++) {
      if (
        data.getUint8(i) === 0x4d && // M
        data.getUint8(i + 1) === 0x54 && // T
        data.getUint8(i + 2) === 0x68 && // h
        data.getUint8(i + 3) === 0x64 // d
      ) {
        foundMThd = i;
        break;
      }
    }
    if (foundMThd >= 0) {
      offset = foundMThd;
      headerId = 'MThd';
    }
  }
  offset += 4;

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
        offset = Math.min(trackEnd, offset + metaLen);
      } else if (status === 0xf0 || status === 0xf7) {
        // SysEx
        let sysLen = 0;
        let sb = 0;
        do {
          if (offset >= data.byteLength) break;
          sb = data.getUint8(offset++);
          sysLen = (sysLen << 7) | (sb & 0x7f);
        } while (sb & 0x80);
        offset = Math.min(trackEnd, offset + sysLen);
      } else if (status === 0xf2) {
        // Song Position Pointer: 2 data bytes
        offset += 2;
      } else if (status === 0xf1 || status === 0xf3) {
        // MTC Quarter Frame / Song Select: 1 data byte
        offset += 1;
      } else if (status >= 0xf4 && status <= 0xfe) {
        // System Common (0xf6 Tune Request) / Realtime (0xf8..0xfe): 0 data bytes
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

  // Sort by tick, processing Note-Off before Note-On at identical ticks so re-triggered notes stay intact
  rawEvents.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type !== b.type) return a.type === 'off' ? -1 : 1;
    return 0;
  });

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

  // Normalize full empty leading bars (e.g. DAW exports positioned at bar 5/9/17) so notes begin inside bar 1
  const barPpq = (timeSigNum || 4) * (4 / (timeSigDen || 4));
  if (notes.length > 0 && barPpq > 0) {
    let minStartPpq = Infinity;
    for (const n of notes) {
      if (n.startPpq < minStartPpq) minStartPpq = n.startPpq;
    }
    const leadingBars = Math.floor(minStartPpq / barPpq);
    if (leadingBars >= 1) {
      const shiftPpq = leadingBars * barPpq;
      for (const n of notes) {
        n.startPpq = Math.max(0, n.startPpq - shiftPpq);
      }
    }
  }

  // Calculate sequence length rounded to bar boundaries
  let maxPpq = 4;
  for (const n of notes) {
    maxPpq = Math.max(maxPpq, n.startPpq + n.durationPpq);
  }
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
