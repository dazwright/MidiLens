import { ScaleType, QuantizeGrid, MidiSequence, MidiNote } from './types';
import { PRESET_SEQUENCES } from './midiParser';
import { SCALE_DEFINITIONS, QUANTIZE_GRID_DIVISIONS } from './scaleUtils';

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

export interface PresetPackInfo {
  name: string;
  description: string;
}

export const PRESET_PACKS: PresetPackInfo[] = [
  { name: 'Soul, Jazz & Gospel', description: 'Extended 9th/11th/13th voicings, chromatic passing chords & velvet R&B keys' },
  { name: 'Hip-Hop, Trap & Drill', description: 'Swung boom bap chops, dark bells, G-Funk leads & haunting UK drill pianos' },
  { name: 'House, Techno & Trance', description: 'Club stabs, deep Rhodes chords, hypnotic arps, 303 acid & euphoric trance' },
  { name: 'UKG & Drum & Bass', description: 'Skippy 2-step organ chords, rolling liquid DnB pianos & dark neurofunk riffs' },
  { name: 'Synthwave, Disco & Pop', description: 'Outrun arps, French Touch octave basslines & hyperpop glitch plucks' },
  { name: 'Ambient & Cinematic', description: 'Widescreen add9 scores, ethereal pad washes, Lydian shoegaze & dark drones' },
  { name: 'World & Latin Groove', description: 'Andalusian flamenco, E Dorian funk, Afrobeats, bossa nova & dembow plucks' },
];

export interface MidiLensPreset {
  id: string;
  name: string;
  pack?: string;
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
    pack: 'Soul, Jazz & Gospel',
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
    pack: 'Hip-Hop, Trap & Drill',
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
    pack: 'Hip-Hop, Trap & Drill',
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
    pack: 'House, Techno & Trance',
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
    pack: 'Ambient & Cinematic',
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
    pack: 'Soul, Jazz & Gospel',
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
    pack: 'Synthwave, Disco & Pop',
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
    pack: 'World & Latin Groove',
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
    pack: 'World & Latin Groove',
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
    pack: 'World & Latin Groove',
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
  {
    id: 'factory_ambient_wash',
    name: 'Ambient Ethereal Wash (Eb Major)',
    pack: 'Ambient & Cinematic',
    category: 'Genre',
    description: 'Slow floating pad swells with wide dynamic headroom and Ebmaj9 / Abmaj7 extended voicings.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[10],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 3, // Eb
      scaleType: 'major',
      scaleLock: true,
      quantizeGrid: '1/4',
      quantizeStrength: 50,
      humanizeVelRange: 32,
      randomMinVel: 30,
      randomMaxVel: 95,
      humanizeTimingAmount: 0.06,
    },
  },
  {
    id: 'factory_dark_ambient',
    name: 'Dark Ambient Drone (C Phrygian)',
    pack: 'Ambient & Cinematic',
    category: 'Genre',
    description: 'Subterranean C pedal drone with b2/b6 tritone tension clusters and ominous cinematic swells.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[11],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 0, // C
      scaleType: 'phrygian',
      scaleLock: true,
      quantizeGrid: '1/4',
      quantizeStrength: 40,
      humanizeVelRange: 35,
      randomMinVel: 25,
      randomMaxVel: 110,
      humanizeTimingAmount: 0.08,
    },
  },
  {
    id: 'factory_synthwave_outrun',
    name: 'Synthwave Outrun Bass (F Minor)',
    pack: 'Synthwave, Disco & Pop',
    category: 'Genre',
    description: 'High-octane driving 1/16th octaved saw bassline with tight velocity accent pumps.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[12],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 5, // F
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 100,
      humanizeVelRange: 8,
      randomMinVel: 80,
      randomMaxVel: 127,
      humanizeTimingAmount: 0.005,
    },
  },
  {
    id: 'factory_deep_house',
    name: 'Deep House Velvet (A Minor)',
    pack: 'House, Techno & Trance',
    category: 'Genre',
    description: 'Classic 90s Chicago/Detroit Rhodes minor 9th chords with warm swing and syncopation.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[13],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 9, // A
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 85,
      humanizeVelRange: 16,
      randomMinVel: 60,
      randomMaxVel: 118,
      humanizeTimingAmount: 0.025,
    },
  },
  {
    id: 'factory_berlin_techno',
    name: 'Berlin Techno Hypnotic (C Minor)',
    pack: 'House, Techno & Trance',
    category: 'Genre',
    description: 'Driving 132 BPM peak-time industrial mono synth loop with aggressive velocity accents.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[14],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 0, // C
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 100,
      humanizeVelRange: 10,
      randomMinVel: 70,
      randomMaxVel: 125,
      humanizeTimingAmount: 0.008,
    },
  },
  {
    id: 'factory_acid_303',
    name: 'Acid 303 Resonant Line (D Minor)',
    pack: 'House, Techno & Trance',
    category: 'Genre',
    description: 'Iconic squelching 303 acid sequence with slides, accents, and high octave jumps in D Minor.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[15],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 2, // D
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 95,
      humanizeVelRange: 14,
      randomMinVel: 65,
      randomMaxVel: 127,
      humanizeTimingAmount: 0.012,
    },
  },
  {
    id: 'factory_gospel_passing',
    name: 'Gospel Passing Chords (Ab Major)',
    pack: 'Soul, Jazz & Gospel',
    category: 'Groove',
    description: 'Rich church AbMaj9, C7b9, Fm11, and Adim7 passing voicings with relaxed pocket feel.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[16],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 8, // Ab
      scaleType: 'major',
      scaleLock: false,
      quantizeGrid: '1/16',
      quantizeStrength: 75,
      humanizeVelRange: 24,
      randomMinVel: 45,
      randomMaxVel: 112,
      humanizeTimingAmount: 0.04,
    },
  },
  {
    id: 'factory_trap_soul_keys',
    name: 'Modern Trap Soul Keys (F# Minor)',
    pack: 'Soul, Jazz & Gospel',
    category: 'Genre',
    description: 'Late-night F#m11 and Dmaj9 electric piano chords with subtle top-line echoes.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[17],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 6, // F#
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 80,
      humanizeVelRange: 20,
      randomMinVel: 48,
      randomMaxVel: 110,
      humanizeTimingAmount: 0.035,
    },
  },
  {
    id: 'factory_boom_bap_rhodes',
    name: '90s Boom Bap Rhodes (D Minor)',
    pack: 'Hip-Hop, Trap & Drill',
    category: 'Groove',
    description: 'Dusty Dilla-inspired swung minor 9th Rhodes chops with altered V7 turnaround.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[18],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 2, // D
      scaleType: 'minor',
      scaleLock: false,
      quantizeGrid: '1/16T',
      quantizeStrength: 65,
      humanizeVelRange: 26,
      randomMinVel: 42,
      randomMaxVel: 108,
      humanizeTimingAmount: 0.045,
    },
  },
  {
    id: 'factory_gfunk_lead',
    name: 'West Coast G-Funk Lead (G Minor)',
    pack: 'Hip-Hop, Trap & Drill',
    category: 'Genre',
    description: 'Classic West Coast high sine whistle melody layered over funky G1/G2 octave bass.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[19],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 7, // G
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 90,
      humanizeVelRange: 14,
      randomMinVel: 65,
      randomMaxVel: 120,
      humanizeTimingAmount: 0.02,
    },
  },
  {
    id: 'factory_uk_drill_piano',
    name: 'UK Drill Dark Piano (C Minor)',
    pack: 'Hip-Hop, Trap & Drill',
    category: 'Genre',
    description: 'Haunting 142 BPM C Minor triplet piano arpeggio with b9 tension and deep sub roots.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[20],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 0, // C
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16T',
      quantizeStrength: 95,
      humanizeVelRange: 12,
      randomMinVel: 70,
      randomMaxVel: 124,
      humanizeTimingAmount: 0.012,
    },
  },
  {
    id: 'factory_melodic_techno_arp',
    name: 'Melodic Techno Pluck Arp (G Minor)',
    pack: 'House, Techno & Trance',
    category: 'Genre',
    description: 'Hypnotic 16th-note minor 9th pluck sequence with driving sub bass in G Minor.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[21],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 7, // G
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 100,
      humanizeVelRange: 10,
      randomMinVel: 72,
      randomMaxVel: 122,
      humanizeTimingAmount: 0.008,
    },
  },
  {
    id: 'factory_prog_house_euphoria',
    name: 'Progressive House Euphoria (E Major)',
    pack: 'House, Techno & Trance',
    category: 'Genre',
    description: 'Anthemic dotted-8th chord plucks with add9 lifts and driving festival energy.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[22],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 4, // E
      scaleType: 'major',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 100,
      humanizeVelRange: 10,
      randomMinVel: 75,
      randomMaxVel: 122,
      humanizeTimingAmount: 0.01,
    },
  },
  {
    id: 'factory_uplifting_trance',
    name: 'Uplifting Trance Anthem (A Minor)',
    pack: 'House, Techno & Trance',
    category: 'Genre',
    description: '138 BPM euphoric supersaw chord progression with soaring high-octave arp leads.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[23],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 9, // A
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 100,
      humanizeVelRange: 8,
      randomMinVel: 80,
      randomMaxVel: 127,
      humanizeTimingAmount: 0.005,
    },
  },
  {
    id: 'factory_ukg_2step',
    name: 'UK Garage 2-Step Chords (C# Minor)',
    pack: 'UKG & Drum & Bass',
    category: 'Groove',
    description: 'Skippy London 2-step M1 organ/piano min9 stabs locked over a tight sub bassline.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[24],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 1, // C#
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 92,
      humanizeVelRange: 14,
      randomMinVel: 68,
      randomMaxVel: 122,
      humanizeTimingAmount: 0.018,
    },
  },
  {
    id: 'factory_liquid_dnb',
    name: 'Liquid DnB Piano Lush (Eb Minor)',
    pack: 'UKG & Drum & Bass',
    category: 'Genre',
    description: 'Rolling 174 BPM Ebm9 and CbMaj7 liquid drum & bass piano chords with topline shimmer.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[25],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 3, // Eb
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 90,
      humanizeVelRange: 16,
      randomMinVel: 62,
      randomMaxVel: 120,
      humanizeTimingAmount: 0.02,
    },
  },
  {
    id: 'factory_neurofunk_reese',
    name: 'Neurofunk Dark Reese Riff (F Phrygian)',
    pack: 'UKG & Drum & Bass',
    category: 'Genre',
    description: 'Aggressive 172 BPM F Phrygian bass riff using b2 and tritone pitch stabs.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[26],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 5, // F
      scaleType: 'phrygian',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 100,
      humanizeVelRange: 6,
      randomMinVel: 90,
      randomMaxVel: 127,
      humanizeTimingAmount: 0.004,
    },
  },
  {
    id: 'factory_nudisco_octave',
    name: 'Nu-Disco Funky Octave Bass (A Minor)',
    pack: 'Synthwave, Disco & Pop',
    category: 'Groove',
    description: 'French Touch bouncy 16th-note octave bassline paired with crisp disco string chops.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[27],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 9, // A
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 95,
      humanizeVelRange: 12,
      randomMinVel: 70,
      randomMaxVel: 124,
      humanizeTimingAmount: 0.015,
    },
  },
  {
    id: 'factory_hyperpop_plucks',
    name: 'Hyperpop Glitchy Plucks (D Major)',
    pack: 'Synthwave, Disco & Pop',
    category: 'Genre',
    description: '156 BPM bright high-energy pop chord hits with rapid two-octave synth leaps.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[28],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 2, // D
      scaleType: 'major',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 100,
      humanizeVelRange: 5,
      randomMinVel: 95,
      randomMaxVel: 127,
      humanizeTimingAmount: 0.002,
    },
  },
  {
    id: 'factory_shoegaze_wall',
    name: 'Dreamy Shoegaze Wall (E Lydian)',
    pack: 'Ambient & Cinematic',
    category: 'Genre',
    description: 'Lush sustained Emaj7#11 chord washes in E Lydian with gentle strummed cascades.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[29],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 4, // E
      scaleType: 'lydian',
      scaleLock: true,
      quantizeGrid: '1/8',
      quantizeStrength: 55,
      humanizeVelRange: 28,
      randomMinVel: 38,
      randomMaxVel: 102,
      humanizeTimingAmount: 0.055,
    },
  },
  {
    id: 'factory_bossa_nova',
    name: 'Bossa Nova Nylon Guitar (F Major)',
    pack: 'World & Latin Groove',
    category: 'Groove',
    description: 'Syncopated Rio jazz-bossa chord comping (FMaj7 - G13 - Gm7 - C9) over alternating bass.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[30],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 5, // F
      scaleType: 'major',
      scaleLock: false,
      quantizeGrid: '1/16',
      quantizeStrength: 75,
      humanizeVelRange: 22,
      randomMinVel: 45,
      randomMaxVel: 108,
      humanizeTimingAmount: 0.038,
    },
  },
  {
    id: 'factory_reggaeton_perreo',
    name: 'Reggaeton Perreo Pluck (B Minor)',
    pack: 'World & Latin Groove',
    category: 'Groove',
    description: 'Syncopated dembow chord pluck rhythm (Bm - G - D - A) locked over deep sub roots.',
    isFactory: true,
    sequence: PRESET_SEQUENCES[31],
    settings: {
      ...DEFAULT_PRESET_SETTINGS,
      scaleRoot: 11, // B
      scaleType: 'minor',
      scaleLock: true,
      quantizeGrid: '1/16',
      quantizeStrength: 95,
      humanizeVelRange: 10,
      randomMinVel: 75,
      randomMaxVel: 122,
      humanizeTimingAmount: 0.012,
    },
  },
];

const LOCAL_STORAGE_KEY = 'midilens_user_presets_v1';
const FAVORITES_STORAGE_KEY = 'midilens_favorite_presets_v1';

const VALID_CATEGORIES = new Set(['Factory', 'User', 'Genre', 'Groove']);

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  return typeof val === 'number' && Number.isFinite(val) ? Math.min(max, Math.max(min, val)) : fallback;
}

function sanitizePresetSettings(raw: unknown): PresetSettings {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const scaleType =
    typeof obj.scaleType === 'string' && obj.scaleType in SCALE_DEFINITIONS
      ? (obj.scaleType as ScaleType)
      : DEFAULT_PRESET_SETTINGS.scaleType;
  const quantizeGrid =
    typeof obj.quantizeGrid === 'string' && obj.quantizeGrid in QUANTIZE_GRID_DIVISIONS
      ? (obj.quantizeGrid as QuantizeGrid)
      : DEFAULT_PRESET_SETTINGS.quantizeGrid;

  return {
    scaleRoot: Math.round(clampNum(obj.scaleRoot, 0, 11, DEFAULT_PRESET_SETTINGS.scaleRoot)),
    scaleType,
    scaleLock: typeof obj.scaleLock === 'boolean' ? obj.scaleLock : DEFAULT_PRESET_SETTINGS.scaleLock,
    quantizeGrid,
    quantizeStrength: Math.round(clampNum(obj.quantizeStrength, 0, 100, DEFAULT_PRESET_SETTINGS.quantizeStrength)),
    humanizeVelRange: Math.round(clampNum(obj.humanizeVelRange, 1, 64, DEFAULT_PRESET_SETTINGS.humanizeVelRange)),
    randomMinVel: Math.round(clampNum(obj.randomMinVel, 1, 127, DEFAULT_PRESET_SETTINGS.randomMinVel)),
    randomMaxVel: Math.round(clampNum(obj.randomMaxVel, 1, 127, DEFAULT_PRESET_SETTINGS.randomMaxVel)),
    humanizeTimingAmount: clampNum(obj.humanizeTimingAmount, 0, 0.25, DEFAULT_PRESET_SETTINGS.humanizeTimingAmount),
    transpose: Math.round(clampNum(obj.transpose, -24, 24, DEFAULT_PRESET_SETTINGS.transpose)),
    speedMultiplier: clampNum(obj.speedMultiplier, 0.25, 4.0, DEFAULT_PRESET_SETTINGS.speedMultiplier),
    velocityScale: clampNum(obj.velocityScale, 0.1, 2.0, DEFAULT_PRESET_SETTINGS.velocityScale),
    velocityOffset: Math.round(clampNum(obj.velocityOffset, -64, 64, DEFAULT_PRESET_SETTINGS.velocityOffset)),
  };
}

function sanitizePresetSequence(raw: unknown): MidiSequence | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.notes)) return undefined;

  const notes: MidiNote[] = [];
  const limit = Math.min(obj.notes.length, 4096);
  for (let i = 0; i < limit; i++) {
    const n = obj.notes[i];
    if (!n || typeof n !== 'object') continue;
    const rec = n as Record<string, unknown>;
    notes.push({
      id: typeof rec.id === 'number' && Number.isFinite(rec.id) ? rec.id : i + 1,
      pitch: Math.round(clampNum(rec.pitch, 0, 127, 60)),
      startPpq: clampNum(rec.startPpq, 0, 4096, 0),
      durationPpq: clampNum(rec.durationPpq, 0.02, 256, 0.25),
      velocity: clampNum(rec.velocity, 0.01, 1.0, 0.8),
      channel: Math.round(clampNum(rec.channel, 1, 16, 1)),
    });
  }

  return {
    name: typeof obj.name === 'string' ? obj.name.slice(0, 120) : 'Imported Groove',
    bpm: Math.round(clampNum(obj.bpm, 20, 320, 120)),
    timeSigNumerator: Math.round(clampNum(obj.timeSigNumerator, 1, 16, 4)),
    timeSigDenominator: Math.round(clampNum(obj.timeSigDenominator, 1, 16, 4)),
    totalLengthPpq: clampNum(obj.totalLengthPpq, 1, 4096, 16),
    notes,
  };
}

export function loadUserPresets(): MidiLensPreset[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && typeof item.name === 'string'))
      .slice(0, 250)
      .map((item, idx) => ({
        id: typeof item.id === 'string' ? item.id.slice(0, 80) : `user_saved_${idx}`,
        name: String(item.name).slice(0, 100),
        pack: typeof item.pack === 'string' ? item.pack.slice(0, 80) : 'User Presets',
        category: (typeof item.category === 'string' && VALID_CATEGORIES.has(item.category)
          ? item.category
          : 'User') as MidiLensPreset['category'],
        description: typeof item.description === 'string' ? item.description.slice(0, 240) : '',
        isFactory: false,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt.slice(0, 40) : undefined,
        settings: sanitizePresetSettings(item.settings),
        sequence: sanitizePresetSequence(item.sequence),
      }));
  } catch {
    return [];
  }
}

export function saveUserPresets(presets: MidiLensPreset[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(presets.slice(0, 250)));
  } catch {
    // Ignore quota exceeded errors gracefully
  }
}

export function loadFavoriteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((v): v is string => typeof v === 'string').slice(0, 500));
  } catch {
    return new Set();
  }
}

export function saveFavoriteIds(favorites: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites).slice(0, 500)));
  } catch {
    // Ignore quota exceeded errors gracefully
  }
}

export function createNewUserPreset(
  name: string,
  category: 'User' | 'Genre' | 'Groove',
  description: string,
  settings: PresetSettings,
  pack = 'User Presets'
): MidiLensPreset {
  return {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim() || 'Custom Preset',
    pack,
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
  if (jsonStr.length > 2 * 1024 * 1024) {
    throw new Error('Preset file exceeds 2 MB limit');
  }
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('Invalid JSON format: expected an array of presets');

  const valid: MidiLensPreset[] = [];
  const limit = Math.min(parsed.length, 200);
  for (let i = 0; i < limit; i++) {
    const item = parsed[i];
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.name !== 'string' || !rec.name.trim() || !rec.settings || typeof rec.settings !== 'object') {
      continue;
    }

    const sanitizedSeq = sanitizePresetSequence(rec.sequence);
    valid.push({
      id: 'user_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 7),
      name: rec.name.trim().slice(0, 100),
      pack: typeof rec.pack === 'string' && rec.pack.trim() ? rec.pack.trim().slice(0, 80) : 'Imported Presets',
      category: (typeof rec.category === 'string' && VALID_CATEGORIES.has(rec.category) && rec.category !== 'Factory'
        ? rec.category
        : 'User') as MidiLensPreset['category'],
      description:
        typeof rec.description === 'string' && rec.description.trim()
          ? rec.description.trim().slice(0, 240)
          : 'Imported preset.',
      isFactory: false,
      createdAt: new Date().toISOString(),
      settings: sanitizePresetSettings(rec.settings),
      ...(sanitizedSeq ? { sequence: sanitizedSeq } : {}),
    });
  }
  return valid;
}
