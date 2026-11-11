import { ScaleType, QuantizeGrid, PluginParameters, MidiSequence } from './types';
import { PRESET_SEQUENCES } from './midiParser';

export interface PresetSettings {
  scaleRoot: number;
  scaleType: ScaleType;
  scaleLock: boolean;
  quantizeGrid: QuantizeGrid;
  quantizeStrength: number; // 0 - 100%
  humanizeVelRange: number; // e.g. 2 - 40
  randomMinVel: number; // e.g. 45
  randomMaxVel: number; // e.g. 115
  humanizeTimingAmount: number; // 0.0 - 0.1 PPQ
  transpose: number; // -24 to +24
  speedMultiplier: number; // 0.25 - 4.0
  velocityScale: number; // 0.1 - 2.0
  velocityOffset: number; // -64 to +64
}

export interface MidiLensPreset {
  id: string;
  name: string;
  category: 'Factory' | 'User' | 'Genre' | 'Groove';
  description: string;
  isFactory: boolean;
  isFavorite?: boolean;
  createdAt?: string;
  settings: PresetSettings;
  sequence?: MidiSequence;
}

export const DEFAULT_PRESET_SETTINGS: PresetSettings = {
  scaleRoot: 0, // C
  scaleType: 'minor',
  scaleLock: true,
  quantizeGrid: '1/16',
  quantizeStrength: 100,
  humanizeVelRange: 18,
  randomMinVel: 45,
  randomMaxVel: 115,
  humanizeTimingAmount: 0.03,
  transpose: 0,
  speedMultiplier: 1.0,
  velocityScale: 1.0,
  velocityOffset: 0,
};

export const FACTORY_PRESETS: MidiLensPreset[] = [
  {
    id: 'factory_neo_soul',
    name: 'Neo-Soul Smooth Minor',
    category: 'Factory',
    description: 'Lush Cm9/Fm9/Bb13 jazz voicings with soft velocity jitter and 1/16th swing.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[0],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 0, // C
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 85,
      humanizeVelRange: 22,
      randomMinVel: 50,
      randomMaxVel: 110,
      humanizeTimingAmount: 0.035,
    },
  },
  {
    id: 'factory_lofi_hiphop',
    name: 'Lo-Fi Loose Swing (F Major)',
    category: 'Groove',
    description: 'Warm nostalgic 7th/9th chord progression with relaxed loose strums in F Major.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[1],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 5, // F
      scaleType: 'major',
      scaleLock: true,
      quantizeGrid: '1/8T',
      quantizeStrength: 60,
      humanizeVelRange: 28,
      randomMinVel: 35,
      randomMaxVel: 105,
      humanizeTimingAmount: 0.05,
    },
  },
  {
    id: 'factory_trap_bounce',
    name: 'Trap Dark Bells (D Minor)',
    category: 'Genre',
    description: 'Sinister D Minor bell melody with rapid 1/32 roll flourishes and 808 bass foundation.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[2],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 2, // D
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/32',
      quantizeStrength: 100,
      humanizeVelRange: 8,
      randomMinVel: 80,
      randomMaxVel: 127,
      humanizeTimingAmount: 0.005,
    },
  },
  {
    id: 'factory_house_driving',
    name: 'House Driving Stabs (G Minor)',
    category: 'Genre',
    description: 'Punchy 90s classic house chord stabs with syncopated 1/16th off-beat bounce in G Minor.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[3],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 7, // G
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 100,
      humanizeVelRange: 12,
      randomMinVel: 65,
      randomMaxVel: 120,
      humanizeTimingAmount: 0.015,
    },
  },
  {
    id: 'factory_cinematic_epic',
    name: 'Cinematic Epic Major (D Major)',
    category: 'Factory',
    description: 'Soaring orchestral chord movements in D Major with wide octave voicings and add9 harmony.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[4],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 2, // D
      scaleType: 'major',
      scaleLock: true,
      quantizeGrid: '1/8',
      quantizeStrength: 90,
      humanizeVelRange: 20,
      randomMinVel: 40,
      randomMaxVel: 125,
      humanizeTimingAmount: 0.025,
    },
  },
  {
    id: 'factory_jazz_blues',
    name: 'Jazz Blues Turnaround (Bb)',
    category: 'Groove',
    description: 'Soulful swing progression in Bb with rootless 13th, 9th, and chromatic passing notes.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[5],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 10, // Bb
      scaleType: 'blues',
      scaleLock: false,
      quantizeGrid: '1/8T',
      quantizeStrength: 70,
      humanizeVelRange: 24,
      randomMinVel: 40,
      randomMaxVel: 115,
      humanizeTimingAmount: 0.04,
    },
  },
  {
    id: 'factory_synthwave',
    name: 'Synthwave Cyber Arp (A Minor)',
    category: 'Genre',
    description: 'High-energy rolling 16th-note arpeggiated electronic lead in A Minor with bass octaves.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[6],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 9, // A
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 100,
      humanizeVelRange: 10,
      randomMinVel: 75,
      randomMaxVel: 120,
      humanizeTimingAmount: 0.01,
    },
  },
  {
    id: 'factory_flamenco',
    name: 'Flamenco Descent (A Phrygian)',
    category: 'Groove',
    description: 'Dramatic Andalusian descent (Am - G - F - E) with exotic Phrygian dominant tension.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[7],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 9, // A
      scaleType: 'phrygian',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 85,
      humanizeVelRange: 20,
      randomMinVel: 45,
      randomMaxVel: 120,
      humanizeTimingAmount: 0.03,
    },
  },
  {
    id: 'factory_funk_clav',
    name: 'Funk Clavinet Groove (E Dorian)',
    category: 'Groove',
    description: 'Syncopated funk riffs with octave bass slaps and crisp 16th-note chord stabs in E Dorian.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[8],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 4, // E
      scaleType: 'dorian',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 90,
      humanizeVelRange: 16,
      randomMinVel: 60,
      randomMaxVel: 122,
      humanizeTimingAmount: 0.02,
    },
  },
  {
    id: 'factory_afrobeats',
    name: 'Afrobeats R&B Wave (F# Minor)',
    category: 'Genre',
    description: 'Sweet interlocking syncopated chords and melodic bounce in F# Minor.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[9],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 6, // F#
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 80,
      humanizeVelRange: 18,
      randomMinVel: 55,
      randomMaxVel: 115,
      humanizeTimingAmount: 0.03,
    },
  },
];

const LOCAL_STORAGE_KEY = 'midilens_user_presets_v1';
const FAVORITES_STORAGE_KEY = 'midilens_favorite_presets_v1';

export function loadUserPresets(): MidiLensPreset[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading user presets from localStorage', err);
    return [];
  }
}

export function saveUserPresets(presets: MidiLensPreset[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(presets));
  } catch (err) {
    console.error('Error saving user presets to localStorage', err);
  }
}

export function loadFavoriteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function saveFavoriteIds(favorites: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
  } catch (err) {
    console.error('Error saving favorites to localStorage', err);
  }
}

export function createNewUserPreset(
  name: string,
  category: 'User' | 'Genre' | 'Groove',
  description: string,
  settings: PresetSettings
): MidiLensPreset {
  return {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim() || 'Custom Preset',
    category,
    description: description.trim() || 'Custom user preset saved in MidiLens.',
    isFactory: false,
    createdAt: new Date().toISOString(),
    settings: { ...settings },
  };
}

export function exportPresetsToJson(presets: MidiLensPreset[]): string {
  return JSON.stringify(presets, null, 2);
}

export function importPresetsFromJson(jsonStr: string): MidiLensPreset[] {
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('Invalid JSON format: expected an array of presets');

  const valid: MidiLensPreset[] = [];
  for (const item of parsed) {
    if (item.name && item.settings) {
      valid.push({
        ...item,
        id: item.isFactory ? item.id : 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        isFactory: false, // imported are always user category
      });
    }
  }
  return valid;
}
