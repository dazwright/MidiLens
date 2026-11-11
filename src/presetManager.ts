import { ScaleType, QuantizeGrid, PluginParameters } from './types';

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
    description: 'Natural minor scale lock with soft velocity jitter and 1/16th swing timing.',
    isFactory: true,
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
    name: 'Lo-Fi Loose Swing',
    category: 'Groove',
    description: 'Pentatonic minor with high velocity jitter and micro-timing displacement.',
    isFactory: true,
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 0,
      scaleType: 'pentatonic_minor',
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
    name: 'Trap Hard Grid 1/32',
    category: 'Genre',
    description: 'Rigid 1/32nd quantization grid with high velocity scale for hard bounces.',
    isFactory: true,
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 1, // C#
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
    name: 'House Driving 1/16 Beat',
    category: 'Genre',
    description: 'Dorian mode with tight 1/16th grid and punchy velocity dynamics.',
    isFactory: true,
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 2, // D
      scaleType: 'dorian',
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
    name: 'Cinematic Epic Major',
    category: 'Factory',
    description: 'Lydian mode with wide velocity scaling and full octave transposition.',
    isFactory: true,
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 5, // F
      scaleType: 'lydian',
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
    name: 'Jazz Blues Chromatic',
    category: 'Groove',
    description: 'Blues scale with scale lock off for passing chromatic lead runs.',
    isFactory: true,
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
