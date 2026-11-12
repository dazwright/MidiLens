import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MidiSequence, PluginParameters, KeyResult, ScannedMidiFile, ScaleType, QuantizeGrid } from '../types';
import { PRESET_SEQUENCES, parseMidiFile, serializeMidiFile } from '../midiParser';
import { analyzeKeyFromNotes, calculateSemitoneOffsetToTarget, getNoteName } from '../keyDetection';
import {
  SCALE_DEFINITIONS,
  QUANTIZE_GRID_DIVISIONS,
  snapPitchToScale,
  quantizePpq,
  humanizeNotesVelocity,
  randomizeNotesVelocityRange,
  humanizeNotesTiming,
  harmonizeNotes,
  HarmonizeInterval,
} from '../scaleUtils';
import {
  MidiLensPreset,
  PresetSettings,
  FACTORY_PRESETS,
} from '../presetManager';
import { synthAudioEngine } from '../audioEngine';
import { PianoRoll } from './PianoRoll';
import { PresetDrawer } from './PresetDrawer';
import { ChordVisualizer } from './ChordVisualizer';
import { ArpeggiatorControls } from './ArpeggiatorControls';
import { MidiExportModal } from './MidiExportModal';
import { arpeggiateNotes } from '../arpUtils';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Upload,
  Download,
  Music,
  Sliders,
  Sparkles,
  Zap,
  Gauge,
  Radio,
  FolderSearch,
  Search,
  Lock,
  Unlock,
  Wand2,
  X,
  FileMusic,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Bookmark,
  ChevronDown,
  Undo2,
  Redo2,
  Loader2,
  AlertCircle,
  StopCircle,
  Dices,
  Minus,
  Plus,
  CheckSquare,
  Activity,
} from 'lucide-react';

interface HistorySnapshot {
  sequence: MidiSequence;
  description: string;
}

export const PluginSimulator: React.FC = () => {
  const [sequence, setSequence] = useState<MidiSequence>(PRESET_SEQUENCES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPpq, setPlayheadPpq] = useState(0);

  // Undo / Redo History State
  const [pastHistory, setPastHistory] = useState<HistorySnapshot[]>([]);
  const [futureHistory, setFutureHistory] = useState<HistorySnapshot[]>([]);

  // Active Settings Preset State
  const [activeLensPreset, setActiveLensPreset] = useState<MidiLensPreset>(FACTORY_PRESETS[0]);
  const [showPresetDrawer, setShowPresetDrawer] = useState(false);

  const [params, setParams] = useState<PluginParameters>({
    transpose: FACTORY_PRESETS[0].settings.transpose,
    speedMultiplier: FACTORY_PRESETS[0].settings.speedMultiplier,
    velocityScale: FACTORY_PRESETS[0].settings.velocityScale,
    velocityOffset: FACTORY_PRESETS[0].settings.velocityOffset,
    syncMode: 'audition',
    loop: true,
    targetKeyRoot: 0,
    targetKeyIsMinor: true,
    targetScaleType: 'minor',
    projectKeyRoot: 0,
    projectScaleType: 'minor',
    scaleRoot: FACTORY_PRESETS[0].settings.scaleRoot,
    scaleType: FACTORY_PRESETS[0].settings.scaleType,
    scaleLock: FACTORY_PRESETS[0].settings.scaleLock,
    quantizeGrid: FACTORY_PRESETS[0].settings.quantizeGrid,
    arpEnabled: false,
    arpMode: 'up',
    arpRate: '1/16',
    arpOctaves: 1,
    arpGate: 0.75,
  });

  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<number>>(new Set());
  const [activePitches, setActivePitches] = useState<number[]>([]);

  // Panel & Modal visibility toggles
  const [showChordVisualizer, setShowChordVisualizer] = useState(false);
  const [showArpPanel, setShowArpPanel] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [keyResult, setKeyResult] = useState<KeyResult>(() => analyzeKeyFromNotes(PRESET_SEQUENCES[0].notes));
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Folder scanning state (non-blocking chunked scan & streaming progress)
  const [scannedFiles, setScannedFiles] = useState<ScannedMidiFile[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ scanned: 0, total: 0, found: 0 });
  const [currentScanningFolder, setCurrentScanningFolder] = useState('');
  const [visibleLibraryCount, setVisibleLibraryCount] = useState(50);
  const isCancelledRef = useRef(false);
  const currentDiscoveredRef = useRef<ScannedMidiFile[]>([]);

  // Active Source Selection (preset pattern, scanned folder file, or uploaded single file)
  const [activeSourceType, setActiveSourceType] = useState<'preset' | 'scanned' | 'custom'>('preset');
  const [currentScannedFileIdx, setCurrentScannedFileIdx] = useState<number>(-1);
  const [isWaitingFolderAuth, setIsWaitingFolderAuth] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  // Humanize panel state
  const [showHumanizeModal, setShowHumanizeModal] = useState(false);
  const [humanizeVelRange, setHumanizeVelRange] = useState(FACTORY_PRESETS[0].settings.humanizeVelRange);
  const [randomMinVel, setRandomMinVel] = useState(FACTORY_PRESETS[0].settings.randomMinVel);
  const [randomMaxVel, setRandomMaxVel] = useState(FACTORY_PRESETS[0].settings.randomMaxVel);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Keep ref to sequence so pushHistorySnapshot can capture the exact pre-mutation state synchronously
  const sequenceRef = useRef<MidiSequence>(sequence);
  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);

  // Push snapshot before performing destructive sequence changes (maintains up to 50 historical steps)
  const pushHistorySnapshot = useCallback(
    (description: string) => {
      const snap = JSON.parse(JSON.stringify(sequenceRef.current));
      setPastHistory((prev) => [
        ...prev.slice(-49), // Retains up to 50 undo states
        {
          sequence: snap,
          description,
        },
      ]);
      setFutureHistory([]); // Clear redo
    },
    []
  );

  const handleUndo = useCallback(() => {
    setPastHistory((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);

      setFutureHistory((prevFuture) => [
        {
          sequence: JSON.parse(JSON.stringify(sequenceRef.current)),
          description: 'Undo',
        },
        ...prevFuture,
      ]);

      setSequence(previous.sequence);
      return newPast;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFutureHistory((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setPastHistory((prevPast) => [
        ...prevPast,
        {
          sequence: JSON.parse(JSON.stringify(sequenceRef.current)),
          description: 'Redo',
        },
      ]);

      setSequence(next.sequence);
      return newFuture;
    });
  }, []);

  // Global Keyboard Shortcuts (Cmd+Z / Ctrl+Z for Undo, Cmd+Shift+Z / Ctrl+Y for Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Apply a loaded MidiLens Preset
  const handleApplyLensPreset = useCallback((preset: MidiLensPreset) => {
    setActiveLensPreset(preset);
    const s = preset.settings;

    setParams((prev) => ({
      ...prev,
      scaleRoot: s.scaleRoot,
      scaleType: s.scaleType,
      scaleLock: s.scaleLock,
      quantizeGrid: s.quantizeGrid,
      transpose: s.transpose,
      speedMultiplier: s.speedMultiplier,
      velocityScale: s.velocityScale,
      velocityOffset: s.velocityOffset,
    }));

    setHumanizeVelRange(s.humanizeVelRange);
    setRandomMinVel(s.randomMinVel);
    setRandomMaxVel(s.randomMaxVel);

    // If preset contains an associated musical sequence, load it directly
    if (preset.sequence) {
      pushHistorySnapshot(`Load Preset Groove (${preset.name})`);
      synthAudioEngine.stop();
      setPlayheadPpq(0);
      setSequence(preset.sequence);
    }
  }, [pushHistorySnapshot]);

  // Current Settings Payload for Saving New Preset
  const getCurrentSettingsPayload = (): PresetSettings => ({
    scaleRoot: params.scaleRoot,
    scaleType: params.scaleType,
    scaleLock: params.scaleLock,
    quantizeGrid: params.quantizeGrid,
    quantizeStrength: 100,
    humanizeVelRange,
    randomMinVel,
    randomMaxVel,
    humanizeTimingAmount: 0.03,
    transpose: params.transpose,
    speedMultiplier: params.speedMultiplier,
    velocityScale: params.velocityScale,
    velocityOffset: params.velocityOffset,
  });

  // Synchronize Audio Engine
  useEffect(() => {
    synthAudioEngine.setSequence(sequence.notes, sequence.totalLengthPpq, sequence.bpm);
  }, [sequence]);

  useEffect(() => {
    synthAudioEngine.setParameters(params);
  }, [params]);

  useEffect(() => {
    synthAudioEngine.setOnPlayheadUpdate((ppq) => {
      setPlayheadPpq(ppq);
    });
    synthAudioEngine.setOnStateChange((playing) => {
      setIsPlaying(playing);
    });
    synthAudioEngine.setOnActivePitches((pitches) => {
      setActivePitches(pitches);
    });
  }, []);

  // Apply current arpeggiator settings directly to sequence notes
  const handleApplyArpToSequence = useCallback(() => {
    pushHistorySnapshot(`Apply Arp (${params.arpMode.toUpperCase()} ${params.arpRate})`);
    const arped = arpeggiateNotes(sequence.notes, sequence.totalLengthPpq, {
      mode: params.arpMode,
      rate: params.arpRate,
      octaves: params.arpOctaves,
      gate: params.arpGate,
    });
    setSequence((s) => ({ ...s, notes: arped }));
  }, [sequence.notes, sequence.totalLengthPpq, params.arpMode, params.arpRate, params.arpOctaves, params.arpGate]);

  // Recalculate Key Detection whenever sequence notes change and auto-sync SCALE box
  useEffect(() => {
    const res = analyzeKeyFromNotes(sequence.notes);
    setKeyResult(res);
    if (res.confidence > 0.05 && sequence.notes.length > 0) {
      setParams((prev) => ({
        ...prev,
        scaleRoot: res.rootPitch,
        scaleType: res.isMinor ? 'minor' : 'major',
        targetKeyRoot: res.rootPitch,
        targetKeyIsMinor: res.isMinor,
        targetScaleType: res.isMinor ? 'minor' : 'major',
      }));
    }
  }, [sequence.name, sequence.notes]);

  // Transport Controls
  const togglePlay = () => {
    if (isPlaying) {
      synthAudioEngine.pause();
    } else {
      synthAudioEngine.play();
    }
  };

  const stopPlayback = () => {
    synthAudioEngine.stop();
    setPlayheadPpq(0);
  };

  const handleSeek = (ppq: number) => {
    synthAudioEngine.seek(ppq);
    setPlayheadPpq(ppq);
  };

  // Manual Tempo Handling (active when syncMode === 'audition')
  const [tempoInputValue, setTempoInputValue] = useState(String(sequence.bpm));
  const [isTapActive, setIsTapActive] = useState(false);
  const tapTimesRef = useRef<number[]>([]);
  const tapTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setTempoInputValue(String(sequence.bpm));
  }, [sequence.bpm]);

  const handleTempoChange = useCallback((newBpm: number) => {
    const clamped = Math.round(Math.min(320, Math.max(20, newBpm)));
    if (!isNaN(clamped)) {
      setSequence((prev) => ({
        ...prev,
        bpm: clamped,
      }));
      setTempoInputValue(String(clamped));
      synthAudioEngine.setTempo(clamped);
    }
  }, []);

  const stepTempo = useCallback((delta: number) => {
    setSequence((prev) => {
      const nextBpm = Math.round(Math.min(320, Math.max(20, prev.bpm + delta)));
      setTempoInputValue(String(nextBpm));
      synthAudioEngine.setTempo(nextBpm);
      return { ...prev, bpm: nextBpm };
    });
  }, []);

  const [isTempoDragging, setIsTempoDragging] = useState(false);
  const tempoInputRef = useRef<HTMLInputElement>(null);

  const handleTempoMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    // Only drag on primary left click
    if (e.button !== 0) return;

    const startY = e.clientY;
    const startBpm = sequence.bpm;
    let didMove = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY; // Upward is positive
      if (!didMove && Math.abs(deltaY) > 2) {
        didMove = true;
        setIsTempoDragging(true);
        document.body.style.cursor = 'ns-resize';
      }

      if (didMove) {
        // Normal sensitivity: 1px = ~0.65 BPM; Shift held = fine 0.15 BPM
        const rate = moveEvent.shiftKey ? 0.15 : 0.65;
        const targetBpm = Math.round(Math.min(320, Math.max(20, startBpm + deltaY * rate)));
        handleTempoChange(targetBpm);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      setIsTempoDragging(false);

      if (!didMove) {
        // It was a simple click without drag: focus and select all text so user can type
        tempoInputRef.current?.focus();
        tempoInputRef.current?.select();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTapTempo = useCallback(() => {
    setIsTapActive(true);
    if (tapTimeoutRef.current) {
      window.clearTimeout(tapTimeoutRef.current);
    }
    tapTimeoutRef.current = window.setTimeout(() => setIsTapActive(false), 150);

    const now = performance.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 3000);
    taps.push(now);
    tapTimesRef.current = taps;

    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgIntervalMs > 0) {
        const calculatedBpm = Math.round(60000 / avgIntervalMs);
        handleTempoChange(calculatedBpm);
      }
    }
  }, [handleTempoChange]);

  // Sync To Project Key (sets active scale & computes transposition matching project key)
  const syncToProjectKey = () => {
    pushHistorySnapshot(`Sync to Project Key (${getNoteName(params.projectKeyRoot)} ${SCALE_DEFINITIONS[params.projectScaleType]?.name || params.projectScaleType})`);
    const semitones = calculateSemitoneOffsetToTarget(keyResult.rootPitch, params.projectKeyRoot);
    setParams((prev) => ({
      ...prev,
      scaleRoot: prev.projectKeyRoot,
      scaleType: prev.projectScaleType,
      transpose: semitones,
    }));
  };

  // Target Key Match (sets scale and applies offset to target key)
  const applyTargetKeyMatch = () => {
    pushHistorySnapshot(`Match Target Key (${getNoteName(params.targetKeyRoot)} ${SCALE_DEFINITIONS[params.targetScaleType]?.name || params.targetScaleType})`);
    const semitones = calculateSemitoneOffsetToTarget(keyResult.rootPitch, params.targetKeyRoot);
    setParams((prev) => ({
      ...prev,
      scaleRoot: prev.targetKeyRoot,
      scaleType: prev.targetScaleType,
      transpose: semitones,
    }));
  };

  // Harmonise Notes (+- 3rds, +- 5ths, +- Octaves)
  const applyHarmonize = (interval: HarmonizeInterval) => {
    pushHistorySnapshot(`Harmonise ${interval}`);
    const harmonized = harmonizeNotes(
      sequence.notes,
      selectedNoteIds,
      interval,
      params.scaleRoot,
      params.scaleType
    );
    setSequence((s) => ({ ...s, notes: harmonized }));
  };

  // Legacy DAW Match
  const applyDawKeyMatch = () => {
    const semitones = calculateSemitoneOffsetToTarget(keyResult.rootPitch, params.targetKeyRoot);
    setParams((prev) => ({ ...prev, transpose: semitones }));
  };

  // Quantize Timing to Grid
  const applyTimingQuantize = () => {
    pushHistorySnapshot(`Quantize Timing (${params.quantizeGrid})`);
    const updated = sequence.notes.map((n) => {
      const qStart = quantizePpq(n.startPpq, params.quantizeGrid);
      const qDuration = Math.max(
        QUANTIZE_GRID_DIVISIONS[params.quantizeGrid].ppq,
        quantizePpq(n.durationPpq, params.quantizeGrid)
      );
      return { ...n, startPpq: qStart, durationPpq: qDuration };
    });
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Quantize Pitch to Selected Scale
  const applyScaleQuantize = () => {
    if (params.scaleType === 'chromatic') return;
    pushHistorySnapshot(`Quantize Scale (${SCALE_DEFINITIONS[params.scaleType]?.name || params.scaleType})`);
    const updated = sequence.notes.map((n) => {
      const snapped = snapPitchToScale(n.pitch, params.scaleRoot, params.scaleType);
      return { ...n, pitch: snapped };
    });
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Humanize Velocity
  const applyHumanizeVelocity = () => {
    pushHistorySnapshot(`Humanize Velocity (\u00B1${humanizeVelRange})`);
    const updated = humanizeNotesVelocity(sequence.notes, new Set(), humanizeVelRange);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Randomize Velocity within Min/Max Range
  const applyRandomizeVelocityRange = () => {
    pushHistorySnapshot(`Randomize Velocity Range (${randomMinVel}-${randomMaxVel})`);
    const updated = randomizeNotesVelocityRange(
      sequence.notes,
      new Set(),
      randomMinVel / 127.0,
      randomMaxVel / 127.0
    );
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Humanize Timing
  const applyHumanizeTiming = () => {
    pushHistorySnapshot('Humanize Timing');
    const updated = humanizeNotesTiming(sequence.notes, new Set(), 0.03);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Select All Notes Toggle
  const handleToggleSelectAllNotes = useCallback(() => {
    if (selectedNoteIds.size === sequence.notes.length && sequence.notes.length > 0) {
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set(sequence.notes.map((n) => n.id)));
    }
  }, [selectedNoteIds, sequence.notes]);

  // Selected notes velocity calculations
  const selectedNotes = sequence.notes.filter((n) => selectedNoteIds.has(n.id));
  const hasSelectedNotes = selectedNotes.length > 0;
  const avgVelocity = hasSelectedNotes
    ? selectedNotes.reduce((acc, n) => acc + n.velocity, 0) / selectedNotes.length
    : 0.75;
  const avgMidiVelocity = Math.round(avgVelocity * 127);
  const linePercent = Math.min(100, Math.max(0, avgVelocity * 100));

  // Apply new average velocity with proportionate scaling to all selected notes
  const applyVelocityToSelectedNotes = useCallback(
    (targetAvgVel: number, recordHistory = false) => {
      if (selectedNotes.length === 0) return;
      const clampedAvg = Math.min(1.0, Math.max(0.01, targetAvgVel));

      if (recordHistory) {
        pushHistorySnapshot(`Adjust Velocity (${Math.round(clampedAvg * 127)})`);
      }

      if (selectedNotes.length === 1) {
        const targetId = selectedNotes[0].id;
        setSequence((s) => ({
          ...s,
          notes: s.notes.map((n) => (n.id === targetId ? { ...n, velocity: clampedAvg } : n)),
        }));
      } else {
        const currentAvg =
          selectedNotes.reduce((acc, n) => acc + n.velocity, 0) / selectedNotes.length;
        const ratio = currentAvg > 0.001 ? clampedAvg / currentAvg : 1.0;

        setSequence((s) => ({
          ...s,
          notes: s.notes.map((n) => {
            if (selectedNoteIds.has(n.id)) {
              const scaled = Math.min(1.0, Math.max(0.05, n.velocity * ratio));
              return { ...n, velocity: scaled };
            }
            return n;
          }),
        }));
      }
    },
    [selectedNotes, selectedNoteIds]
  );

  const heatmapBarRef = useRef<HTMLDivElement>(null);

  const handleVelocityMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const barEl = heatmapBarRef.current;
    if (!barEl) return;

    let currentSelectedNotes = sequence.notes.filter((n) => selectedNoteIds.has(n.id));
    if (currentSelectedNotes.length === 0) {
      // Auto-select all notes if none selected so drag immediately works
      const allIds = new Set(sequence.notes.map((n) => n.id));
      setSelectedNoteIds(allIds);
      currentSelectedNotes = [...sequence.notes];
    }
    if (currentSelectedNotes.length === 0) return;

    const rect = barEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    const initialAvg =
      currentSelectedNotes.reduce((acc, n) => acc + n.velocity, 0) / currentSelectedNotes.length;
    const initialVelMap = new Map<number, number>();
    currentSelectedNotes.forEach((n) => initialVelMap.set(n.id, n.velocity));

    const clickRatio = Math.min(1.0, Math.max(0.01, (startX - rect.left) / rect.width));
    let lastAvg = clickRatio;

    if (currentSelectedNotes.length === 1) {
      const targetId = currentSelectedNotes[0].id;
      setSequence((s) => ({
        ...s,
        notes: s.notes.map((n) => (n.id === targetId ? { ...n, velocity: clickRatio } : n)),
      }));
    } else {
      const ratio = initialAvg > 0.001 ? clickRatio / initialAvg : 1.0;
      setSequence((s) => ({
        ...s,
        notes: s.notes.map((n) => {
          if (initialVelMap.has(n.id)) {
            const initV = initialVelMap.get(n.id)!;
            return { ...n, velocity: Math.min(1.0, Math.max(0.05, initV * ratio)) };
          }
          return n;
        }),
      }));
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = startY - moveEvent.clientY; // Upwards is positive

      let targetAvg: number;
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.25) {
        targetAvg = Math.min(1.0, Math.max(0.01, clickRatio + deltaY / 120));
      } else {
        targetAvg = Math.min(1.0, Math.max(0.01, (moveEvent.clientX - rect.left) / rect.width));
      }
      lastAvg = targetAvg;

      if (currentSelectedNotes.length === 1) {
        const targetId = currentSelectedNotes[0].id;
        setSequence((s) => ({
          ...s,
          notes: s.notes.map((n) => (n.id === targetId ? { ...n, velocity: targetAvg } : n)),
        }));
      } else {
        const ratio = initialAvg > 0.001 ? targetAvg / initialAvg : 1.0;
        setSequence((s) => ({
          ...s,
          notes: s.notes.map((n) => {
            if (initialVelMap.has(n.id)) {
              const initV = initialVelMap.get(n.id)!;
              return { ...n, velocity: Math.min(1.0, Math.max(0.05, initV * ratio)) };
            }
            return n;
          }),
        }));
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      pushHistorySnapshot(`Adjust Velocity (${Math.round(lastAvg * 127)})`);
      if (currentSelectedNotes.length > 0) {
        synthAudioEngine.auditionNote(currentSelectedNotes[0].pitch, lastAvg, 0.25);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // MIDI Pattern Selection Navigation
  const currentSequenceIdx = PRESET_SEQUENCES.findIndex((s) => s.name === sequence.name);

  const handleSelectSequence = (idx: number) => {
    const safeIdx = (idx + PRESET_SEQUENCES.length) % PRESET_SEQUENCES.length;
    const newSeq = PRESET_SEQUENCES[safeIdx];
    setActiveSourceType('preset');
    setCurrentScannedFileIdx(-1);
    pushHistorySnapshot(`Load Groove (${newSeq?.name || 'Preset'})`);
    synthAudioEngine.stop();
    setPlayheadPpq(0);
    setSelectedNoteIds(new Set());
    setSequence(newSeq);

    // Sync active preset and target scale parameters to this groove if matched
    const matchingPreset = FACTORY_PRESETS.find((p) => p.sequence?.name === newSeq.name);
    if (matchingPreset) {
      setActiveLensPreset(matchingPreset);
      setParams((prev) => ({
        ...prev,
        scaleRoot: matchingPreset.settings.scaleRoot,
        scaleType: matchingPreset.settings.scaleType,
        quantizeGrid: matchingPreset.settings.quantizeGrid,
      }));
    }
  };

  // Handle file or preset selection from the top dropdown
  const handleItemSelect = (val: string) => {
    if (val.startsWith('scanned_')) {
      const idx = Number(val.replace('scanned_', ''));
      const item = scannedFiles[idx];
      if (item) {
        setCurrentScannedFileIdx(idx);
        setActiveSourceType('scanned');
        pushHistorySnapshot(`Load Scanned MIDI (${item.name})`);
        loadMidiFromFile(item.file);
      }
    } else if (val.startsWith('preset_')) {
      const idx = Number(val.replace('preset_', ''));
      handleSelectSequence(idx);
    }
  };

  // Step backwards / forwards across active source items (scanned files or presets)
  const handleStepItem = (direction: -1 | 1) => {
    if (activeSourceType === 'scanned' && scannedFiles.length > 0) {
      const nextIdx = (currentScannedFileIdx + direction + scannedFiles.length) % scannedFiles.length;
      setCurrentScannedFileIdx(nextIdx);
      const item = scannedFiles[nextIdx];
      pushHistorySnapshot(`Load Scanned MIDI (${item.name})`);
      loadMidiFromFile(item.file);
    } else {
      const safeIdx = (currentSequenceIdx + direction + PRESET_SEQUENCES.length) % PRESET_SEQUENCES.length;
      handleSelectSequence(safeIdx);
    }
  };

  // Pick random file primarily from scanned library (Dice button)
  const handleRandomPick = () => {
    if (scannedFiles.length > 0) {
      let randIdx = Math.floor(Math.random() * scannedFiles.length);
      if (scannedFiles.length > 1 && randIdx === currentScannedFileIdx) {
        randIdx = (randIdx + 1 + Math.floor(Math.random() * (scannedFiles.length - 1))) % scannedFiles.length;
      }
      const chosen = scannedFiles[randIdx];
      setCurrentScannedFileIdx(randIdx);
      setActiveSourceType('scanned');
      pushHistorySnapshot(`Random Library Pick (${chosen.name})`);
      loadMidiFromFile(chosen.file);
      setNotificationBanner(`🎲 Library Random: "${chosen.name}" (${(randIdx + 1).toLocaleString()} of ${scannedFiles.length.toLocaleString()} files)`);
      setTimeout(() => setNotificationBanner(null), 4000);
    } else {
      // Library is empty: prompt user to scan their folder and open folder picker directly
      setNotificationBanner("📁 Your MIDI library is empty. Please select a folder to build your library!");
      handleScanFolderClick();
    }
  };

  // Single or Multi File Upload from the "Open" button
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    if (fileList.length === 1) {
      const file = fileList[0];
      setActiveSourceType('custom');
      setCurrentScannedFileIdx(-1);
      pushHistorySnapshot(`Open File (${file.name})`);
      loadMidiFromFile(file);
      setNotificationBanner(`✓ Loaded "${file.name}" into piano roll.`);
      setTimeout(() => setNotificationBanner(null), 4000);
    } else {
      // Multiple files selected at once: add them all to the library and open the library modal
      const discovered: ScannedMidiFile[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const lower = f.name.toLowerCase();
        if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
          discovered.push({
            name: f.name,
            relativePath: (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name,
            file: f,
            sizeBytes: f.size,
          });
        }
      }

      if (discovered.length > 0) {
        setScannedFiles(discovered);
        setCurrentScannedFileIdx(0);
        setActiveSourceType('scanned');
        pushHistorySnapshot(`Open Multiple Files (Loaded ${discovered[0].name})`);
        loadMidiFromFile(discovered[0].file);
        setNotificationBanner(`✓ Added ${discovered.length} MIDI files to library. Loaded "${discovered[0].name}" into piano roll.`);
        setTimeout(() => setNotificationBanner(null), 5000);
      }
    }

    // Always reset the input so reopening the same file or selecting files again works immediately
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cancel folder scanning immediately
  const cancelScan = () => {
    isCancelledRef.current = true;
    setIsScanning(false);
    setIsWaitingFolderAuth(false);
    setNotificationBanner(null);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  // Stop scanning and immediately show all discovered files
  const stopAndShowResults = () => {
    isCancelledRef.current = true;
    setIsScanning(false);
    setIsWaitingFolderAuth(false);
    const discovered = [...currentDiscoveredRef.current];
    setScannedFiles(discovered);
    setVisibleLibraryCount(50);
    if (discovered.length > 0) {
      setCurrentScannedFileIdx(0);
      setActiveSourceType('scanned');
      pushHistorySnapshot(`Stopped Scan (Loaded ${discovered[0].name})`);
      loadMidiFromFile(discovered[0].file);
      setNotificationBanner(`✓ Stopped scan: Discovered ${discovered.length} MIDI files. Loaded "${discovered[0].name}" into piano roll.`);
      setTimeout(() => setNotificationBanner(null), 5000);
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  // Direct, synchronous trigger of folder selection dialog - never lost or blocked by browser security
  const handleScanFolderClick = () => {
    isCancelledRef.current = false;
    currentDiscoveredRef.current = [];
    setScanProgress({ scanned: 0, total: 0, found: 0 });
    setCurrentScanningFolder('');
    setIsWaitingFolderAuth(true);
    setNotificationBanner("📁 Folder chooser opened. When prompted by your browser, confirm 'Upload' or 'Allow' to scan files locally in your browser.");

    const onWindowFocus = () => {
      setTimeout(() => {
        setIsWaitingFolderAuth(false);
        window.removeEventListener('focus', onWindowFocus);
      }, 2500);
    };
    window.addEventListener('focus', onWindowFocus, { once: true });

    if (folderInputRef.current) {
      folderInputRef.current.value = '';
      folderInputRef.current.click();
    }
  };

  // Process folder files via non-blocking asynchronous chunking
  const handleFolderScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsWaitingFolderAuth(false);
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      setIsScanning(false);
      setNotificationBanner(null);
      return;
    }

    const totalFiles = fileList.length;
    setIsScanning(true);
    isCancelledRef.current = false;
    const discovered: ScannedMidiFile[] = [];
    currentDiscoveredRef.current = discovered;
    setScanProgress({ scanned: 0, total: totalFiles, found: 0 });
    setNotificationBanner(`Scanning ${totalFiles.toLocaleString()} files for MIDI...`);

    const CHUNK_SIZE = 400; // Rapid chunking for ultra-fast scanning across huge folders (30k+ files)
    let idx = 0;

    const processNextChunk = () => {
      if (isCancelledRef.current) {
        setIsScanning(false);
        setNotificationBanner(null);
        return;
      }

      const end = Math.min(idx + CHUNK_SIZE, totalFiles);
      for (let i = idx; i < end; i++) {
        const f = fileList[i];
        const lower = f.name.toLowerCase();
        if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
          const relativePath = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name;
          discovered.push({
            name: f.name,
            relativePath,
            file: f,
            sizeBytes: f.size,
          });
        }
      }

      idx = end;
      if (fileList[idx - 1]) {
        const lastPath = (fileList[idx - 1] as unknown as { webkitRelativePath?: string }).webkitRelativePath || fileList[idx - 1].name;
        const dirName = lastPath.split('/').slice(0, -1).join('/') || 'Folder';
        setCurrentScanningFolder(dirName);
      }

      setScanProgress({ scanned: idx, total: totalFiles, found: discovered.length });

      if (idx < totalFiles) {
        // Yield to event loop to keep UI 100% interactive and non-blocking
        setTimeout(processNextChunk, 0);
      } else {
        // Complete
        setScannedFiles([...discovered]);
        setIsScanning(false);
        setVisibleLibraryCount(50);

        if (discovered.length > 0) {
          // Immediately load the 1st discovered MIDI file into the piano roll!
          setCurrentScannedFileIdx(0);
          setActiveSourceType('scanned');
          pushHistorySnapshot(`Scan Folder (Loaded ${discovered[0].name})`);
          loadMidiFromFile(discovered[0].file);
          setNotificationBanner(`✓ Scanned ${totalFiles.toLocaleString()} files: Discovered ${discovered.length.toLocaleString()} MIDI files. Loaded "${discovered[0].name}".`);
          setTimeout(() => setNotificationBanner(null), 6000);
        } else {
          setNotificationBanner(`Scanned ${totalFiles.toLocaleString()} files: No .mid or .midi files found in the selected folder.`);
          setTimeout(() => setNotificationBanner(null), 6000);
        }

        if (folderInputRef.current) {
          folderInputRef.current.value = '';
        }
      }
    };

    // Begin chunked processing on next tick
    setTimeout(processNextChunk, 10);
  };

  const loadMidiFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsed = parseMidiFile(buffer, file.name);
        synthAudioEngine.stop();
        setPlayheadPpq(0);
        setSelectedNoteIds(new Set());
        setSequence(parsed);
        if (parsed.notes.length === 0) {
          setNotificationBanner(`Warning: "${file.name}" was loaded but contains no MIDI note events.`);
          setTimeout(() => setNotificationBanner(null), 5000);
        }
      } catch (err) {
        alert('Could not parse MIDI file: ' + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Drag and Drop from OS (Supports both .mid files and entire folders)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);

    // Check if a directory was dropped via webkitGetAsEntry
    const items = e.dataTransfer.items;
    let hasDirectory = false;
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry && entry.isDirectory) {
          hasDirectory = true;
          break;
        }
      }
    }

    if (hasDirectory) {
      setIsScanning(true);
      isCancelledRef.current = false;
      const discovered: ScannedMidiFile[] = [];
      currentDiscoveredRef.current = discovered;
      let count = 0;

      async function readEntry(entry: any, currentPath = '') {
        if (isCancelledRef.current) return;
        if (entry.isFile) {
          count++;
          if (count % 25 === 0) {
            setScanProgress({ scanned: count, total: 0, found: discovered.length });
            await new Promise((r) => setTimeout(r, 0));
          }
          const lower = entry.name.toLowerCase();
          if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
            await new Promise<void>((resolve) => {
              entry.file(
                (file: File) => {
                  discovered.push({
                    name: entry.name,
                    relativePath: currentPath ? `${currentPath}/${entry.name}` : entry.name,
                    file,
                    sizeBytes: file.size,
                  });
                  setScanProgress({ scanned: count, total: 0, found: discovered.length });
                  resolve();
                },
                () => resolve()
              );
            });
          }
        } else if (entry.isDirectory) {
          setCurrentScanningFolder(entry.name);
          const reader = entry.createReader();
          const readAll = async () => {
            const batch: any[] = await new Promise((res) => reader.readEntries(res, () => res([])));
            if (batch.length > 0 && !isCancelledRef.current) {
              for (const child of batch) {
                const sub = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                await readEntry(child, sub);
              }
              await readAll();
            }
          };
          await readAll();
        }
      }

      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) {
          await readEntry(entry, '');
        }
      }

      if (!isCancelledRef.current) {
        setScannedFiles([...discovered]);
        setIsScanning(false);
        setVisibleLibraryCount(50);
        if (discovered.length > 0) {
          setCurrentScannedFileIdx(0);
          setActiveSourceType('scanned');
          pushHistorySnapshot(`Drop Folder (Loaded ${discovered[0].name})`);
          loadMidiFromFile(discovered[0].file);
          setNotificationBanner(`✓ Dropped folder: Discovered ${discovered.length} MIDI files. Loaded "${discovered[0].name}".`);
          setTimeout(() => setNotificationBanner(null), 5000);
        } else {
          setNotificationBanner('No .mid or .midi files were found in the dropped folder.');
          setTimeout(() => setNotificationBanner(null), 5000);
        }
      }
      return;
    }

    // Single MIDI file drop
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.toLowerCase().endsWith('.mid') || file.name.toLowerCase().endsWith('.midi'))) {
      setActiveSourceType('custom');
      setCurrentScannedFileIdx(-1);
      pushHistorySnapshot(`Drop File (${file.name})`);
      loadMidiFromFile(file);
      setNotificationBanner(`✓ Loaded "${file.name}" into piano roll.`);
      setTimeout(() => setNotificationBanner(null), 4000);
    }
  };

  // Export MIDI to .mid File
  const exportMidiFile = useCallback(() => {
    const data = serializeMidiFile(
      sequence,
      params.transpose,
      params.velocityScale,
      params.velocityOffset,
      sequence.bpm * params.speedMultiplier
    );

    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sequence.name}_Transposed_${params.transpose >= 0 ? '+' : ''}${params.transpose}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sequence, params]);

  const timeSigNum = sequence.timeSigNumerator || 4;
  const timeSigDen = sequence.timeSigDenominator || 4;
  const barPpq = timeSigNum * (4 / timeSigDen);
  const beatPpq = 4 / timeSigDen;
  const currentBar = Math.floor(playheadPpq / barPpq) + 1;
  const currentBeat = Math.floor((playheadPpq % barPpq) / beatPpq) + 1;
  const currentTick = Math.floor(((playheadPpq % beatPpq) / beatPpq) * 100);

  const filteredScannedFiles = scannedFiles.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.relativePath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="relative flex flex-col w-full h-full bg-gradient-to-b from-[#1c1e22] via-[#191b1f] to-[#141618] text-neutral-200 border-2 border-black/90 rounded-md overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95)] font-sans border-t border-t-white/15 border-b-2 border-b-black/95 select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Visual File Drop Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-emerald-950/40 backdrop-blur-md border-2 border-dashed border-emerald-400">
          <Upload className="w-16 h-16 text-emerald-400 animate-bounce mb-3" />
          <p className="text-xl font-bold text-white tracking-widest font-mono">LOAD MIDI SEQUENCE // BUFFER READY</p>
          <p className="text-sm text-emerald-300 font-mono">DROP .MID OR .MIDI FILE TO AUDITION</p>
        </div>
      )}

      {/* Top Channel Strip 1: Chassis Branding, Rack Screws, Active Sequence Tube, and Random Generator */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#1c1e22] border-b-2 border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Top-Left Flush Allen Rack-Screw */}
          <svg className="w-3.5 h-3.5 text-neutral-600 opacity-60 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" stroke="#333" strokeWidth="1.5" fill="#18191c"/>
            <polygon points="12,7 16.33,9.5 16.33,14.5 12,17 7.67,14.5 7.67,9.5" fill="#0d0e10" stroke="#2a2c30" strokeWidth="1"/>
          </svg>

          {/* Milled Aluminum Hardware Brandplate */}
          <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-b from-[#2a2d33] to-[#1c1e22] border border-[#3d414a] rounded shadow-[0_1px_3px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)]">
            <img src="/icon.svg" alt="MidiLens Icon" className="w-3.5 h-3.5 rounded-full shadow" />
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-black tracking-[0.25em] text-white">
                MIDILENS
              </span>
              <span className="text-[7.5px] font-mono font-bold tracking-[0.18em] text-neutral-400 -mt-0.5">
                MIDI ANALYSER & PREVIEWER
              </span>
            </div>
          </div>

          {/* Recessed Amber LED Tube: Active Sequence */}
          <div
            className="flex items-center gap-2 px-3 py-1 bg-[#0c0e10] border border-neutral-700/80 rounded shadow-[inset_0_2px_5px_rgba(0,0,0,0.9)] font-mono text-xs"
            title={`Active sequence: ${sequence.name} (${sequence.notes.length} notes, ${sequence.bpm} BPM)`}
          >
            <Music className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="silkscreen-label text-neutral-500">ACTIVE:</span>
            <span className="font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] truncate max-w-[240px]">
              {sequence.name}
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">[{sequence.notes.length} N]</span>
          </div>

          {/* Tactile Push-Button: Random Sequence */}
          <button
            onClick={handleRandomPick}
            className="hardware-button flex items-center gap-1.5 px-3 py-1 text-amber-400 rounded font-mono text-xs font-bold transition group"
            title={
              scannedFiles.length > 0
                ? `Pick a random MIDI file from your library (${scannedFiles.length.toLocaleString()} files)`
                : 'Pick a random factory groove'
            }
          >
            <Dices className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-45 transition-transform" />
            <span className="tracking-wider uppercase text-[10px]">RANDOM</span>
          </button>
        </div>

        {/* Top-Right Flush Allen Rack-Screw */}
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-neutral-600 opacity-60 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" stroke="#333" strokeWidth="1.5" fill="#18191c"/>
            <polygon points="12,7 16.33,9.5 16.33,14.5 12,17 7.67,14.5 7.67,9.5" fill="#0d0e10" stroke="#2a2c30" strokeWidth="1"/>
          </svg>
        </div>
      </div>

      {/* Channel Strip 2: Presets, Stamped File Well, Scan Folder, Open, and Industrial Export MIDI */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-[#181a1e] border-b-2 border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.06)] overflow-x-auto no-scrollbar">
        {/* Left: Preset Selector + Stamped Library Socket */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Preset Manager Button */}
          <button
            onClick={() => setShowPresetDrawer(true)}
            className="hardware-button flex items-center gap-1.5 rounded px-2.5 py-1 text-amber-400 font-mono font-bold text-xs transition group shrink-0"
            title="Open Preset Manager to load/save scale, quantization & humanize settings"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="truncate max-w-[110px] sm:max-w-[130px] uppercase text-[10px] tracking-wider">PRESET: {activeLensPreset.name}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {/* Stamped Socket: Unified Library Dropdown & Stepper */}
          <div className="flex items-center bg-[#101214] border border-neutral-700/80 rounded p-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] shrink-0">
            <button
              onClick={() => handleStepItem(-1)}
              className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition"
              title="Previous MIDI File / Pattern"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center px-1">
              <select
                className="text-[11px] bg-transparent text-neutral-200 font-mono font-bold cursor-pointer px-1 py-0.5 focus:outline-none w-[130px] sm:w-[160px] max-w-[160px] truncate"
                onChange={(e) => handleItemSelect(e.target.value)}
                value={
                  activeSourceType === 'scanned' && currentScannedFileIdx >= 0
                    ? `scanned_${currentScannedFileIdx}`
                    : activeSourceType === 'preset' && currentSequenceIdx >= 0
                    ? `preset_${currentSequenceIdx}`
                    : activeSourceType === 'custom'
                    ? 'custom_file'
                    : 'preset_0'
                }
                title="Select a scanned MIDI file or factory groove"
              >
                {activeSourceType === 'custom' && (
                  <optgroup label="📄 Active Open File">
                    <option value="custom_file" className="bg-[#121418] text-neutral-200">
                      {sequence.name}.mid
                    </option>
                  </optgroup>
                )}

                {scannedFiles.length > 0 && (
                  <optgroup label={`📁 Scanned MIDI Files (${scannedFiles.length.toLocaleString()})`}>
                    {scannedFiles.slice(0, 1000).map((f, idx) => (
                      <option key={`scanned_${idx}`} value={`scanned_${idx}`} className="bg-[#121418] text-neutral-200">
                        {idx + 1}. {f.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup label="🎵 Factory Grooves & Patterns">
                  {PRESET_SEQUENCES.map((p, idx) => (
                    <option key={`preset_${idx}`} value={`preset_${idx}`} className="bg-[#121418] text-neutral-200">
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button
              onClick={() => handleStepItem(1)}
              className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition mr-0.5"
              title="Next MIDI File / Pattern"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Integrated Library Button */}
            <button
              onClick={() => setShowFolderModal(true)}
              className="hardware-button flex items-center gap-1 text-[10px] text-amber-400 rounded px-2 py-0.5 font-mono uppercase tracking-wider transition shrink-0"
              title={`Open full searchable Library browser (${scannedFiles.length.toLocaleString()} files)`}
            >
              <FolderOpen className="w-3 h-3 text-amber-500" />
              <span>Library</span>
              {scannedFiles.length > 0 && (
                <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded font-bold">
                  {scannedFiles.length > 999
                    ? `${(scannedFiles.length / 1000).toFixed(0)}k`
                    : scannedFiles.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Hardware Push-Buttons - Scan Folder, Open File, Heavy Industrial Export MIDI */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleScanFolderClick}
            disabled={isScanning}
            className="hardware-button flex items-center gap-1.5 text-xs text-amber-400 disabled:opacity-50 rounded px-2.5 py-1 font-mono uppercase tracking-wider transition whitespace-nowrap"
            title="Scan a folder on your computer for .mid files"
          >
            {isScanning ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <FolderSearch className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="text-[10px]">{isScanning ? `Scanning...` : 'Scan Folder'}</span>
          </button>
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is standard in Chromium, Safari and Edge
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={handleFolderScan}
          />

          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
            className="hardware-button flex items-center gap-1.5 text-xs text-neutral-300 rounded px-2.5 py-1 font-mono uppercase tracking-wider transition whitespace-nowrap"
            title="Open MIDI (.mid) files from your computer"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[10px]">Open File</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mid,.midi"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Heavy Tactile Industrial Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', sequence.name);
            }}
            title="Export piano roll as Type 0 or Type 1 .mid file directly to your DAW"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-b from-[#f59e0b] via-[#d97706] to-[#b45309] text-black font-extrabold text-[11px] font-mono tracking-wider uppercase rounded shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-0.5 border border-amber-300/40 cursor-grab active:cursor-grabbing transition whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span>EXPORT MIDI (.MID)</span>
          </button>
        </div>
      </div>

      {/* Top Interactive Notification / Scan Alert Banner */}
      {notificationBanner && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-2 flex items-center justify-between text-xs font-mono text-amber-300 transition animate-in fade-in">
          <div className="flex items-center gap-2 truncate">
            {isScanning || isWaitingFolderAuth ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="truncate">{notificationBanner}</span>
          </div>
          {!isScanning && !isWaitingFolderAuth && (
            <button
              onClick={() => setNotificationBanner(null)}
              className="text-slate-400 hover:text-white p-1 ml-2 shrink-0 transition"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Channel Strip 3: Transport & Telemetry Deck */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-1.5 bg-[#15171a] border-b border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.06)] overflow-x-auto no-scrollbar">
        {/* Left: Vintage Tape Transport + Undo/Redo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#0c0e10] p-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <button
              onClick={togglePlay}
              className={`p-1.5 rounded flex items-center justify-center transition active:translate-y-0.5 ${
                isPlaying
                  ? 'bg-[#10b981] text-black font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.85)] border border-emerald-300'
                  : 'hardware-button text-neutral-300 hover:text-white'
              }`}
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={stopPlayback}
              className="hardware-button p-1.5 text-neutral-300 hover:text-white rounded transition active:translate-y-0.5"
              title="Stop & Rewind"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>

            <button
              onClick={() => setParams((p) => ({ ...p, loop: !p.loop }))}
              className={`p-1.5 rounded transition active:translate-y-0.5 ${
                params.loop
                  ? 'bg-[#d97706] text-black font-extrabold shadow-[0_0_10px_rgba(217,119,6,0.8)] border border-amber-300'
                  : 'hardware-button text-neutral-400 hover:text-neutral-200'
              }`}
              title="Toggle Loop"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 bg-[#0c0e10] p-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <button
              onClick={handleUndo}
              disabled={pastHistory.length === 0}
              className="hardware-button relative p-1.5 text-neutral-300 disabled:opacity-30 rounded transition active:translate-y-0.5"
              title={
                pastHistory.length > 0
                  ? `Undo ${pastHistory[pastHistory.length - 1].description} (${pastHistory.length} steps, Cmd+Z)`
                  : 'Undo (Cmd+Z)'
              }
            >
              <Undo2 className="w-3.5 h-3.5" />
              {pastHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 text-[7.5px] font-mono font-black bg-amber-500 text-black rounded px-1 py-0 leading-tight">
                  {pastHistory.length > 9 ? '9+' : pastHistory.length}
                </span>
              )}
            </button>
            <button
              onClick={handleRedo}
              disabled={futureHistory.length === 0}
              className="hardware-button p-1.5 text-neutral-300 disabled:opacity-30 rounded transition active:translate-y-0.5"
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Deep Phosphor CRT Telemetry */}
        <div className="flex items-center gap-3 px-3 py-1 bg-[#070d09] border border-emerald-950/80 rounded font-mono text-xs shadow-[inset_0_2px_6px_rgba(0,0,0,0.95)] shrink-0">
          <div className="flex flex-col">
            <span className="silkscreen-label text-neutral-500">POSITION</span>
            <span className="font-bold text-emerald-400 phosphor-glow-green text-[11px]">
              {String(currentBar).padStart(3, '0')}.{String(currentBeat).padStart(2, '0')}.{String(currentTick).padStart(2, '0')}
            </span>
          </div>
          <div className="w-px h-5 bg-emerald-950/80" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="silkscreen-label text-neutral-500">TEMPO</span>
              {params.syncMode === 'daw' ? (
                <span className="flex items-center gap-0.5 text-[8px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-700 rounded px-1" title="Synced to DAW host timeline">
                  <Lock className="w-2 h-2 text-neutral-400" />
                  DAW
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.8)]" title="Free Audition: Manual BPM active" />
              )}
            </div>

            <div className="flex items-center gap-1 mt-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  stepTempo(e.shiftKey ? -5 : -1);
                }}
                className="w-5 h-5 rounded bg-[#141619] hover:bg-neutral-800 active:bg-amber-500/20 text-amber-300 hover:text-amber-100 flex items-center justify-center transition border border-neutral-700/80 active:scale-95 cursor-pointer shadow-sm select-none"
                title="Decrease BPM (-1, Shift+Click -5)"
              >
                <Minus className="w-3 h-3 pointer-events-none" />
              </button>

              <input
                ref={tempoInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={tempoInputValue}
                onMouseDown={handleTempoMouseDown}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                  setTempoInputValue(cleaned);
                  const val = parseInt(cleaned, 10);
                  if (!isNaN(val) && val >= 20 && val <= 320) {
                    handleTempoChange(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    stepTempo(e.shiftKey ? 5 : 1);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    stepTempo(e.shiftKey ? -5 : -1);
                  }
                }}
                onBlur={() => {
                  const val = parseInt(tempoInputValue, 10);
                  if (isNaN(val) || val < 20 || val > 320) {
                    setTempoInputValue(String(sequence.bpm));
                  } else {
                    handleTempoChange(val);
                  }
                }}
                className={`w-14 bg-[#0c0e10] border rounded px-1.5 py-0 text-center font-mono font-bold text-amber-400 text-xs focus:border-amber-400 focus:outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-ns-resize select-none transition-all ${
                  isTempoDragging
                    ? 'ring-2 ring-amber-400/80 border-amber-400 bg-[#171a1e] phosphor-glow-amber'
                    : 'border-neutral-700/80 hover:border-amber-500/60'
                }`}
                title="Click & drag up/down to scrub BPM (Shift for fine control), or click to type"
              />

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  stepTempo(e.shiftKey ? 5 : 1);
                }}
                className="w-5 h-5 rounded bg-[#141619] hover:bg-neutral-800 active:bg-amber-500/20 text-amber-300 hover:text-amber-100 flex items-center justify-center transition border border-neutral-700/80 active:scale-95 cursor-pointer shadow-sm select-none"
                title="Increase BPM (+1, Shift+Click +5)"
              >
                <Plus className="w-3 h-3 pointer-events-none" />
              </button>
              <span className="text-[9px] text-amber-500 font-bold ml-0.5">BPM</span>
            </div>
          </div>
          <div className="w-px h-5 bg-emerald-950/80" />
          <div className="flex flex-col">
            <span className="silkscreen-label text-neutral-500">METER</span>
            <div className="flex items-center mt-0.5">
              <select
                value={`${sequence.timeSigNumerator || 4}/${sequence.timeSigDenominator || 4}`}
                onChange={(e) => {
                  const [numStr, denStr] = e.target.value.split('/');
                  const num = parseInt(numStr, 10);
                  const den = parseInt(denStr, 10);
                  if (!isNaN(num) && !isNaN(den)) {
                    pushHistorySnapshot(`Change Meter to ${num}/${den}`);
                    setSequence((prev) => ({
                      ...prev,
                      timeSigNumerator: num,
                      timeSigDenominator: den,
                    }));
                  }
                }}
                className="bg-[#0c0e10] border border-neutral-700/80 rounded px-1.5 py-0 text-center font-mono font-bold text-emerald-400 text-xs focus:border-emerald-400 focus:outline-none cursor-pointer shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] phosphor-glow-green"
                title="Select musical time signature / meter"
              >
                <option value="4/4" className="bg-[#121418] text-neutral-200">4/4 (Common)</option>
                <option value="3/4" className="bg-[#121418] text-neutral-200">3/4 (Waltz)</option>
                <option value="2/4" className="bg-[#121418] text-neutral-200">2/4 (March)</option>
                <option value="6/8" className="bg-[#121418] text-neutral-200">6/8 (Compound)</option>
                <option value="12/8" className="bg-[#121418] text-neutral-200">12/8 (Blues)</option>
                <option value="5/4" className="bg-[#121418] text-neutral-200">5/4 (Take Five)</option>
                <option value="7/8" className="bg-[#121418] text-neutral-200">7/8 (Prog)</option>
                <option value="9/8" className="bg-[#121418] text-neutral-200">9/8 (Compound Triple)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Timing Grid + Detected Key */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="silkscreen-label text-neutral-500">GRID:</span>
            <select
              value={params.quantizeGrid}
              onChange={(e) => setParams((p) => ({ ...p, quantizeGrid: e.target.value as QuantizeGrid }))}
              className="bg-transparent text-xs font-mono font-bold text-amber-400 focus:outline-none cursor-pointer"
            >
              {Object.entries(QUANTIZE_GRID_DIVISIONS).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#121418] text-neutral-200">
                  {v.name}
                </option>
              ))}
            </select>
            <button
              onClick={applyTimingQuantize}
              className="hardware-button px-2 py-0.5 text-[9.5px] font-mono font-bold text-amber-400 rounded transition ml-1 uppercase"
              title="Quantize note start times and lengths to grid"
            >
              Q-Time
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" title="Detected original MIDI key">
            <span className="silkscreen-label text-neutral-500">ORIG:</span>
            <span className="text-xs font-bold text-emerald-400 font-mono phosphor-glow-green">{keyResult.keyName}</span>
          </div>
        </div>
      </div>

      {/* Channel Strip 4: Musical Scale Matrix & PROMINENT MODULE SWITCHES */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2 bg-[#181a1d] border-b-2 border-black/90 shadow-[0_1px_0_rgba(255,255,255,0.06)] overflow-x-auto no-scrollbar">
        {/* Left: Active Scale Matrix */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="silkscreen-label text-neutral-500">SCALE:</span>
            <select
              value={params.scaleRoot}
              onChange={(e) => setParams((p) => ({ ...p, scaleRoot: Number(e.target.value) }))}
              className="bg-transparent text-xs font-mono font-bold text-amber-400 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i} className="bg-[#121418] text-neutral-200">
                  {getNoteName(i)}
                </option>
              ))}
            </select>

            <select
              value={params.scaleType}
              onChange={(e) => setParams((p) => ({ ...p, scaleType: e.target.value as ScaleType }))}
              className="bg-transparent text-xs font-mono text-amber-300 focus:outline-none cursor-pointer max-w-[125px] truncate"
            >
              {Object.entries(SCALE_DEFINITIONS).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#121418] text-neutral-200">
                  {v.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setParams((p) => ({ ...p, scaleLock: !p.scaleLock }))}
              className={`p-1 rounded transition ${
                params.scaleLock ? 'text-amber-400 bg-amber-500/20' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title={params.scaleLock ? 'Scale Lock ON' : 'Scale Lock OFF'}
            >
              {params.scaleLock ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>

            <button
              onClick={applyScaleQuantize}
              className="hardware-button px-2 py-0.5 text-[9.5px] font-mono font-bold text-amber-400 rounded transition uppercase"
              title="Snap all existing notes to nearest in-scale pitch"
            >
              Q-Scale
            </button>
          </div>

          {/* Project Key & Target Match */}
          <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="silkscreen-label text-neutral-500">PROJECT:</span>
            <select
              value={params.projectKeyRoot}
              onChange={(e) => setParams((p) => ({ ...p, projectKeyRoot: Number(e.target.value) }))}
              className="bg-transparent text-xs font-mono font-bold text-emerald-400 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i} className="bg-[#121418] text-neutral-200">
                  {getNoteName(i)}
                </option>
              ))}
            </select>
            <button
              onClick={syncToProjectKey}
              className="hardware-button px-2 py-0.5 text-[9.5px] font-mono font-bold text-emerald-400 rounded transition uppercase"
              title="Sync to project key"
            >
              Sync
            </button>
          </div>
        </div>

        {/* Right: PROMINENT MODULE TOGGLE SWITCHES - HIGH VISIBILITY */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mechanical Rocker Switch: Humanise */}
          <button
            onClick={() => setShowHumanizeModal(!showHumanizeModal)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold rounded transition border ${
              showHumanizeModal
                ? 'bg-purple-900/60 text-purple-200 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                : 'hardware-button text-purple-300'
            }`}
            title="Toggle Humanise velocity jitter & timing swing controls panel"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-300" />
            <span className="uppercase text-[10.5px] tracking-wider">HUMANISE</span>
          </button>

          {/* Mechanical Rocker Switch: ARPEGGIATOR MODULE */}
          <button
            onClick={() => setShowArpPanel(!showArpPanel)}
            className={`flex items-center gap-2 px-3.5 py-1 text-xs font-mono font-bold rounded transition border shadow-md ${
              showArpPanel || params.arpEnabled
                ? 'bg-gradient-to-b from-amber-500 to-amber-700 text-black font-extrabold border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                : 'bg-[#121418] text-amber-400 border-amber-500/50 hover:border-amber-400 hover:bg-neutral-900'
            }`}
            title="Click to toggle Arpeggiator control panel (currently below velocity strip)"
          >
            <Zap className={`w-4 h-4 ${showArpPanel || params.arpEnabled ? 'text-black fill-current animate-pulse' : 'text-amber-400'}`} />
            <span className="uppercase text-[11px] tracking-widest font-black">
              ARPEGGIATOR {showArpPanel ? '[ON]' : '[OFF]'}
            </span>
          </button>

          {/* Mechanical Rocker Switch: CHORD VISUALIZER / DETECTOR MODULE */}
          <button
            onClick={() => setShowChordVisualizer(!showChordVisualizer)}
            className={`flex items-center gap-2 px-3.5 py-1 text-xs font-mono font-bold rounded transition border shadow-md ${
              showChordVisualizer
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-black font-extrabold border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                : 'bg-[#121418] text-emerald-400 border-emerald-500/50 hover:border-emerald-400 hover:bg-neutral-900'
            }`}
            title="Click to toggle Chord Analysis & Visualizer panel (currently at the bottom)"
          >
            <Activity className={`w-4 h-4 ${showChordVisualizer ? 'text-black' : 'text-emerald-400'}`} />
            <span className="uppercase text-[11px] tracking-widest font-black">
              VISUALIZER {showChordVisualizer ? '[ON]' : '[OFF]'}
            </span>
          </button>
        </div>
      </div>

      {/* Humanize Dropdown Banner (Collapsible) */}
      <div
        className={`grid transition-all duration-300 ease-in-out bg-[#14161a] ${
          showHumanizeModal
            ? 'grid-rows-[1fr] opacity-100 py-3 border-b-2 border-black/90 shadow-inner'
            : 'grid-rows-[0fr] opacity-0 py-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Velocity Jitter:</span>
                <span className="text-amber-400 font-bold">&plusmn;{humanizeVelRange}</span>
                <input
                  type="range"
                  min={2}
                  max={40}
                  value={humanizeVelRange}
                  onChange={(e) => setHumanizeVelRange(Number(e.target.value))}
                  className="w-24 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-amber-500"
                />
                <button
                  onClick={applyHumanizeVelocity}
                  className="hardware-button px-2.5 py-1 text-amber-400 font-bold rounded transition uppercase text-[10px]"
                >
                  Apply Jitter
                </button>
              </div>

              <div className="w-px h-6 bg-neutral-800" />

              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Custom Range:</span>
                <input
                  type="number"
                  min={1}
                  max={127}
                  value={randomMinVel}
                  onChange={(e) => setRandomMinVel(Number(e.target.value))}
                  className="w-12 px-1.5 py-0.5 bg-[#0c0e10] border border-neutral-700 rounded text-center text-neutral-200"
                />
                <span className="text-neutral-500">to</span>
                <input
                  type="number"
                  min={1}
                  max={127}
                  value={randomMaxVel}
                  onChange={(e) => setRandomMaxVel(Number(e.target.value))}
                  className="w-12 px-1.5 py-0.5 bg-[#0c0e10] border border-neutral-700 rounded text-center text-neutral-200"
                />
                <button
                  onClick={applyRandomizeVelocityRange}
                  className="hardware-button px-2.5 py-1 text-purple-300 font-bold rounded transition uppercase text-[10px]"
                >
                  Randomize
                </button>
              </div>

              <div className="w-px h-6 bg-neutral-800" />

              <button
                onClick={applyHumanizeTiming}
                className="hardware-button px-2.5 py-1 text-neutral-200 font-bold rounded transition uppercase text-[10px]"
              >
                Humanise Timing
              </button>
            </div>

            <button onClick={() => setShowHumanizeModal(false)} className="text-neutral-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. Main Piano Roll Canvas Container - Immediately below Key Information */}
      <div className="flex-1 w-full min-h-[380px] p-2 bg-[#0a0c0e] border-b-2 border-black/80 shadow-[inset_0_4px_12px_rgba(0,0,0,0.95)]">
        <PianoRoll
          notes={sequence.notes}
          totalLengthPpq={sequence.totalLengthPpq}
          playheadPpq={playheadPpq}
          previewTranspose={params.transpose}
          scaleRoot={params.scaleRoot}
          scaleType={params.scaleType}
          scaleLock={params.scaleLock}
          timeSigNumerator={sequence.timeSigNumerator || 4}
          timeSigDenominator={sequence.timeSigDenominator || 4}
          onSnapshotBeforeChange={(description) => pushHistorySnapshot(description)}
          onNotesChange={(newNotes) => {
            setSequence((s) => ({ ...s, notes: newNotes }));
          }}
          onSeek={handleSeek}
          onLengthChange={(newLength) => {
            pushHistorySnapshot('Change Length');
            setSequence((s) => ({ ...s, totalLengthPpq: newLength }));
          }}
          selectedNoteIds={selectedNoteIds}
          onSelectedNotesChange={(ids) => setSelectedNoteIds(ids)}
        />
      </div>

      {/* 2. Velocity Heatmap, Transpose, Diatonic Harmonise & Speed Controls Strip - Below Piano Roll */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#16181b] border-t border-b border-black/80 shadow-[0_2px_6px_rgba(0,0,0,0.7)] text-xs font-mono overflow-x-auto no-scrollbar">
        {/* Left: Bottom-Left Rack Screw + Recessed Velocity Heatmap Well */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Bottom-Left Flush Allen Rack Screw */}
          <svg className="w-3.5 h-3.5 text-neutral-600 opacity-60 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" stroke="#333" strokeWidth="1.5" fill="#18191c"/>
            <polygon points="12,7 16.33,9.5 16.33,14.5 12,17 7.67,14.5 7.67,9.5" fill="#0d0e10" stroke="#2a2c30" strokeWidth="1"/>
          </svg>

          {/* Stamped Recessed Velocity Well */}
          <div className="flex items-center gap-2 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="silkscreen-label text-neutral-500">VELOCITY:</span>

            <span className="text-emerald-400 font-bold text-[8.5px] font-mono shrink-0">1</span>

            <div
              ref={heatmapBarRef}
              onMouseDown={handleVelocityMouseDown}
              className={`relative w-36 sm:w-48 h-6 rounded bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 border border-neutral-700 shadow-inner flex items-center select-none cursor-pointer transition-all ${
                hasSelectedNotes ? 'ring-2 ring-amber-400/60 shadow-lg' : 'hover:border-neutral-500'
              }`}
              title={
                hasSelectedNotes
                  ? `Velocity: ${avgMidiVelocity} / 127 · Drag slider across track to adjust`
                  : 'Select note(s) to view and adjust velocity, or click to adjust all'
              }
            >
              {/* If notes are selected, display interactive glowing line & slider thumb (unobstructed) */}
              {hasSelectedNotes && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] -translate-x-1/2 pointer-events-none z-10"
                    style={{ left: `${linePercent}%` }}
                  />
                  <div
                    className="absolute top-0.5 bottom-0.5 w-3 bg-white border border-black rounded-sm shadow-md -translate-x-1/2 z-20 pointer-events-none"
                    style={{ left: `${linePercent}%` }}
                  />
                </>
              )}
            </div>

            <span className="text-rose-400 font-bold text-[8.5px] font-mono shrink-0">127</span>

            {/* Micro Stepper & Direct Numeric Value */}
            <div className="flex items-center gap-1 bg-[#15181b] px-1.5 py-0.5 rounded border border-neutral-700 ml-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const newVel = Math.max(0.01, (avgMidiVelocity - (e.shiftKey ? 8 : 2)) / 127);
                  applyVelocityToSelectedNotes(newVel, true);
                }}
                className="w-4 h-4 rounded bg-[#0c0e10] hover:bg-neutral-800 text-neutral-200 flex items-center justify-center text-[10px] transition active:scale-95 cursor-pointer"
                title="Decrease velocity (-2, Shift-click -8)"
              >
                <Minus className="w-2.5 h-2.5 pointer-events-none" />
              </button>

              <span className="font-mono font-bold text-amber-400 phosphor-glow-amber text-[10.5px] min-w-[28px] text-center select-none">
                {hasSelectedNotes ? avgMidiVelocity : '--'}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const newVel = Math.min(1.0, (avgMidiVelocity + (e.shiftKey ? 8 : 2)) / 127);
                  applyVelocityToSelectedNotes(newVel, true);
                }}
                className="w-4 h-4 rounded bg-[#0c0e10] hover:bg-neutral-800 text-neutral-200 flex items-center justify-center text-[10px] transition active:scale-95 cursor-pointer"
                title="Increase velocity (+2, Shift-click +8)"
              >
                <Plus className="w-2.5 h-2.5 pointer-events-none" />
              </button>
            </div>
          </div>

          {/* Select All Button */}
          <button
            onClick={handleToggleSelectAllNotes}
            className={`hardware-button px-2.5 py-1 text-[10px] font-mono font-bold rounded border transition flex items-center gap-1.5 shrink-0 uppercase tracking-wider ${
              selectedNoteIds.size === sequence.notes.length && sequence.notes.length > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'text-neutral-300 hover:text-white'
            }`}
            title="Select all notes in piano roll (Cmd+A / Ctrl+A)"
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {selectedNoteIds.size === sequence.notes.length && sequence.notes.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </span>
            {selectedNoteIds.size > 0 && (
              <span className="text-[9px] text-amber-400 font-mono">
                [{selectedNoteIds.size}]
              </span>
            )}
          </button>
        </div>

        {/* Right: Transpose, Diatonic Harmonise, Speed Multiplier, and Bottom-Right Rack Screw */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Stamped Socket: Transpose */}
          <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="silkscreen-label text-neutral-500">TRANSPOSE:</span>
            <input
              type="range"
              min={-24}
              max={24}
              step={1}
              value={params.transpose}
              onChange={(e) => setParams((p) => ({ ...p, transpose: Number(e.target.value) }))}
              className="w-20 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-amber-500"
            />
            <span className="font-bold text-amber-400 phosphor-glow-amber text-xs min-w-[32px] font-mono">
              {params.transpose >= 0 ? `+${params.transpose}` : params.transpose} st
            </span>
            <button
              onClick={() => setParams((p) => ({ ...p, transpose: 0 }))}
              className="hardware-button px-1.5 py-0.5 text-neutral-400 hover:text-white rounded text-[9px] font-mono uppercase"
              title="Reset Transpose to 0"
            >
              0
            </button>
          </div>

          {/* Stamped Socket: Diatonic Harmonise */}
          <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="silkscreen-label text-neutral-500 mr-0.5">HARMONISE:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => applyHarmonize('+3rd')}
                className="hardware-button px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-amber-300 rounded transition"
                title="Add diatonic +3rd harmony voice (above)"
              >
                +3rd
              </button>
              <button
                onClick={() => applyHarmonize('-3rd')}
                className="hardware-button px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-amber-300 rounded transition"
                title="Add diatonic -3rd harmony voice (below)"
              >
                -3rd
              </button>
              <button
                onClick={() => applyHarmonize('+5th')}
                className="hardware-button px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-emerald-300 rounded transition"
                title="Add diatonic +5th harmony voice (above)"
              >
                +5th
              </button>
              <button
                onClick={() => applyHarmonize('-5th')}
                className="hardware-button px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-emerald-300 rounded transition"
                title="Add diatonic -5th harmony voice (below)"
              >
                -5th
              </button>
              <button
                onClick={() => applyHarmonize('+12')}
                className="hardware-button px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-amber-400 rounded transition"
                title="Add +12 semitones (+1 Octave) harmony voice"
              >
                +12
              </button>
              <button
                onClick={() => applyHarmonize('-12')}
                className="hardware-button px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-amber-400 rounded transition"
                title="Add -12 semitones (-1 Octave) bass harmony voice"
              >
                -12
              </button>
            </div>
          </div>

          {/* Stamped Socket: Speed Multiplier */}
          <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="silkscreen-label text-neutral-500">SPEED:</span>
            <div className="flex gap-0.5">
              {[0.5, 1.0, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setParams((p) => ({ ...p, speedMultiplier: rate }))}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold transition ${
                    params.speedMultiplier === rate
                      ? 'bg-[#d97706] text-black font-extrabold shadow-[0_0_8px_rgba(217,119,6,0.8)]'
                      : 'hardware-button text-neutral-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Stamped Socket: Sync Mode */}
          <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <Gauge className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={params.syncMode}
              onChange={(e) => setParams((p) => ({ ...p, syncMode: e.target.value as 'daw' | 'audition' }))}
              className="bg-transparent text-[10.5px] font-mono font-bold text-amber-400 focus:outline-none cursor-pointer uppercase"
            >
              <option value="daw" className="bg-[#121418]">Follow DAW</option>
              <option value="audition" className="bg-[#121418]">Free Audition</option>
            </select>
          </div>

          {/* Bottom-Right Flush Allen Rack Screw */}
          <svg className="w-3.5 h-3.5 text-neutral-600 opacity-60 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" stroke="#333" strokeWidth="1.5" fill="#18191c"/>
            <polygon points="12,7 16.33,9.5 16.33,14.5 12,17 7.67,14.5 7.67,9.5" fill="#0d0e10" stroke="#2a2c30" strokeWidth="1"/>
          </svg>
        </div>
      </div>

      {/* 3. Arpeggiator Control Module Rack Bay (Collapsible with smooth grid transition) */}
      <div
        className={`grid transition-all duration-300 ease-in-out bg-[#121417] ${
          showArpPanel
            ? 'grid-rows-[1fr] opacity-100 py-2.5 border-t-2 border-b-2 border-black/90 shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)]'
            : 'grid-rows-[0fr] opacity-0 py-0 border-t-0 border-b-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3">
            {/* Rack Bay Header Badge */}
            <div className="flex items-center justify-between px-3 py-1 bg-[#0c0e10] border border-neutral-800 rounded-t text-[10px] font-mono mb-1.5">
              <span className="silkscreen-label text-amber-500 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                RACK BAY 01 // ANALOG ARPEGGIATOR ENGINE
              </span>
              <span className="text-[9px] text-neutral-500 hidden sm:inline">ANALOG ARP GENERATOR</span>
            </div>
            <ArpeggiatorControls
              params={params}
              onParamsChange={setParams}
              onApplyArpToSequence={handleApplyArpToSequence}
            />
          </div>
        </div>
      </div>

      {/* 4. Real-time Key & Chord Detector CRT Scope Rack Bay (Collapsible at bottom) */}
      <div
        className={`grid transition-all duration-300 ease-in-out bg-[#121417] ${
          showChordVisualizer
            ? 'grid-rows-[1fr] opacity-100 py-2.5 border-t-2 border-b-2 border-black/90 shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)]'
            : 'grid-rows-[0fr] opacity-0 py-0 border-t-0 border-b-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3">
            {/* Rack Bay Header Badge */}
            <div className="flex items-center justify-between px-3 py-1 bg-[#0c0e10] border border-neutral-800 rounded-t text-[10px] font-mono mb-1.5">
              <span className="silkscreen-label text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                RACK BAY 02 // KEY & CHORD DETECTOR CRT SCOPE
              </span>
              <span className="text-[9px] text-neutral-500 hidden sm:inline">KRUMHANSL-SCHMUCKLER PROFILE</span>
            </div>
            <ChordVisualizer
              activePitches={activePitches}
              sequenceNotes={sequence.notes}
              playheadPpq={playheadPpq}
              selectedNoteIds={selectedNoteIds}
              scaleRoot={params.scaleRoot}
              scaleType={params.scaleType}
            />
          </div>
        </div>
      </div>

      {/* Preset Drawer Modal */}
      <PresetDrawer
        isOpen={showPresetDrawer}
        onClose={() => setShowPresetDrawer(false)}
        activePresetId={activeLensPreset.id}
        currentSettings={getCurrentSettingsPayload()}
        onSelectPreset={handleApplyLensPreset}
        onPresetSaved={(newPreset) => handleApplyLensPreset(newPreset)}
      />

      {/* MIDI Export Modal (Type 0 / Type 1) */}
      <MidiExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        sequence={sequence}
        params={params}
      />

      {/* Real-time Non-blocking Scanning Modal Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#1b1e2a] border border-slate-700/80 rounded-2xl p-6 text-slate-100 shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
              <FolderSearch className="w-7 h-7 text-amber-400" />
            </div>

            <div className="space-y-1 w-full">
              <h3 className="font-bold text-base text-white font-mono uppercase tracking-wide">
                Scanning Folder for MIDI Files
              </h3>
              {currentScanningFolder && (
                <p className="text-[11px] font-mono text-slate-400 max-w-sm truncate mx-auto px-2">
                  {currentScanningFolder}
                </p>
              )}
            </div>

            {/* Live Non-Blocking Progress Counters */}
            <div className="grid grid-cols-2 gap-3 w-full bg-[#141722] p-3 rounded-xl border border-slate-800 font-mono">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Files Scanned</span>
                <span className="text-sm font-bold text-slate-200">
                  {scanProgress.scanned.toLocaleString()}
                  {scanProgress.total > 0 ? ` / ${scanProgress.total.toLocaleString()}` : ''}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">MIDI Discovered</span>
                <span className="text-sm font-bold text-amber-400">
                  {scanProgress.found.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Progress bar if total files known */}
            {scanProgress.total > 0 && (
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all duration-150"
                  style={{ width: `${Math.min(100, (scanProgress.scanned / scanProgress.total) * 100)}%` }}
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              {scanProgress.found > 0 && (
                <button
                  onClick={stopAndShowResults}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-md transition"
                >
                  Stop & View {scanProgress.found} Files
                </button>
              )}
              <button
                onClick={cancelScan}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanned Folder Library Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#1b1e2a] border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#141722] border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FolderSearch className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white font-mono">
                  SCANNED MIDI LIBRARY ({scannedFiles.length.toLocaleString()} files found)
                </h3>
              </div>
              <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#171a24] border-b border-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Search MIDI files or subfolders..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleLibraryCount(50);
                }}
                className="w-full bg-transparent text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredScannedFiles.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <FolderSearch className="w-6 h-6" />
                  </div>
                  <p className="text-slate-300 font-semibold">
                    {scannedFiles.length === 0
                      ? 'No .mid or .midi files were found in the selected folder.'
                      : `No MIDI files matching "${searchQuery}"`}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                    Tip: When the browser dialog opens, click <strong className="text-amber-400">"Upload"</strong> or <strong className="text-amber-400">"Allow"</strong> when prompted to allow reading the folder and subfolders. You can also drag-and-drop any folder or <code className="text-sky-300">.mid</code> files directly into the window!
                  </p>
                </div>
              ) : (
                <>
                  {filteredScannedFiles.slice(0, visibleLibraryCount).map((f, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const originalIdx = scannedFiles.findIndex((sf) => sf.relativePath === f.relativePath);
                        setCurrentScannedFileIdx(originalIdx >= 0 ? originalIdx : idx);
                        setActiveSourceType('scanned');
                        pushHistorySnapshot(`Load ${f.name}`);
                        loadMidiFromFile(f.file);
                        setShowFolderModal(false);
                        setNotificationBanner(`✓ Loaded "${f.name}"`);
                        setTimeout(() => setNotificationBanner(null), 3500);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-mono bg-[#141722]/60 hover:bg-amber-500/10 hover:border-amber-500/30 border border-slate-800/80 transition group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <FileMusic className="w-4 h-4 text-amber-400 group-hover:scale-110 shrink-0 transition-transform" />
                        <div className="truncate">
                          <span className="font-semibold text-slate-200 block truncate group-hover:text-amber-300 transition">
                            {f.name}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">{f.relativePath}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 ml-3 font-mono">
                        {(f.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </button>
                  ))}

                  {filteredScannedFiles.length > visibleLibraryCount && (
                    <div className="p-3 text-center border-t border-slate-800/80 bg-[#141722]/40 rounded-xl mt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        Showing {visibleLibraryCount} of {filteredScannedFiles.length} files
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setVisibleLibraryCount((prev) => prev + 50)}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-xs font-semibold rounded-xl border border-slate-700 transition"
                        >
                          Show +50 More
                        </button>
                        <button
                          onClick={() => setVisibleLibraryCount(filteredScannedFiles.length)}
                          className="px-3.5 py-1.5 bg-sky-950/60 hover:bg-sky-900 text-sky-200 font-mono text-xs font-semibold rounded-xl border border-sky-700/50 transition"
                        >
                          Show All ({filteredScannedFiles.length})
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
