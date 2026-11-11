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
  const [showChordVisualizer, setShowChordVisualizer] = useState(true);
  const [showArpPanel, setShowArpPanel] = useState(true);
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

  // Push snapshot before performing destructive sequence changes (maintains up to 50 historical steps, guaranteed >= 12 steps back)
  const pushHistorySnapshot = useCallback(
    (description: string) => {
      setPastHistory((prev) => [
        ...prev.slice(-49), // Retains up to 50 undo states (well exceeding the 12-step requirement)
        {
          sequence: JSON.parse(JSON.stringify(sequence)),
          description,
        },
      ]);
      setFutureHistory([]); // Clear redo
    },
    [sequence]
  );

  const handleUndo = useCallback(() => {
    if (pastHistory.length === 0) return;
    const previous = pastHistory[pastHistory.length - 1];
    const newPast = pastHistory.slice(0, pastHistory.length - 1);

    setFutureHistory((prev) => [
      {
        sequence: JSON.parse(JSON.stringify(sequence)),
        description: 'Undo',
      },
      ...prev,
    ]);

    setPastHistory(newPast);
    setSequence(previous.sequence);
  }, [pastHistory, sequence]);

  const handleRedo = useCallback(() => {
    if (futureHistory.length === 0) return;
    const next = futureHistory[0];
    const newFuture = futureHistory.slice(1);

    setPastHistory((prev) => [
      ...prev,
      {
        sequence: JSON.parse(JSON.stringify(sequence)),
        description: 'Redo',
      },
    ]);

    setFutureHistory(newFuture);
    setSequence(next.sequence);
  }, [futureHistory, sequence]);

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

  const currentBar = Math.floor(playheadPpq / 4) + 1;
  const currentBeat = Math.floor(playheadPpq % 4) + 1;
  const currentTick = Math.floor((playheadPpq % 1) * 100);

  const filteredScannedFiles = scannedFiles.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.relativePath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="relative flex flex-col w-full h-full bg-[#141722] text-slate-100 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Visual File Drop Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-sky-500/20 backdrop-blur-md border-2 border-dashed border-sky-400">
          <Upload className="w-16 h-16 text-sky-400 animate-bounce mb-3" />
          <p className="text-xl font-bold text-white tracking-wide">DROP MIDI FILE TO AUDITION</p>
          <p className="text-sm text-sky-200">Supports .mid and .midi files</p>
        </div>
      )}

      {/* Top Line 1: Brand, Active File, and Random Dice Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#141722] border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          {/* Brand Pill */}
          <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-sky-500/20 to-blue-600/20 border border-sky-500/30 rounded-full shadow-sm">
            <img src="/icon.svg" alt="MidiLens Icon" className="w-4 h-4 rounded-full shadow-sm" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300">
              MIDILENS
            </span>
          </div>

          {/* Active File / Pattern Status Pill */}
          <div
            className="flex items-center gap-2 px-3 py-1 bg-[#1b1e2a] border border-amber-500/30 rounded-xl font-mono text-xs shadow-inner"
            title={`Active sequence: ${sequence.name} (${sequence.notes.length} notes, ${sequence.bpm} BPM)`}
          >
            <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Active:</span>
            <span className="font-bold text-amber-300 truncate max-w-[260px]">{sequence.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">({sequence.notes.length} notes)</span>
          </div>

          {/* Dice next to Active to pick random file from library */}
          <button
            onClick={handleRandomPick}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#202433] hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 rounded-xl font-mono text-xs font-bold transition shadow-sm group"
            title={
              scannedFiles.length > 0
                ? `Pick a random MIDI file from your library (${scannedFiles.length.toLocaleString()} files)`
                : 'Pick a random factory pattern'
            }
          >
            <Dices className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
            <span>Random</span>
          </button>
        </div>
      </div>

      {/* Line 2: Presets, Unified Library & Files Dropdown, Scan Folder, Open, Drag to DAW */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-[#1b1e2a] border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        {/* Left: Preset Box + Unified Library & Dropdown Box */}
        <div className="flex items-center gap-2 shrink-0">
          {/* MidiLens Settings Preset Manager Button */}
          <button
            onClick={() => setShowPresetDrawer(true)}
            className="flex items-center gap-1.5 bg-[#232736] hover:bg-slate-700/80 border border-sky-500/30 rounded-xl px-2.5 py-1.5 text-sky-300 font-mono font-bold text-xs shadow-sm transition group shrink-0"
            title="Open Preset Manager to load/save scale, quantization & humanize settings"
          >
            <Bookmark className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="truncate max-w-[110px] sm:max-w-[130px]">Preset: {activeLensPreset.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Unified Library Box & Narrow Drop Down List of Files */}
          <div className="flex items-center bg-[#232736] border border-slate-700/60 rounded-xl p-0.5 shadow-sm shrink-0">
            <button
              onClick={() => handleStepItem(-1)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
              title="Previous MIDI File / Pattern"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center px-1">
              <select
                className="text-xs bg-transparent text-slate-200 font-semibold cursor-pointer px-1 py-1 focus:outline-none w-[125px] sm:w-[155px] max-w-[155px] truncate"
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
                    <option value="custom_file" className="bg-[#1b1e2a] text-slate-200">
                      {sequence.name}.mid
                    </option>
                  </optgroup>
                )}

                {scannedFiles.length > 0 && (
                  <optgroup label={`📁 Scanned MIDI Files (${scannedFiles.length.toLocaleString()})`}>
                    {scannedFiles.slice(0, 1000).map((f, idx) => (
                      <option key={`scanned_${idx}`} value={`scanned_${idx}`} className="bg-[#1b1e2a] text-slate-200">
                        {idx + 1}. {f.name}
                      </option>
                    ))}
                    {scannedFiles.length > 1000 && (
                      <option disabled className="bg-[#1b1e2a] text-slate-500">
                        ... +{(scannedFiles.length - 1000).toLocaleString()} more in Library modal
                      </option>
                    )}
                  </optgroup>
                )}

                <optgroup label="🎵 Factory Grooves & Patterns">
                  {PRESET_SEQUENCES.map((p, idx) => (
                    <option key={`preset_${idx}`} value={`preset_${idx}`} className="bg-[#1b1e2a] text-slate-200">
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button
              onClick={() => handleStepItem(1)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition mr-1"
              title="Next MIDI File / Pattern"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Integrated Compact Library Button */}
            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center gap-1.5 text-xs bg-[#171a24] hover:bg-amber-500/20 text-amber-300 border border-slate-700/70 hover:border-amber-500/40 rounded-lg px-2 py-1 font-mono transition shrink-0"
              title={`Open full searchable Library browser (${scannedFiles.length.toLocaleString()} files)`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">Library</span>
              {scannedFiles.length > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold">
                  {scannedFiles.length > 999
                    ? `${(scannedFiles.length / 1000).toFixed(0)}k`
                    : scannedFiles.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Scan Folder, Open, and Drag to DAW placed NEXT TO EACH OTHER */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Scan Folder Button */}
          <button
            onClick={handleScanFolderClick}
            disabled={isScanning}
            className="flex items-center gap-1.5 text-xs bg-[#232736] hover:bg-slate-700/80 disabled:opacity-50 border border-slate-700/60 rounded-xl px-2.5 py-1.5 text-amber-300 font-medium transition shadow-sm whitespace-nowrap"
            title="Scan a folder and all its subfolders on your computer for .mid files"
          >
            {isScanning ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <FolderSearch className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{isScanning ? `Scanning...` : 'Scan Folder'}</span>
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

          {/* Open Button */}
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
            className="flex items-center gap-1.5 text-xs bg-[#232736] hover:bg-slate-700/80 border border-slate-700/60 rounded-xl px-2.5 py-1.5 text-slate-300 font-medium transition shadow-sm whitespace-nowrap"
            title="Open one or multiple MIDI (.mid) files from your computer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Open</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mid,.midi"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Export MIDI / Drag to DAW Button */}
          <button
            onClick={() => setShowExportModal(true)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', sequence.name);
            }}
            title="Export piano roll as Type 0 or Type 1 .mid file directly to your machine"
            className="group relative flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-grab active:cursor-grabbing transition whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-950 group-hover:-translate-y-0.5 transition-transform" />
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

      {/* Control Strip (Scaler 3 style DAW toolbar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#171a24] border-b border-slate-800">
        {/* Left: Transport + Undo/Redo + Digital LCD Counter */}
        <div className="flex items-center gap-3">
          {/* Transport Buttons */}
          <div className="flex items-center gap-1.5 bg-[#202433] p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={togglePlay}
              className={`p-2 rounded-lg flex items-center justify-center transition ${
                isPlaying
                  ? 'bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-md shadow-sky-500/30'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={stopPlayback}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Stop & Rewind"
            >
              <Square className="w-4 h-4" />
            </button>

            <button
              onClick={() => setParams((p) => ({ ...p, loop: !p.loop }))}
              className={`p-2 rounded-lg transition ${
                params.loop
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
              title="Toggle Loop"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Undo / Redo Buttons */}
          <div className="flex items-center gap-1 bg-[#202433] p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={handleUndo}
              disabled={pastHistory.length === 0}
              className="relative p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:hover:bg-slate-800 text-slate-200 rounded-lg transition"
              title={
                pastHistory.length > 0
                  ? `Undo ${pastHistory[pastHistory.length - 1].description} (${pastHistory.length} steps available, Cmd+Z)`
                  : 'Undo (Cmd+Z)'
              }
            >
              <Undo2 className="w-4 h-4" />
              {pastHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 text-[8px] font-mono font-bold bg-sky-500 text-slate-950 rounded-full px-1 py-0 leading-tight">
                  {pastHistory.length > 12 ? '12+' : pastHistory.length}
                </span>
              )}
            </button>
            <button
              onClick={handleRedo}
              disabled={futureHistory.length === 0}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:hover:bg-slate-800 text-slate-200 rounded-lg transition"
              title={
                futureHistory.length > 0
                  ? 'Redo (Cmd+Shift+Z / Ctrl+Y)'
                  : 'Redo (Cmd+Shift+Z)'
              }
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Digital LCD Position & Tempo Counter */}
          <div className="flex items-center gap-3 px-3.5 py-1.5 bg-[#0f1118] border border-slate-800 rounded-xl font-mono text-xs shadow-inner">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-slate-500 tracking-wider">POSITION</span>
              <span className="font-bold text-sky-400">
                {String(currentBar).padStart(3, '0')}.{String(currentBeat).padStart(2, '0')}.{String(currentTick).padStart(2, '0')}
              </span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase text-slate-500 tracking-wider">
                  {params.syncMode === 'audition' ? 'TEMPO (MANUAL)' : 'TEMPO (DAW)'}
                </span>
                {params.syncMode === 'daw' ? (
                  <span title="Locked to DAW host">
                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Free Audition: Manual BPM active" />
                )}
              </div>
              {params.syncMode === 'audition' ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    onClick={() => handleTempoChange(sequence.bpm - 1)}
                    className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center justify-center text-[10px] transition"
                    title="Decrease manual BPM (-1, Shift+Click -5)"
                    onMouseDown={(e) => {
                      if (e.shiftKey) handleTempoChange(sequence.bpm - 5);
                    }}
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>

                  <input
                    type="number"
                    min={20}
                    max={320}
                    value={tempoInputValue}
                    onChange={(e) => {
                      setTempoInputValue(e.target.value);
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 20 && val <= 320) {
                        handleTempoChange(val);
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
                    className="w-11 bg-slate-900 border border-slate-700/80 rounded px-1 py-0 text-center font-bold text-amber-400 text-xs focus:border-amber-400 focus:outline-none"
                    title="Type manual BPM (20-320)"
                  />

                  <button
                    onClick={() => handleTempoChange(sequence.bpm + 1)}
                    className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center justify-center text-[10px] transition"
                    title="Increase manual BPM (+1, Shift+Click +5)"
                    onMouseDown={(e) => {
                      if (e.shiftKey) handleTempoChange(sequence.bpm + 5);
                    }}
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                  <span className="text-[10px] text-amber-400/80 font-bold ml-0.5">BPM</span>
                </div>
              ) : (
                <span className="font-bold text-amber-400 flex items-center gap-1" title="Synced to DAW host">
                  {Math.round(sequence.bpm * params.speedMultiplier)} BPM
                  <span className="text-[9px] text-slate-500 font-normal">[DAW]</span>
                </span>
              )}
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-slate-500 tracking-wider">TIME SIG</span>
              <span className="font-bold text-slate-300">
                {sequence.timeSigNumerator}/{sequence.timeSigDenominator}
              </span>
            </div>
          </div>

          {/* Timing Grid Selector */}
          <div className="flex items-center gap-1.5 bg-[#202433] px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-sm">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Grid:</span>
            <select
              value={params.quantizeGrid}
              onChange={(e) => setParams((p) => ({ ...p, quantizeGrid: e.target.value as QuantizeGrid }))}
              className="bg-transparent text-xs font-mono font-bold text-amber-400 focus:outline-none cursor-pointer"
            >
              {Object.entries(QUANTIZE_GRID_DIVISIONS).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#1b1e2a] text-slate-200">
                  {v.name}
                </option>
              ))}
            </select>
            <button
              onClick={applyTimingQuantize}
              className="px-2 py-1 text-[10px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition ml-1"
              title="Quantize note start times and lengths to grid"
            >
              Q-Time
            </button>
          </div>

          {/* Original Detected Key Box (Placed next to Grid box) */}
          <div className="flex items-center gap-1.5 bg-[#202433] px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-sm" title="Detected original MIDI key">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Orig:</span>
            <span className="text-xs font-bold text-sky-300 font-mono">{keyResult.keyName}</span>
          </div>
        </div>

        {/* Right: Scale, Sync to project key, Target key & Humanise */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scaler 3 Style Active Scale Pill Box with Q-Scale */}
          <div className="flex items-center gap-2 bg-[#202433] px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-sm">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Scale:</span>
            <select
              value={params.scaleRoot}
              onChange={(e) => setParams((p) => ({ ...p, scaleRoot: Number(e.target.value) }))}
              className="bg-transparent text-xs font-mono font-bold text-sky-400 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i} className="bg-[#1b1e2a] text-slate-200">
                  {getNoteName(i)}
                </option>
              ))}
            </select>

            <select
              value={params.scaleType}
              onChange={(e) => setParams((p) => ({ ...p, scaleType: e.target.value as ScaleType }))}
              className="bg-transparent text-xs font-mono text-sky-300 focus:outline-none cursor-pointer max-w-[125px] truncate"
            >
              {Object.entries(SCALE_DEFINITIONS).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#1b1e2a] text-slate-200">
                  {v.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setParams((p) => ({ ...p, scaleLock: !p.scaleLock }))}
              className={`p-1 rounded-lg transition ${
                params.scaleLock ? 'text-sky-400 bg-sky-950/60' : 'text-slate-600 hover:text-slate-400'
              }`}
              title={params.scaleLock ? 'Scale Lock ON' : 'Scale Lock OFF'}
            >
              {params.scaleLock ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={applyScaleQuantize}
              className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-700/50 rounded-lg transition"
              title="Snap all existing notes to nearest in-scale pitch"
            >
              Q-Scale
            </button>
          </div>

          {/* Sync to project key Box */}
          <div className="flex items-center gap-1.5 bg-[#202433] px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-sm">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Project:</span>
            <select
              value={params.projectKeyRoot}
              onChange={(e) => setParams((p) => ({ ...p, projectKeyRoot: Number(e.target.value) }))}
              className="bg-transparent text-xs font-mono font-bold text-emerald-400 focus:outline-none cursor-pointer"
              title="Current host DAW project root note"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i} className="bg-[#1b1e2a] text-slate-200">
                  {getNoteName(i)}
                </option>
              ))}
            </select>

            <select
              value={params.projectScaleType}
              onChange={(e) => setParams((p) => ({ ...p, projectScaleType: e.target.value as ScaleType }))}
              className="bg-transparent text-xs font-mono text-emerald-300 focus:outline-none cursor-pointer max-w-[105px] truncate"
              title="Current host DAW project scale type"
            >
              {Object.entries(SCALE_DEFINITIONS).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#1b1e2a] text-slate-200">
                  {v.name}
                </option>
              ))}
            </select>

            <button
              onClick={syncToProjectKey}
              className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg transition"
              title="Sync to project key: sets active scale to project key and transposes sequence"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Sync</span>
            </button>
          </div>

          {/* Target key Box (Selectable scale) */}
          <div className="flex items-center gap-1.5 bg-[#202433] px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-sm">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Target:</span>
            <select
              value={params.targetKeyRoot}
              onChange={(e) => setParams((p) => ({ ...p, targetKeyRoot: Number(e.target.value) }))}
              className="bg-transparent text-xs font-mono font-bold text-amber-400 focus:outline-none cursor-pointer"
              title="Selectable target root key"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i} className="bg-[#1b1e2a] text-slate-200">
                  {getNoteName(i)}
                </option>
              ))}
            </select>

            <select
              value={params.targetScaleType}
              onChange={(e) => setParams((p) => ({ ...p, targetScaleType: e.target.value as ScaleType }))}
              className="bg-transparent text-xs font-mono text-amber-300 focus:outline-none cursor-pointer max-w-[110px] truncate"
              title="Selectable target scale"
            >
              {Object.entries(SCALE_DEFINITIONS).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#1b1e2a] text-slate-200">
                  {v.name}
                </option>
              ))}
            </select>

            <button
              onClick={applyTargetKeyMatch}
              className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition"
              title="Set active scale to Target Key and transpose sequence"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Match</span>
            </button>
          </div>

          {/* Humanise Button (Placed next to Target box) */}
          <button
            onClick={() => setShowHumanizeModal(!showHumanizeModal)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-gradient-to-r from-purple-900/50 to-indigo-900/50 hover:from-purple-800/60 hover:to-indigo-800/60 text-purple-200 border border-purple-500/30 rounded-xl transition shadow-sm"
            title="Open Humanise velocity jitter & timing swing controls"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-300" />
            <span>Humanise</span>
          </button>

          {/* Arpeggiator Module Toggle Button */}
          <button
            onClick={() => setShowArpPanel(!showArpPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-xl transition shadow-sm border ${
              params.arpEnabled || showArpPanel
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#202433] text-slate-400 border-slate-700/60 hover:text-white'
            }`}
            title="Toggle Arpeggiator control panel"
          >
            <Zap className={`w-3.5 h-3.5 ${params.arpEnabled ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Arpeggiator</span>
            {params.arpEnabled && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          </button>

          {/* Chord Visualizer Toggle Button */}
          <button
            onClick={() => setShowChordVisualizer(!showChordVisualizer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-xl transition shadow-sm border ${
              showChordVisualizer
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-[#202433] text-slate-400 border-slate-700/60 hover:text-white'
            }`}
            title="Toggle real-time Chord Analysis & Audio Visualizer"
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Chord Visualizer</span>
          </button>
        </div>
      </div>

      {/* Humanize Dropdown Banner */}
      {showHumanizeModal && (
        <div className="px-5 py-3 bg-[#1b1e2a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Velocity Jitter:</span>
              <span className="text-amber-400 font-bold">&plusmn;{humanizeVelRange}</span>
              <input
                type="range"
                min={2}
                max={40}
                value={humanizeVelRange}
                onChange={(e) => setHumanizeVelRange(Number(e.target.value))}
                className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <button
                onClick={applyHumanizeVelocity}
                className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition"
              >
                Apply Jitter
              </button>
            </div>

            <div className="w-px h-6 bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Custom Range:</span>
              <input
                type="number"
                min={1}
                max={127}
                value={randomMinVel}
                onChange={(e) => setRandomMinVel(Number(e.target.value))}
                className="w-12 px-1.5 py-0.5 bg-[#0f1118] border border-slate-700 rounded-md text-center text-slate-200"
              />
              <span className="text-slate-500">to</span>
              <input
                type="number"
                min={1}
                max={127}
                value={randomMaxVel}
                onChange={(e) => setRandomMaxVel(Number(e.target.value))}
                className="w-12 px-1.5 py-0.5 bg-[#0f1118] border border-slate-700 rounded-md text-center text-slate-200"
              />
              <button
                onClick={applyRandomizeVelocityRange}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition"
              >
                Randomize
              </button>
            </div>

            <div className="w-px h-6 bg-slate-800" />

            <button
              onClick={applyHumanizeTiming}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition"
            >
              Humanise Timing
            </button>
          </div>

          <button onClick={() => setShowHumanizeModal(false)} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Arpeggiator Control Module Panel */}
      {showArpPanel && (
        <div className="p-2 bg-[#141722] border-b border-slate-800">
          <ArpeggiatorControls
            params={params}
            onParamsChange={setParams}
            onApplyArpToSequence={handleApplyArpToSequence}
          />
        </div>
      )}

      {/* Main Piano Roll Canvas Container */}
      <div className="flex-1 w-full min-h-[380px] p-2 bg-[#141722]">
        <PianoRoll
          notes={sequence.notes}
          totalLengthPpq={sequence.totalLengthPpq}
          playheadPpq={playheadPpq}
          previewTranspose={params.transpose}
          scaleRoot={params.scaleRoot}
          scaleType={params.scaleType}
          scaleLock={params.scaleLock}
          onNotesChange={(newNotes) => {
            pushHistorySnapshot('Note Edit');
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

      {/* Real-time Chord Analysis & Audio Oscilloscope Visualizer */}
      {showChordVisualizer && (
        <div className="p-2 bg-[#141722] border-t border-slate-800">
          <ChordVisualizer
            activePitches={activePitches}
            sequenceNotes={sequence.notes}
            playheadPpq={playheadPpq}
            selectedNoteIds={selectedNoteIds}
            scaleRoot={params.scaleRoot}
            scaleType={params.scaleType}
          />
        </div>
      )}

      {/* Bottom Footer / Controls Bar (Scaler 3 style bottom strip) */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-[#1b1e2a] border-t border-slate-800/80 text-xs font-mono">
        {/* Interactive Velocity Heatmap & Proportional Slider + Select All Button */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider flex items-center gap-1.5">
            Velocity:
          </span>

          {/* Interactive Heatmap Slider Track */}
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-[9px] shrink-0">Soft (1)</span>

            <div
              ref={heatmapBarRef}
              onMouseDown={handleVelocityMouseDown}
              className={`relative w-44 sm:w-56 h-6 rounded-lg bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-500 border border-slate-700/80 shadow-inner flex items-center select-none cursor-pointer transition-all ${
                hasSelectedNotes ? 'ring-2 ring-sky-500/40 shadow-lg' : 'hover:border-slate-500'
              }`}
              title={
                hasSelectedNotes
                  ? `Velocity: ${avgMidiVelocity} / 127 · Drag slider up/down or across track to adjust`
                  : 'Select note(s) to view and adjust velocity, or click to adjust all'
              }
            >
              {/* If notes are selected, display interactive line/slider thumb */}
              {hasSelectedNotes ? (
                <>
                  {/* Glowing Vertical Slider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] -translate-x-1/2 pointer-events-none z-10"
                    style={{ left: `${linePercent}%` }}
                  />

                  {/* Top Slider Pin Thumb */}
                  <div
                    className="absolute -top-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full shadow-md -translate-x-1/2 z-20 hover:scale-125 transition-transform"
                    style={{ left: `${linePercent}%` }}
                  />

                  {/* Bottom Slider Pin Thumb */}
                  <div
                    className="absolute -bottom-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full shadow-md -translate-x-1/2 z-20 hover:scale-125 transition-transform"
                    style={{ left: `${linePercent}%` }}
                  />

                  {/* Value Tooltip Badge */}
                  <div
                    className="absolute -top-7 -translate-x-1/2 bg-[#0d1017] border border-amber-400/80 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-300 shadow-xl pointer-events-none whitespace-nowrap z-30"
                    style={{ left: `${linePercent}%` }}
                  >
                    {selectedNotes.length === 1
                      ? `Vel: ${avgMidiVelocity}`
                      : `Avg: ${avgMidiVelocity} (${selectedNotes.length} notes)`}
                  </div>
                </>
              ) : (
                <div className="w-full text-center text-[9px] text-slate-900/80 font-bold tracking-tight pointer-events-none truncate px-1">
                  Click to set velocity
                </div>
              )}
            </div>

            <span className="text-rose-400 font-bold text-[9px] shrink-0">Loud (127)</span>

            {/* Micro Stepper & Direct Numeric Value */}
            {hasSelectedNotes && (
              <div className="flex items-center gap-1 bg-[#10131d] px-1.5 py-0.5 rounded-lg border border-slate-700/80 ml-1">
                <button
                  onClick={() => {
                    const newVel = Math.max(0.01, (avgMidiVelocity - 2) / 127);
                    applyVelocityToSelectedNotes(newVel, true);
                  }}
                  className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-[10px] transition active:scale-95"
                  title="Decrease velocity (-2, Shift-click -8)"
                  onMouseDown={(e) => {
                    if (e.shiftKey) {
                      e.stopPropagation();
                      const newVel = Math.max(0.01, (avgMidiVelocity - 8) / 127);
                      applyVelocityToSelectedNotes(newVel, true);
                    }
                  }}
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>

                <span className="font-mono font-bold text-amber-400 text-[11px] min-w-[28px] text-center">
                  {avgMidiVelocity}
                </span>

                <button
                  onClick={() => {
                    const newVel = Math.min(1.0, (avgMidiVelocity + 2) / 127);
                    applyVelocityToSelectedNotes(newVel, true);
                  }}
                  className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-[10px] transition active:scale-95"
                  title="Increase velocity (+2, Shift-click +8)"
                  onMouseDown={(e) => {
                    if (e.shiftKey) {
                      e.stopPropagation();
                      const newVel = Math.min(1.0, (avgMidiVelocity + 8) / 127);
                      applyVelocityToSelectedNotes(newVel, true);
                    }
                  }}
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>

          {/* Select All Button next to the velocity heatmap */}
          <button
            onClick={handleToggleSelectAllNotes}
            className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-xl border transition flex items-center gap-1.5 shrink-0 ${
              selectedNoteIds.size === sequence.notes.length && sequence.notes.length > 0
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80 hover:text-white'
            }`}
            title="Select all notes in piano roll (Cmd+A / Ctrl+A)"
          >
            <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {selectedNoteIds.size === sequence.notes.length && sequence.notes.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </span>
            {selectedNoteIds.size > 0 && (
              <span className="text-[10px] text-sky-400 font-mono">
                ({selectedNoteIds.size})
              </span>
            )}
          </button>
        </div>

        {/* Realtime Transpose, Harmonise & Speed Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Transpose Slider */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold text-[11px]">Transpose:</span>
            <input
              type="range"
              min={-24}
              max={24}
              step={1}
              value={params.transpose}
              onChange={(e) => setParams((p) => ({ ...p, transpose: Number(e.target.value) }))}
              className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="font-bold text-amber-400 min-w-[36px]">
              {params.transpose >= 0 ? `+${params.transpose}` : params.transpose} st
            </span>
            <button
              onClick={() => setParams((p) => ({ ...p, transpose: 0 }))}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md text-[10px]"
              title="Reset Transpose to 0"
            >
              0
            </button>
          </div>

          <div className="w-px h-5 bg-slate-800" />

          {/* Harmonise Buttons: +- Thirds, +- Fifths, +- Octaves */}
          <div className="flex items-center gap-1.5 bg-[#202433] px-2.5 py-1 rounded-xl border border-slate-700/60 shadow-sm">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold mr-1" title="Generate musical harmony voices conforming to the active scale">
              Harmonise:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => applyHarmonize('+3rd')}
                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition"
                title="Add diatonic +3rd harmony voice (above)"
              >
                +3rd
              </button>
              <button
                onClick={() => applyHarmonize('-3rd')}
                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition"
                title="Add diatonic -3rd harmony voice (below)"
              >
                -3rd
              </button>
              <button
                onClick={() => applyHarmonize('+5th')}
                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded-lg transition"
                title="Add diatonic +5th harmony voice (above)"
              >
                +5th
              </button>
              <button
                onClick={() => applyHarmonize('-5th')}
                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded-lg transition"
                title="Add diatonic -5th harmony voice (below)"
              >
                -5th
              </button>
              <button
                onClick={() => applyHarmonize('+12')}
                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg transition"
                title="Add +12 semitones (+1 Octave) harmony voice"
              >
                +12
              </button>
              <button
                onClick={() => applyHarmonize('-12')}
                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg transition"
                title="Add -12 semitones (-1 Octave) bass harmony voice"
              >
                -12
              </button>
            </div>
          </div>

          <div className="w-px h-5 bg-slate-800" />

          {/* Speed Multiplier Controls */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold text-[11px]">Speed:</span>
            <span className="font-bold text-amber-400 min-w-[36px]">
              {params.speedMultiplier.toFixed(2)}x
            </span>
            <div className="flex gap-1">
              {[0.5, 1.0, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setParams((p) => ({ ...p, speedMultiplier: rate }))}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                    params.speedMultiplier === rate
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-4 bg-slate-800" />

          {/* Sync Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-[#202433] px-2.5 py-1 rounded-xl border border-slate-700/60">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={params.syncMode}
              onChange={(e) => setParams((p) => ({ ...p, syncMode: e.target.value as 'daw' | 'audition' }))}
              className="bg-transparent text-[11px] font-mono text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="daw" className="bg-[#1b1e2a]">Follow DAW</option>
              <option value="audition" className="bg-[#1b1e2a]">Free Audition</option>
            </select>
          </div>

          {/* Dedicated Manual Tempo Controls when not synced to DAW */}
          {params.syncMode === 'audition' ? (
            <div className="flex items-center gap-1.5 bg-[#202433] px-2.5 py-1 rounded-xl border border-amber-500/40 shadow-sm animate-in fade-in duration-150">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
                BPM:
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTempoChange(sequence.bpm - 1)}
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs transition active:scale-95"
                  title="Decrease tempo by 1 BPM (Shift-click for -5)"
                  onMouseDown={(e) => {
                    if (e.shiftKey) handleTempoChange(sequence.bpm - 5);
                  }}
                >
                  <Minus className="w-3 h-3" />
                </button>

                <input
                  type="number"
                  min={20}
                  max={320}
                  value={tempoInputValue}
                  onChange={(e) => {
                    setTempoInputValue(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 20 && val <= 320) {
                      handleTempoChange(val);
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
                  className="w-12 bg-[#10121a] border border-slate-700/80 rounded px-1 py-0.5 text-center font-mono font-bold text-amber-400 text-xs focus:border-amber-400 focus:outline-none"
                  title="Manual tempo (20 - 320 BPM)"
                />

                <button
                  onClick={() => handleTempoChange(sequence.bpm + 1)}
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-xs transition active:scale-95"
                  title="Increase tempo by 1 BPM (Shift-click for +5)"
                  onMouseDown={(e) => {
                    if (e.shiftKey) handleTempoChange(sequence.bpm + 5);
                  }}
                >
                  <Plus className="w-3 h-3" />
                </button>

                {/* Tap Tempo Button */}
                <button
                  onClick={handleTapTempo}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono transition ml-0.5 ${
                    isTapActive
                      ? 'bg-amber-400 text-slate-950 scale-105 shadow'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                  }`}
                  title="Tap Tempo: Click repeatedly in rhythm to detect tempo"
                >
                  TAP
                </button>

                {/* Quick Tempo Shortcuts */}
                <div className="hidden sm:flex items-center gap-0.5 ml-1 border-l border-slate-700/60 pl-1.5">
                  {[80, 100, 120, 140, 160].map((t) => (
                    <button
                      key={t}
                      onClick={() => handleTempoChange(t)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold transition ${
                        sequence.bpm === t
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#202433] px-2.5 py-1 rounded-xl border border-slate-700/60 text-[11px] font-mono text-slate-400" title="Tempo is locked to DAW host timeline">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>DAW Host: <strong className="text-amber-400">{sequence.bpm} BPM</strong></span>
            </div>
          )}
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
