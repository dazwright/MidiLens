export type ScaleType =
  | 'chromatic'
  | 'major'
  | 'minor' // natural minor / aeolian
  | 'harmonic_minor'
  | 'melodic_minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'pentatonic_major'
  | 'pentatonic_minor'
  | 'blues';

export type QuantizeGrid = '1/4' | '1/8' | '1/16' | '1/32' | '1/8T' | '1/16T';

export type ArpMode = 'up' | 'down' | 'up-down' | 'down-up' | 'random' | 'chord';
export type ArpRate = '1/4' | '1/8' | '1/16' | '1/32' | '1/8T' | '1/16T';
export type ArpOctaves = 1 | 2 | 3 | 4;

export interface MidiNote {
  id: number;
  pitch: number; // 0-127
  startPpq: number; // in quarter notes
  durationPpq: number; // in quarter notes
  velocity: number; // 0.0 - 1.0
  channel: number;
  locked?: boolean;
}

export interface MidiSequence {
  name: string;
  pack?: string;
  bpm: number;
  timeSigNumerator: number;
  timeSigDenominator: number;
  totalLengthPpq: number;
  notes: MidiNote[];
}

export interface KeyResult {
  rootPitch: number; // 0 = C, 1 = C#, ..., 11 = B
  isMinor: boolean;
  confidence: number; // 0.0 - 1.0
  keyName: string;
  pitchClassWeights: number[]; // length 12
  correlation: number;
}

export interface PluginParameters {
  transpose: number; // -24 to +24
  speedMultiplier: number; // 0.25 to 4.0
  velocityScale: number; // 0.0 to 2.0
  velocityOffset: number; // -64 to +64
  syncMode: 'daw' | 'audition';
  loop: boolean;
  targetKeyRoot: number;
  targetKeyIsMinor: boolean;
  targetScaleType: ScaleType;
  projectKeyRoot: number;
  projectScaleType: ScaleType;
  scaleRoot: number; // 0 = C, 1 = C#, etc.
  scaleType: ScaleType;
  scaleLock: boolean; // Gray out non-scale notes & prevent dragging onto them
  quantizeGrid: QuantizeGrid;
  // Arpeggiator Parameters
  arpEnabled: boolean;
  arpMode: ArpMode;
  arpRate: ArpRate;
  arpOctaves: ArpOctaves;
  arpGate: number; // 0.1 - 1.0 (default 0.75)
}

export interface ScannedMidiFile {
  name: string;
  relativePath: string;
  file?: File;
  nativePath?: string;
  sizeBytes: number;
  notesCount?: number;
  bpm?: number;
}

export interface CodeFileEntry {
  filename: string;
  path: string;
  language: string;
  category: 'Configuration' | 'Processor DSP' | 'Analysis DSP' | 'GUI Canvas' | 'Export / I/O' | 'Documentation' | 'Install Script';
  description: string;
  content: string;
}
