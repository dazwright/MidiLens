import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MidiSequence, PluginParameters, KeyResult, ScannedMidiFile, ScaleType, QuantizeGrid, LibraryFileMeta } from '../types';
import { PRESET_SEQUENCES, parseMidiFile, serializeMidiFile } from '../midiParser';
import { analyzeKeyFromNotes, calculateSemitoneOffsetToTarget, getNoteName } from '../keyDetection';
import {
  SCALE_DEFINITIONS,
  QUANTIZE_GRID_DIVISIONS,
  snapPitchToScale,
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
  PRESET_PACKS,
} from '../presetManager';
import { synthAudioEngine } from '../audioEngine';
import { PianoRoll } from './PianoRoll';
import { PresetDrawer } from './PresetDrawer';
import { ArpeggiatorControls } from './ArpeggiatorControls';
import { MidiExportModal } from './MidiExportModal';
import { arpeggiateNotes } from '../arpUtils';
import { LibraryModal, getLibraryFileKey } from './LibraryModal';
import { generateMusicalPattern, GeneratorPatternType } from '../midiGenerator';
import {
  quantizeNotesWithStrength,
  applySwingToNotes,
  applyLegatoAndFixOverlaps,
  applyStaccatoToNotes,
  applyStrumToNotes,
  scaleSequenceTimingDestructive,
  invertChords,
  applyDrop2Voicing,
  applyOpenVoicing,
  reversePatternNotes,
  mirrorPitchNotes,
  rotatePatternNotes,
  extractLayerNotes,
} from '../midiTransform';
import {
  isJuceNative,
  emitToJuce,
  onJuceEvent,
  uint8ArrayToBase64,
  base64ToArrayBuffer,
} from '../juceBridge';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Upload,
  Download,
  Music,
  Sparkles,
  Zap,
  Gauge,
  Radio,
  FolderSearch,
  Lock,
  Unlock,
  Wand2,
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Bookmark,
  ChevronDown,
  Undo2,
  Redo2,
  Loader2,
  AlertCircle,
  Dices,
  Minus,
  Plus,
  CheckSquare,
  GripVertical,
  Star,
  SlidersHorizontal,
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
    syncMode: 'daw',
    loop: true,
    loopStartPpq: 0,
    loopEndPpq: null,
    targetKeyRoot: 0,
    targetKeyIsMinor: true,
    targetScaleType: 'minor',
    projectKeyRoot: 0,
    projectScaleType: 'major',
    scaleRoot: FACTORY_PRESETS[0].settings.scaleRoot,
    scaleType: FACTORY_PRESETS[0].settings.scaleType,
    scaleLock: FACTORY_PRESETS[0].settings.scaleLock,
    quantizeGrid: FACTORY_PRESETS[0].settings.quantizeGrid,
    quantizeStrength: FACTORY_PRESETS[0].settings.quantizeStrength ?? 100,
    arpEnabled: false,
    arpMode: 'up',
    arpRate: '1/16',
    arpOctaves: 1,
    arpGate: 0.75,
  });

  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<number>>(new Set());

  // Panel & Modal visibility toggles
  const [showArpPanel, setShowArpPanel] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTransformPanel, setShowTransformPanel] = useState(false);
  const [swingGrid, setSwingGrid] = useState<'1/8' | '1/16'>('1/16');
  const [swingPercent, setSwingPercent] = useState(55);
  const [strumMs, setStrumMs] = useState(25);

  const [keyResult, setKeyResult] = useState<KeyResult>(() => analyzeKeyFromNotes(PRESET_SEQUENCES[0].notes));
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Folder scanning state (non-blocking chunked scan & streaming progress)
  const [scannedFiles, setScannedFiles] = useState<ScannedMidiFile[]>([]);
  const scannedFilesRef = useRef<ScannedMidiFile[]>([]);
  useEffect(() => {
    scannedFilesRef.current = scannedFiles;
  }, [scannedFiles]);

  // Persistent Library Favourites, Custom Tags & Detected Key/BPM Metadata
  const [libraryMeta, setLibraryMeta] = useState<Record<string, LibraryFileMeta>>(() => {
    try {
      const raw = localStorage.getItem('midilens_library_meta_v1');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore storage read error
    }
    return {};
  });
  useEffect(() => {
    try {
      localStorage.setItem('midilens_library_meta_v1', JSON.stringify(libraryMeta));
    } catch {
      // ignore storage quota error
    }
  }, [libraryMeta]);

  const [savedFolderPaths, setSavedFolderPaths] = useState<string[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
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

  // Humanize & Dynamics panel state
  const [showHumanizeModal, setShowHumanizeModal] = useState(false);
  const [humanizeVelRange, setHumanizeVelRange] = useState(FACTORY_PRESETS[0].settings.humanizeVelRange);
  const [randomMinVel, setRandomMinVel] = useState(FACTORY_PRESETS[0].settings.randomMinVel);
  const [randomMaxVel, setRandomMaxVel] = useState(FACTORY_PRESETS[0].settings.randomMaxVel);

  // Rule-Based MIDI Generator state
  const [showGeneratorPanel, setShowGeneratorPanel] = useState(false);
  const [generatorType, setGeneratorType] = useState<GeneratorPatternType>('melody');
  const [generatorBars, setGeneratorBars] = useState<2 | 4 | 8>(4);
  const [isDawHostConnected, setIsDawHostConnected] = useState(false);
  const [dawKeyDetected, setDawKeyDetected] = useState(false);
  const [dawHostBpm, setDawHostBpm] = useState<number | null>(null);
  const [dawHostTimeSig, setDawHostTimeSig] = useState<{ num: number; den: number } | null>(null);
  const genCounterRef = useRef(0);
  const wasMidiDraggedRef = useRef(false);

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
      quantizeStrength: s.quantizeStrength ?? 100,
      loopStartPpq: 0,
      loopEndPpq: null,
      transpose: s.transpose,
      speedMultiplier: s.speedMultiplier,
      velocityScale: s.velocityScale,
      velocityOffset: s.velocityOffset,
    }));

    setHumanizeVelRange(s.humanizeVelRange);
    setRandomMinVel(s.randomMinVel);
    setRandomMaxVel(s.randomMaxVel);

    // Overrides any currently loaded library/custom MIDI file with preset groove
    setActiveSourceType('preset');
    setCurrentScannedFileIdx(-1);

    const targetSeq =
      preset.sequence ||
      PRESET_SEQUENCES.find((p) => p.name.toLowerCase() === preset.name.toLowerCase()) ||
      PRESET_SEQUENCES[0];

    pushHistorySnapshot(`Load Preset Groove (${preset.name})`);
    synthAudioEngine.stop();
    setPlayheadPpq(0);
    setSelectedNoteIds(new Set());
    setSequence(targetSeq);
    setNotificationBanner(`✓ Loaded Preset Groove: "${preset.name}"`);
    setTimeout(() => setNotificationBanner(null), 3500);
  }, [pushHistorySnapshot]);

  // Current Settings Payload for Saving New Preset
  const getCurrentSettingsPayload = (): PresetSettings => ({
    scaleRoot: params.scaleRoot,
    scaleType: params.scaleType,
    scaleLock: params.scaleLock,
    quantizeGrid: params.quantizeGrid,
    quantizeStrength: params.quantizeStrength ?? 100,
    humanizeVelRange,
    randomMinVel,
    randomMaxVel,
    humanizeTimingAmount: 0.03,
    transpose: params.transpose,
    speedMultiplier: params.speedMultiplier,
    velocityScale: params.velocityScale,
    velocityOffset: params.velocityOffset,
  });

  // Synchronize Audio Engine (WebAudio in browser, C++ AudioProcessor in JUCE DAW plugin)
  const lastSyncedSeqNameRef = useRef<string>('');
  const hasRestoredJuceStateRef = useRef<boolean>(false);

  useEffect(() => {
    const notesForPlayback = params.arpEnabled
      ? arpeggiateNotes(sequence.notes, sequence.totalLengthPpq, {
          mode: params.arpMode,
          rate: params.arpRate,
          octaves: params.arpOctaves,
          gate: params.arpGate,
        })
      : sequence.notes;

    synthAudioEngine.setSequence(sequence.notes, sequence.totalLengthPpq, sequence.bpm);

    if (isJuceNative()) {
      const resetPlayhead = lastSyncedSeqNameRef.current !== '' && lastSyncedSeqNameRef.current !== sequence.name;
      lastSyncedSeqNameRef.current = sequence.name;
      emitToJuce('syncSequence', {
        name: sequence.name,
        bpm: sequence.bpm,
        totalLengthPpq: sequence.totalLengthPpq,
        timeSigNumerator: sequence.timeSigNumerator || 4,
        timeSigDenominator: sequence.timeSigDenominator || 4,
        resetPlayhead,
        notes: notesForPlayback.map((n) => ({
          id: n.id,
          pitch: n.pitch,
          startPpq: n.startPpq,
          durationPpq: n.durationPpq,
          velocity: n.velocity,
          channel: n.channel || 1,
        })),
      });
    }
  }, [
    sequence,
    params.arpEnabled,
    params.arpMode,
    params.arpRate,
    params.arpOctaves,
    params.arpGate,
  ]);

  useEffect(() => {
    synthAudioEngine.setParameters(params);
    if (isJuceNative()) {
      emitToJuce('syncParams', {
        transpose: params.transpose,
        speedMultiplier: params.speedMultiplier,
        velocityScale: params.velocityScale,
        velocityOffset: params.velocityOffset,
        syncMode: params.syncMode,
        loop: params.loop,
        loopStartPpq: params.loopStartPpq ?? 0,
        loopEndPpq: params.loopEndPpq ?? -1,
        manualTempo: sequence.bpm,
      });
    }
  }, [params, sequence.bpm]);

  useEffect(() => {
    synthAudioEngine.setOnPlayheadUpdate((ppq) => {
      setPlayheadPpq(ppq);
    });
    synthAudioEngine.setOnStateChange((playing) => {
      setIsPlaying(playing);
    });
  }, []);

  // Native JUCE 8 WebView Event Listeners (DAW Telemetry, Finder Folder Scan, File Load & State Recall)
  useEffect(() => {
    if (!isJuceNative()) return;

    const unwrapJucePayload = (raw: any) => (Array.isArray(raw) && raw.length === 1 ? raw[0] : raw);

    const unsubTelemetry = onJuceEvent('dawTelemetry', (rawPayload: any) => {
      const payload = unwrapJucePayload(rawPayload);
      if (!payload) return;
      if (typeof payload.playheadPpq === 'number') {
        setPlayheadPpq(payload.playheadPpq);
      }
      if (typeof payload.isPlaying === 'boolean') {
        setIsPlaying(payload.isPlaying);
      }
      if (typeof payload.isDawConnected === 'boolean') {
        setIsDawHostConnected(payload.isDawConnected);
      }
      if (
        typeof payload.hostBpm === 'number' &&
        payload.hostBpm >= 20 &&
        payload.hostBpm <= 320 &&
        (payload.hostBpmDetected || payload.isDawConnected)
      ) {
        const roundedBpm = Math.round(payload.hostBpm);
        setDawHostBpm((prev) => (prev === roundedBpm ? prev : roundedBpm));
      }
      if (
        payload.hostTimeSigDetected &&
        typeof payload.hostTimeSigNumerator === 'number' &&
        typeof payload.hostTimeSigDenominator === 'number' &&
        payload.hostTimeSigNumerator > 0 &&
        payload.hostTimeSigDenominator > 0
      ) {
        const num = payload.hostTimeSigNumerator;
        const den = payload.hostTimeSigDenominator;
        setDawHostTimeSig((prev) => (prev && prev.num === num && prev.den === den ? prev : { num, den }));
      }
      if (payload.hostKeyDetected) {
        setDawKeyDetected(true);
        setIsDawHostConnected(true);
      }
      if (payload.hostKeyDetected && typeof payload.hostKeyRoot === 'number') {
        const nextScale: ScaleType = payload.hostKeyIsMinor ? 'minor' : 'major';
        setParams((prev) => {
          if (prev.projectKeyRoot === payload.hostKeyRoot && prev.projectScaleType === nextScale) {
            return prev;
          }
          return {
            ...prev,
            projectKeyRoot: payload.hostKeyRoot,
            projectScaleType: nextScale,
          };
        });
      }
    });

    const unsubLibrary = onJuceEvent('libraryScanned', (rawPayload: any) => {
      const payload = unwrapJucePayload(rawPayload);
      setIsScanning(false);
      setIsWaitingFolderAuth(false);
      if (!payload || payload.canceled) {
        setNotificationBanner(null);
        return;
      }

      if (Array.isArray(payload.scannedFolders)) {
        setSavedFolderPaths(payload.scannedFolders.map((p: any) => String(p)).filter(Boolean));
      }

      if (payload.streamed) {
        const addedCount = Number(payload.addedCount || 0);
        setVisibleLibraryCount(50);
        if (addedCount > 0) {
          setNotificationBanner(
            `✓ Added "${payload.folderName || 'Folder'}" (${addedCount.toLocaleString()} MIDI files) to library.`
          );
          setTimeout(() => setNotificationBanner(null), 4000);
        }
        return;
      }

      const incoming: ScannedMidiFile[] = Array.isArray(payload.files)
        ? payload.files.map((f: any) => ({
            name: String(f.name || 'Untitled.mid'),
            relativePath: String(f.relativePath || f.name || 'Untitled.mid'),
            nativePath: String(f.fullPath || ''),
            sizeBytes: Number(f.sizeBytes || 0),
          }))
        : [];

      if (incoming.length === 0) {
        setNotificationBanner('No .mid or .midi files found in the selected folder.');
        setTimeout(() => setNotificationBanner(null), 5000);
        return;
      }

      setScannedFiles((prev) => {
        if (prev.length === 0) {
          return incoming;
        }
        const existingKeys = new Set(
          prev.map((p) => p.nativePath || `${p.relativePath}::${p.sizeBytes}`)
        );
        const deduped = incoming.filter(
          (d) => !existingKeys.has(d.nativePath || `${d.relativePath}::${d.sizeBytes}`)
        );
        return [...prev, ...deduped];
      });
      setVisibleLibraryCount(50);

      setNotificationBanner(
        `✓ Added "${payload.folderName || 'Folder'}" (${incoming.length.toLocaleString()} MIDI files) to library.`
      );
      setTimeout(() => setNotificationBanner(null), 4000);
    });

    const unsubLibraryChunk = onJuceEvent('libraryChunk', (rawPayload: any) => {
      const payload = unwrapJucePayload(rawPayload);
      if (!payload) return;

      if (Array.isArray(payload.scannedFolders)) {
        setSavedFolderPaths(payload.scannedFolders.map((p: any) => String(p)).filter(Boolean));
      }

      const chunk: ScannedMidiFile[] = Array.isArray(payload.files)
        ? payload.files.map((f: any) => ({
            name: String(f.name || 'Untitled.mid'),
            relativePath: String(f.relativePath || f.name || 'Untitled.mid'),
            nativePath: String(f.fullPath || ''),
            sizeBytes: Number(f.sizeBytes || 0),
          }))
        : [];

      if (payload.reset) {
        setScannedFiles(chunk);
      } else if (chunk.length > 0) {
        setScannedFiles((prev) => [...prev, ...chunk]);
      }

      if (payload.done && payload.fromRescan) {
        setIsRescanning(false);
        const total = Number(payload.totalCount ?? chunk.length);
        setNotificationBanner(`✓ Library rescanned (${total.toLocaleString()} MIDI files indexed).`);
        setTimeout(() => setNotificationBanner(null), 3500);
      }
    });

    const unsubMidiLoaded = onJuceEvent('midiFileLoaded', (rawPayload: any) => {
      const payload = unwrapJucePayload(rawPayload);
      if (!payload || !payload.base64) {
        setNotificationBanner('Could not load MIDI file: empty data returned from host.');
        setTimeout(() => setNotificationBanner(null), 4500);
        return;
      }
      try {
        const fileName = String(payload.name || 'Loaded.mid');
        const buf = base64ToArrayBuffer(String(payload.base64));
        const parsed = parseMidiFile(buf, fileName);
        synthAudioEngine.stop();
        setPlayheadPpq(0);
        setSelectedNoteIds(new Set());
        setParams((prev) => ({ ...prev, loopStartPpq: 0, loopEndPpq: null }));
        if (payload.sourceType === 'custom') {
          setActiveSourceType('custom');
          setCurrentScannedFileIdx(-1);
        } else {
          setActiveSourceType('scanned');
          if (typeof payload.index === 'number' && payload.index >= 0) {
            setCurrentScannedFileIdx(payload.index);
          }
          const matchedFile =
            (typeof payload.index === 'number' && scannedFilesRef.current[payload.index]) ||
            (payload.fullPath
              ? scannedFilesRef.current.find((f) => f.nativePath === payload.fullPath)
              : undefined);
          const fileKey = matchedFile
            ? getLibraryFileKey(matchedFile)
            : String(payload.fullPath || fileName);
          const detected = analyzeKeyFromNotes(parsed.notes);
          setLibraryMeta((prev) => ({
            ...prev,
            [fileKey]: {
              ...prev[fileKey],
              detectedKey: detected.keyName,
              detectedRoot: detected.rootPitch,
              detectedIsMinor: detected.isMinor,
              bpm: parsed.bpm,
            },
          }));
        }
        setSequence(parsed);
        if (parsed.notes.length === 0) {
          setNotificationBanner(`Warning: "${fileName}" was loaded but contains no MIDI note events.`);
          setTimeout(() => setNotificationBanner(null), 5000);
        } else {
          setNotificationBanner(`✓ Loaded "${fileName}" (${parsed.notes.length} notes) into piano roll.`);
          setTimeout(() => setNotificationBanner(null), 3500);
        }
      } catch (err) {
        setNotificationBanner(`Could not parse MIDI file: ${(err as Error).message}`);
        setTimeout(() => setNotificationBanner(null), 5000);
      }
    });

    const unsubMidiLoadError = onJuceEvent('midiFileLoadError', (rawPayload: any) => {
      const payload = unwrapJucePayload(rawPayload);
      const name = payload?.name ? `"${payload.name}"` : 'MIDI file';
      const detail = payload?.error || 'File could not be read from disk.';
      setNotificationBanner(`Unable to load ${name}: ${detail}`);
      setTimeout(() => setNotificationBanner(null), 5500);
    });

    const unsubExportSaved = onJuceEvent('exportSaved', (rawPayload: any) => {
      const payload = unwrapJucePayload(rawPayload);
      if (payload?.savedPath) {
        setNotificationBanner(`✓ Exported MIDI file to "${payload.savedPath}"`);
        setTimeout(() => setNotificationBanner(null), 4000);
      }
    });

    const unsubRestore = onJuceEvent('restorePluginState', (rawPayload: any) => {
      const payload = unwrapJucePayload(rawPayload);
      if (!payload) return;
      if (Array.isArray(payload.scannedFolders)) {
        setSavedFolderPaths(payload.scannedFolders.map((p: any) => String(p)).filter(Boolean));
      }
      if (Array.isArray(payload.scannedFiles) && payload.scannedFiles.length > 0) {
        setScannedFiles(
          payload.scannedFiles.map((f: any) => ({
            name: String(f.name || 'Untitled.mid'),
            relativePath: String(f.relativePath || f.name || 'Untitled.mid'),
            nativePath: String(f.fullPath || ''),
            sizeBytes: Number(f.sizeBytes || 0),
          }))
        );
      }
      if (typeof payload.stateJson === 'string' && payload.stateJson.trim().length > 0) {
        try {
          const parsedState = JSON.parse(payload.stateJson);
          if (parsedState.sequence && Array.isArray(parsedState.sequence.notes)) {
            lastSyncedSeqNameRef.current = parsedState.sequence.name || '';
            setSequence(parsedState.sequence);
          }
          if (parsedState.params) {
            setParams((prev) => ({ ...prev, ...parsedState.params }));
          }
          if (parsedState.activePresetId) {
            const foundPreset = FACTORY_PRESETS.find((p) => p.id === parsedState.activePresetId);
            if (foundPreset) setActiveLensPreset(foundPreset);
          }
          if (parsedState.activeSourceType) {
            setActiveSourceType(parsedState.activeSourceType);
          }
          if (typeof parsedState.currentScannedFileIdx === 'number') {
            setCurrentScannedFileIdx(parsedState.currentScannedFileIdx);
          }
          if (parsedState.libraryMeta && typeof parsedState.libraryMeta === 'object') {
            setLibraryMeta((prev) => ({ ...parsedState.libraryMeta, ...prev }));
          }
        } catch {
          // ignore malformed state JSON
        }
      }
      hasRestoredJuceStateRef.current = true;
    });

    emitToJuce('frontendReady', {});

    return () => {
      unsubTelemetry();
      unsubLibrary();
      unsubLibraryChunk();
      unsubMidiLoaded();
      unsubMidiLoadError();
      unsubExportSaved();
      unsubRestore();
    };
  }, []);

  // Persist UI state to C++ processor for DAW project / window reload recall
  useEffect(() => {
    if (!isJuceNative()) return;
    const timer = window.setTimeout(() => {
      emitToJuce('saveUiState', {
        stateJson: JSON.stringify({
          sequence,
          params,
          activePresetId: activeLensPreset.id,
          activeSourceType,
          currentScannedFileIdx,
          libraryMeta,
        }),
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [sequence, params, activeLensPreset.id, activeSourceType, currentScannedFileIdx, libraryMeta]);

  const handleToggleFavorite = useCallback((fileKey: string) => {
    setLibraryMeta((prev) => {
      const existing = prev[fileKey] || {};
      return {
        ...prev,
        [fileKey]: {
          ...existing,
          favorite: !existing.favorite,
        },
      };
    });
  }, []);

  const handleAddTag = useCallback((fileKey: string, rawTag: string) => {
    const clean = rawTag.trim();
    if (!clean) return;
    setLibraryMeta((prev) => {
      const existing = prev[fileKey] || {};
      const currentTags = existing.tags || [];
      if (currentTags.some((t) => t.toLowerCase() === clean.toLowerCase())) return prev;
      return {
        ...prev,
        [fileKey]: {
          ...existing,
          tags: [...currentTags, clean],
        },
      };
    });
  }, []);

  const handleRemoveTag = useCallback((fileKey: string, tagToRemove: string) => {
    setLibraryMeta((prev) => {
      const existing = prev[fileKey];
      if (!existing || !existing.tags) return prev;
      return {
        ...prev,
        [fileKey]: {
          ...existing,
          tags: existing.tags.filter((t) => t !== tagToRemove),
        },
      };
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
    const startPpq = params.loopStartPpq ?? 0;
    setPlayheadPpq(startPpq);
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

  // Keep sequence BPM & Meter matched to host DAW whenever Follow DAW mode is active
  useEffect(() => {
    if (params.syncMode !== 'daw') return;
    setSequence((prev) => {
      const nextBpm = dawHostBpm !== null ? dawHostBpm : prev.bpm;
      const nextNum = dawHostTimeSig !== null ? dawHostTimeSig.num : prev.timeSigNumerator || 4;
      const nextDen = dawHostTimeSig !== null ? dawHostTimeSig.den : prev.timeSigDenominator || 4;
      if (
        prev.bpm === nextBpm &&
        (prev.timeSigNumerator || 4) === nextNum &&
        (prev.timeSigDenominator || 4) === nextDen
      ) {
        return prev;
      }
      return {
        ...prev,
        bpm: nextBpm,
        timeSigNumerator: nextNum,
        timeSigDenominator: nextDen,
      };
    });
    if (dawHostBpm !== null) {
      setTempoInputValue(String(dawHostBpm));
      synthAudioEngine.setTempo(dawHostBpm);
    }
  }, [params.syncMode, dawHostBpm, dawHostTimeSig]);

  // Sync To Project Key & DAW BPM/Meter (matches active key, transpose, and host DAW tempo/meter)
  const syncToProjectKey = () => {
    const targetScaleName = SCALE_DEFINITIONS[params.projectScaleType]?.name || params.projectScaleType;
    const keyLabel = `${getNoteName(params.projectKeyRoot)} ${targetScaleName}`;
    pushHistorySnapshot(
      dawHostBpm !== null
        ? `Sync to DAW (${keyLabel} · ${dawHostBpm} BPM)`
        : `Sync to Project Key (${keyLabel})`
    );
    const semitones = calculateSemitoneOffsetToTarget(keyResult.rootPitch, params.projectKeyRoot);
    setParams((prev) => ({
      ...prev,
      scaleRoot: prev.projectKeyRoot,
      scaleType: prev.projectScaleType,
      transpose: semitones,
      syncMode: dawHostBpm !== null || dawHostTimeSig !== null ? 'daw' : prev.syncMode,
    }));

    if (dawHostBpm !== null || dawHostTimeSig !== null) {
      setSequence((prev) => ({
        ...prev,
        bpm: dawHostBpm ?? prev.bpm,
        timeSigNumerator: dawHostTimeSig?.num ?? (prev.timeSigNumerator || 4),
        timeSigDenominator: dawHostTimeSig?.den ?? (prev.timeSigDenominator || 4),
      }));
      if (dawHostBpm !== null) {
        setTempoInputValue(String(dawHostBpm));
        synthAudioEngine.setTempo(dawHostBpm);
      }
      setNotificationBanner(
        `✓ Synced to Project: ${keyLabel}${dawHostBpm !== null ? ` @ ${dawHostBpm} BPM` : ''}${
          dawHostTimeSig ? ` (${dawHostTimeSig.num}/${dawHostTimeSig.den})` : ''
        }`
      );
    } else {
      setNotificationBanner(`✓ Synced to Project Key: ${keyLabel}`);
    }
    window.setTimeout(() => setNotificationBanner(null), 3500);
  };

  // Active key selection for rule-based generation: DAW Project Key when connected, otherwise App Key
  const isConnectedToDaw =
    (isJuceNative() && (isDawHostConnected || dawKeyDetected)) || params.syncMode === 'daw';
  const effectiveGenRoot = isConnectedToDaw ? params.projectKeyRoot : params.scaleRoot;
  const effectiveGenScale = isConnectedToDaw ? params.projectScaleType : params.scaleType;

  const handleGeneratePattern = useCallback(
    (overrideType?: GeneratorPatternType) => {
      const patternType = overrideType ?? generatorType;
      if (overrideType) setGeneratorType(overrideType);

      const targetRoot = effectiveGenRoot;
      const targetScale = effectiveGenScale;
      const keySourceLabel = isConnectedToDaw ? 'DAW Project Key' : 'App Key';
      const rootLabel = getNoteName(targetRoot);
      const scaleLabel = SCALE_DEFINITIONS[targetScale]?.name || targetScale;

      pushHistorySnapshot(`Generate ${patternType} (${rootLabel} ${scaleLabel})`);
      const lockedNotes = sequenceRef.current.notes.filter((n) => n.locked);
      const timeSigNum = sequence.timeSigNumerator || 4;
      const timeSigDen = sequence.timeSigDenominator || 4;
      const barPpq = timeSigNum * (4 / timeSigDen);

      const generated = generateMusicalPattern({
        type: patternType,
        scaleRoot: targetRoot,
        scaleType: targetScale,
        bars: generatorBars,
        bpm: sequence.bpm,
        timeSigNumerator: timeSigNum,
        timeSigDenominator: timeSigDen,
        keySource: isConnectedToDaw ? 'daw' : 'app',
      });

      const preservedLocked = lockedNotes.map((n, idx) => ({
        ...n,
        id: idx + 1,
        locked: true,
      }));
      const idOffset = preservedLocked.length;
      const newGeneratedNotes = generated.notes.map((n, idx) => ({
        ...n,
        id: idOffset + idx + 1,
        locked: false,
      }));
      const mergedNotes = [...preservedLocked, ...newGeneratedNotes].sort(
        (a, b) => a.startPpq - b.startPpq
      );

      const maxLockedEnd = preservedLocked.reduce(
        (max, n) => Math.max(max, n.startPpq + n.durationPpq),
        0
      );
      const finalLengthPpq =
        maxLockedEnd > generated.totalLengthPpq
          ? Math.ceil(maxLockedEnd / barPpq) * barPpq
          : generated.totalLengthPpq;

      genCounterRef.current += 1;
      const numberedSeq: MidiSequence = {
        ...generated,
        name: `${generated.name} #${genCounterRef.current}`,
        totalLengthPpq: finalLengthPpq,
        notes: mergedNotes,
      };

      synthAudioEngine.stop();
      setPlayheadPpq(0);
      setSelectedNoteIds(new Set());
      setActiveSourceType('custom');
      setCurrentScannedFileIdx(-1);
      setSequence(numberedSeq);

      setParams((prev) => ({
        ...prev,
        transpose: 0,
        scaleRoot: targetRoot,
        scaleType: targetScale,
      }));

      setNotificationBanner(
        preservedLocked.length > 0
          ? `Generated ${patternType.toUpperCase()} in ${rootLabel} ${scaleLabel} (${keySourceLabel}) · Preserved ${preservedLocked.length} locked note${preservedLocked.length > 1 ? 's' : ''}`
          : `Generated ${patternType.toUpperCase()} in ${rootLabel} ${scaleLabel} (${keySourceLabel})`
      );
      window.setTimeout(() => setNotificationBanner(null), 4000);
    },
    [
      generatorType,
      generatorBars,
      effectiveGenRoot,
      effectiveGenScale,
      isConnectedToDaw,
      sequence.bpm,
      sequence.timeSigNumerator,
      sequence.timeSigDenominator,
      pushHistorySnapshot,
    ]
  );

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

  // Quantize Timing to Grid (with Strength %)
  const applyTimingQuantize = () => {
    const strength = params.quantizeStrength ?? 100;
    pushHistorySnapshot(`Quantise Timing (${params.quantizeGrid} @ ${strength}%)`);
    const updated = quantizeNotesWithStrength(sequence.notes, selectedNoteIds, params.quantizeGrid, strength);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Swing / Shuffle (%)
  const applySwing = () => {
    pushHistorySnapshot(`Swing ${swingGrid} (${swingPercent}%)`);
    const updated = applySwingToNotes(sequence.notes, selectedNoteIds, swingGrid, swingPercent);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Legato / Overlap Fix
  const applyLegato = () => {
    pushHistorySnapshot('Legato / Fix Overlaps');
    const updated = applyLegatoAndFixOverlaps(sequence.notes, selectedNoteIds, sequence.totalLengthPpq);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Staccato (50% duration trim)
  const applyStaccato = () => {
    pushHistorySnapshot('Staccato (50%)');
    const updated = applyStaccatoToNotes(sequence.notes, selectedNoteIds, 0.5);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Strum / Flam chord notes
  const applyStrum = (direction: 'up' | 'down') => {
    pushHistorySnapshot(`Strum ${direction === 'up' ? 'Up' : 'Down'} (${strumMs}ms)`);
    const updated = applyStrumToNotes(sequence.notes, selectedNoteIds, direction, strumMs, sequence.bpm);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Destructive Half/Double Speed Stretch/Compress (updates actual PPQ positions & loop length for DAW drag)
  const applyDestructiveSpeed = (factor: 0.5 | 2.0) => {
    const label = factor === 0.5 ? '2× Double-Time Compress' : '0.5× Half-Time Stretch';
    pushHistorySnapshot(label);
    const scaled = scaleSequenceTimingDestructive(sequence, factor);
    setSequence(scaled);
    setParams((prev) => ({
      ...prev,
      loopStartPpq: prev.loopStartPpq ? Math.min(scaled.totalLengthPpq - 0.5, prev.loopStartPpq * factor) : 0,
      loopEndPpq:
        prev.loopEndPpq !== null && prev.loopEndPpq !== undefined
          ? Math.min(scaled.totalLengthPpq, prev.loopEndPpq * factor)
          : null,
    }));
    setNotificationBanner(
      factor === 0.5
        ? '✓ Compressed notes 0.5× (Double-Time) onto DAW grid — ready to drag to Logic Pro.'
        : '✓ Stretched notes 2× (Half-Time) onto DAW grid — ready to drag to Logic Pro.'
    );
    window.setTimeout(() => setNotificationBanner(null), 3500);
  };

  // Chord Voicing Tools: Invert Up/Down, Drop-2, Open Voicing
  const applyChordInvert = (direction: 'up' | 'down') => {
    pushHistorySnapshot(`Invert Chords ${direction === 'up' ? 'Up' : 'Down'}`);
    const updated = invertChords(sequence.notes, selectedNoteIds, direction);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  const applyDrop2 = () => {
    pushHistorySnapshot('Drop-2 Voicing');
    const updated = applyDrop2Voicing(sequence.notes, selectedNoteIds);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  const applyOpenVoice = () => {
    pushHistorySnapshot('Toggle Open/Close Voicing');
    const updated = applyOpenVoicing(sequence.notes, selectedNoteIds);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Reverse / Mirror / Shift-Rotate Pattern
  const applyReversePattern = () => {
    pushHistorySnapshot('Reverse Pattern (Retrograde)');
    const updated = reversePatternNotes(sequence.notes, selectedNoteIds, sequence.totalLengthPpq);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  const applyMirrorPattern = () => {
    pushHistorySnapshot('Mirror Pitches (Invert)');
    const updated = mirrorPitchNotes(
      sequence.notes,
      selectedNoteIds,
      params.scaleRoot,
      params.scaleType,
      params.scaleLock
    );
    setSequence((s) => ({ ...s, notes: updated }));
  };

  const applyRotatePattern = (stepPpq: number) => {
    pushHistorySnapshot(`Shift Pattern ${stepPpq < 0 ? 'Left' : 'Right'} 1/16`);
    const updated = rotatePatternNotes(sequence.notes, selectedNoteIds, stepPpq, sequence.totalLengthPpq);
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Bass-Root / Topline Extraction
  const applyExtractLayer = (mode: 'bass' | 'topline') => {
    pushHistorySnapshot(mode === 'bass' ? 'Extract Bass-Root Layer' : 'Extract Topline Melody');
    const updated = extractLayerNotes(sequence.notes, selectedNoteIds, mode);
    setSequence((s) => ({ ...s, notes: updated }));
    setSelectedNoteIds(new Set());
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

  // Humanise Velocity (±Jitter)
  const applyHumanizeVelocity = () => {
    pushHistorySnapshot(`Humanise Velocity (±${humanizeVelRange})`);
    const updated = humanizeNotesVelocity(
      sequence.notes,
      selectedNoteIds,
      humanizeVelRange
    );
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Randomize Velocity within Min/Max Range
  const applyRandomizeVelocityRange = () => {
    pushHistorySnapshot(`Randomize Velocity Range (${randomMinVel}-${randomMaxVel})`);
    const updated = randomizeNotesVelocityRange(
      sequence.notes,
      selectedNoteIds,
      randomMinVel / 127.0,
      randomMaxVel / 127.0
    );
    setSequence((s) => ({ ...s, notes: updated }));
  };

  // Humanize Timing
  const applyHumanizeTiming = () => {
    pushHistorySnapshot('Humanize Timing');
    const updated = humanizeNotesTiming(sequence.notes, selectedNoteIds, 0.03);
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

  const scaleVelocitySample = (origVel: number, initialAvg: number, targetAvg: number): number => {
    const minVel = 0.01;
    const maxVel = 1.0;
    const v = Math.min(maxVel, Math.max(minVel, origVel));
    const target = Math.min(maxVel, Math.max(minVel, targetAvg));
    if (target >= initialAvg) {
      const denom = maxVel - initialAvg;
      const t = denom > 0.001 ? (target - initialAvg) / denom : 1.0;
      return Math.min(maxVel, Math.max(minVel, v + (maxVel - v) * t));
    }
    const denom = initialAvg - minVel;
    const t = denom > 0.001 ? (initialAvg - target) / denom : 1.0;
    return Math.min(maxVel, Math.max(minVel, v - (v - minVel) * t));
  };

  // Apply new average velocity with endpoint-preserving scaling to all selected notes
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

        setSequence((s) => ({
          ...s,
          notes: s.notes.map((n) => {
            if (selectedNoteIds.has(n.id)) {
              return { ...n, velocity: scaleVelocitySample(n.velocity, currentAvg, clampedAvg) };
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
      setSequence((s) => ({
        ...s,
        notes: s.notes.map((n) => {
          if (initialVelMap.has(n.id)) {
            const initV = initialVelMap.get(n.id)!;
            return { ...n, velocity: scaleVelocitySample(initV, initialAvg, clickRatio) };
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
        setSequence((s) => ({
          ...s,
          notes: s.notes.map((n) => {
            if (initialVelMap.has(n.id)) {
              const initV = initialVelMap.get(n.id)!;
              return { ...n, velocity: scaleVelocitySample(initV, initialAvg, targetAvg) };
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
    setParams((prev) => ({ ...prev, loopStartPpq: 0, loopEndPpq: null }));
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

  const loadScannedItem = (item: ScannedMidiFile, idx?: number) => {
    if (item.file) {
      loadMidiFromFile(item.file, item);
    } else if (item.nativePath && isJuceNative()) {
      setNotificationBanner(`⏳ Loading "${item.name}" (syncing from cloud if needed)...`);
      emitToJuce('nativeLoadFile', {
        name: item.name,
        fullPath: item.nativePath,
        index: typeof idx === 'number' ? idx : -1,
        sourceType: 'scanned',
      });
    } else {
      setNotificationBanner(
        `Unable to load "${item.name}": file handle unavailable. Please re-scan the folder.`
      );
      setTimeout(() => setNotificationBanner(null), 5000);
    }
  };

  // Handle file or preset selection from the top dropdown
  const handleItemSelect = (val: string) => {
    if (val === 'open_library') {
      setShowFolderModal(true);
      return;
    }
    if (val.startsWith('scanned_')) {
      const idx = Number(val.replace('scanned_', ''));
      const item = scannedFiles[idx];
      if (item) {
        setCurrentScannedFileIdx(idx);
        setActiveSourceType('scanned');
        pushHistorySnapshot(`Load Scanned MIDI (${item.name})`);
        loadScannedItem(item, idx);
      }
    } else if (val.startsWith('preset_')) {
      const idx = Number(val.replace('preset_', ''));
      handleSelectSequence(idx);
    }
  };

  const handleRescanSavedFolders = useCallback(() => {
    if (!isJuceNative() || isRescanning) return;
    setIsRescanning(true);
    setNotificationBanner('⏳ Re-checking remembered folders for new MIDI files...');
    emitToJuce('rescanSavedFolders', {});
  }, [isRescanning]);

  // Step backwards / forwards across active source items (scanned files or presets)
  const handleStepItem = (direction: -1 | 1) => {
    if (activeSourceType === 'scanned' && scannedFiles.length > 0) {
      const nextIdx = (currentScannedFileIdx + direction + scannedFiles.length) % scannedFiles.length;
      setCurrentScannedFileIdx(nextIdx);
      const item = scannedFiles[nextIdx];
      pushHistorySnapshot(`Load Scanned MIDI (${item.name})`);
      loadScannedItem(item, nextIdx);
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
      loadScannedItem(chosen, randIdx);
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

  // Stop scanning and keep all discovered files in the library
  const stopAndShowResults = () => {
    isCancelledRef.current = true;
    setIsScanning(false);
    setIsWaitingFolderAuth(false);
    const discovered = [...currentDiscoveredRef.current];
    setScannedFiles((prev) => {
      if (prev.length === 0) return discovered;
      const existingKeys = new Set(prev.map((p) => `${p.relativePath}::${p.sizeBytes}`));
      const deduped = discovered.filter((d) => !existingKeys.has(`${d.relativePath}::${d.sizeBytes}`));
      return [...prev, ...deduped];
    });
    setVisibleLibraryCount(50);
    if (discovered.length > 0) {
      setNotificationBanner(`✓ Added ${discovered.length.toLocaleString()} MIDI files to library.`);
      setTimeout(() => setNotificationBanner(null), 4000);
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  // Direct, synchronous trigger of folder selection dialog - native Finder in JUCE or browser directory picker
  const handleScanFolderClick = () => {
    isCancelledRef.current = false;
    currentDiscoveredRef.current = [];
    setScanProgress({ scanned: 0, total: 0, found: 0 });
    setCurrentScanningFolder('');

    if (isJuceNative()) {
      setIsWaitingFolderAuth(true);
      setNotificationBanner('📁 Select a folder in Finder to scan MIDI files into your library...');
      emitToJuce('nativeScanFolder', { append: true });
      return;
    }

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
        // Complete - Merge newly discovered files into existing library avoiding duplicates
        setScannedFiles((prev) => {
          if (prev.length === 0) return [...discovered];
          const existingKeys = new Set(prev.map((p) => `${p.relativePath}::${p.sizeBytes}`));
          const newItems = discovered.filter((d) => !existingKeys.has(`${d.relativePath}::${d.sizeBytes}`));
          return [...prev, ...newItems];
        });
        setIsScanning(false);
        setVisibleLibraryCount(50);

        if (discovered.length > 0) {
          setNotificationBanner(`✓ Added ${discovered.length.toLocaleString()} MIDI files to library.`);
          setTimeout(() => setNotificationBanner(null), 4000);
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

  const loadMidiFromFile = (file?: File, scannedItem?: ScannedMidiFile) => {
    if (!file) return;
    setNotificationBanner(`⏳ Loading "${file.name}"...`);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) {
          setNotificationBanner(
            `Unable to load "${file.name}": 0 bytes read (if stored online-only in Google Drive/iCloud, mark the folder "Available offline" or load via the installed AU/Standalone plugin).`
          );
          setTimeout(() => setNotificationBanner(null), 6500);
          return;
        }
        const parsed = parseMidiFile(buffer, file.name);
        synthAudioEngine.stop();
        setPlayheadPpq(0);
        setSelectedNoteIds(new Set());
        setParams((prev) => ({ ...prev, loopStartPpq: 0, loopEndPpq: null }));
        if (scannedItem) {
          const fileKey = getLibraryFileKey(scannedItem);
          const detected = analyzeKeyFromNotes(parsed.notes);
          setLibraryMeta((prev) => ({
            ...prev,
            [fileKey]: {
              ...prev[fileKey],
              detectedKey: detected.keyName,
              detectedRoot: detected.rootPitch,
              detectedIsMinor: detected.isMinor,
              bpm: parsed.bpm,
            },
          }));
        }
        setSequence(parsed);
        if (parsed.notes.length === 0) {
          setNotificationBanner(`Warning: "${file.name}" was loaded but contains no MIDI note events.`);
          setTimeout(() => setNotificationBanner(null), 5000);
        } else {
          setNotificationBanner(`✓ Loaded "${file.name}" (${parsed.notes.length} notes) into piano roll.`);
          setTimeout(() => setNotificationBanner(null), 3500);
        }
      } catch (err) {
        setNotificationBanner('Could not parse MIDI file: ' + (err as Error).message);
        setTimeout(() => setNotificationBanner(null), 5000);
      }
    };
    reader.onerror = () => {
      setNotificationBanner(`Could not read "${file.name}". Please check file permissions.`);
      setTimeout(() => setNotificationBanner(null), 5000);
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
        setScannedFiles((prev) => {
          if (prev.length === 0) return [...discovered];
          const existingKeys = new Set(prev.map((p) => `${p.relativePath}::${p.sizeBytes}`));
          const deduped = discovered.filter((d) => !existingKeys.has(`${d.relativePath}::${d.sizeBytes}`));
          return [...prev, ...deduped];
        });
        setIsScanning(false);
        setVisibleLibraryCount(50);
        if (discovered.length > 0) {
          setNotificationBanner(`✓ Added ${discovered.length.toLocaleString()} MIDI files from dropped folder to library.`);
          setTimeout(() => setNotificationBanner(null), 4000);
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

  // Keep quick-jump <select> capped at 25 nearby items so WKWebView never builds 10k+ <option> DOM nodes
  const quickScannedWindow = useMemo(() => {
    if (scannedFiles.length === 0) {
      return { start: 0, items: [] as { file: ScannedMidiFile; originalIndex: number }[] };
    }
    const windowSize = 25;
    const center =
      currentScannedFileIdx >= 0 && currentScannedFileIdx < scannedFiles.length
        ? currentScannedFileIdx
        : 0;
    const start = Math.max(
      0,
      Math.min(scannedFiles.length - windowSize, center - Math.floor(windowSize / 2))
    );
    const end = Math.min(scannedFiles.length, start + windowSize);
    const items: { file: ScannedMidiFile; originalIndex: number }[] = [];
    for (let i = start; i < end; i++) {
      items.push({ file: scannedFiles[i], originalIndex: i });
    }
    return { start, items };
  }, [scannedFiles, currentScannedFileIdx]);

  return (
    <div
      className="relative flex flex-col w-full min-h-full bg-gradient-to-b from-[#1c1e22] via-[#191b1f] to-[#141618] text-neutral-200 border-2 border-black/90 rounded-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95)] font-sans border-t border-t-white/15 border-b-2 border-b-black/95 select-none"
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
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#1c1e22] border-b-2 border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
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

      {/* Channel Strip 2: Presets, Stamped File Well, Scan Folder, Open, Drag to DAW & Export MIDI */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#181a1e] border-b-2 border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
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

                {quickScannedWindow.items.length > 0 && (
                  <optgroup
                    label={`📁 Library (${scannedFiles.length.toLocaleString()} files${
                      scannedFiles.length > quickScannedWindow.items.length
                        ? ` · ${quickScannedWindow.start + 1}-${quickScannedWindow.start + quickScannedWindow.items.length}`
                        : ''
                    })`}
                  >
                    {quickScannedWindow.items.map(({ file, originalIndex }) => (
                      <option key={`scanned_${originalIndex}`} value={`scanned_${originalIndex}`} className="bg-[#121418] text-neutral-200">
                        {file.name}
                      </option>
                    ))}
                    {scannedFiles.length > quickScannedWindow.items.length && (
                      <option value="open_library" className="bg-[#121418] text-amber-400">
                        Browse all {scannedFiles.length.toLocaleString()} files in Library...
                      </option>
                    )}
                  </optgroup>
                )}

                {PRESET_PACKS.map((pack) => {
                  const packItems = PRESET_SEQUENCES.map((p, idx) => ({ p, idx })).filter(
                    ({ p }) => p.pack === pack.name
                  );
                  if (packItems.length === 0) return null;
                  return (
                    <optgroup key={pack.name} label={`📦 ${pack.name} (${packItems.length})`}>
                      {packItems.map(({ p, idx }) => (
                        <option key={`preset_${idx}`} value={`preset_${idx}`} className="bg-[#121418] text-neutral-200">
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <button
              onClick={() => handleStepItem(1)}
              className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition mr-0.5"
              title="Next MIDI File / Pattern"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {activeSourceType === 'scanned' && currentScannedFileIdx >= 0 && scannedFiles[currentScannedFileIdx] && (() => {
              const activeItem = scannedFiles[currentScannedFileIdx];
              const activeKey = getLibraryFileKey(activeItem);
              const isFav = !!libraryMeta[activeKey]?.favorite;
              return (
                <button
                  onClick={() => handleToggleFavorite(activeKey)}
                  className={`p-1 rounded transition mr-0.5 ${
                    isFav ? 'text-amber-400 bg-amber-500/15' : 'text-neutral-500 hover:text-amber-300'
                  }`}
                  title={isFav ? 'Remove from Favourites' : 'Bookmark / Favourite active MIDI file'}
                >
                  <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                </button>
              );
            })()}

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

            <button
              onClick={handleScanFolderClick}
              disabled={isScanning}
              className="hardware-button flex items-center justify-center p-1 text-amber-400 hover:text-amber-200 rounded transition shrink-0"
              title="Add more folders to library (+)"
            >
              <Plus className="w-3.5 h-3.5" />
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
              if (isJuceNative()) {
                emitToJuce('nativeOpenFile', {});
                return;
              }
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

          {/* Dedicated Drag MIDI to DAW Hardware Grip Handle */}
          <button
            type="button"
            onClick={() => {
              if (wasMidiDraggedRef.current) {
                wasMidiDraggedRef.current = false;
                return;
              }
              setNotificationBanner(
                isJuceNative()
                  ? 'Click, hold, and drag "DRAG MIDI TO DAW" directly onto any DAW track to drop the .mid clip.'
                  : 'Grab and drag onto your desktop/DAW, or use EXPORT MIDI to download a .mid file.'
              );
              window.setTimeout(() => setNotificationBanner(null), 4000);
            }}
            onMouseDown={(e) => {
              if (!isJuceNative() || e.button !== 0) return;
              e.preventDefault();
              wasMidiDraggedRef.current = false;

              const startX = e.clientX;
              const startY = e.clientY;
              let dragged = false;

              const exportSeq: MidiSequence = params.arpEnabled
                ? {
                    ...sequence,
                    notes: arpeggiateNotes(sequence.notes, sequence.totalLengthPpq, {
                      mode: params.arpMode,
                      rate: params.arpRate,
                      octaves: params.arpOctaves,
                      gate: params.arpGate,
                    }),
                  }
                : sequence;

              const midiBytes = serializeMidiFile(
                exportSeq,
                params.transpose,
                params.velocityScale,
                params.velocityOffset,
                sequence.bpm * params.speedMultiplier
              );
              const safeName = `${sequence.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'MidiLens_Clip'}.mid`;
              const base64Payload = uint8ArrayToBase64(midiBytes);

              const triggerNativeDrag = () => {
                if (dragged) return;
                dragged = true;
                wasMidiDraggedRef.current = true;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                btnEl.removeEventListener('mouseleave', onLeave);
                emitToJuce('nativeDragMidiToDaw', {
                  filename: safeName,
                  base64: base64Payload,
                });
              };

              const btnEl = e.currentTarget;

              const onMove = (mv: MouseEvent) => {
                if (!dragged && Math.hypot(mv.clientX - startX, mv.clientY - startY) >= 2) {
                  triggerNativeDrag();
                }
              };

              const onLeave = (lv: MouseEvent) => {
                if (!dragged && (lv.buttons & 1) === 1) {
                  triggerNativeDrag();
                }
              };

              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                btnEl.removeEventListener('mouseleave', onLeave);
              };

              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
              btnEl.addEventListener('mouseleave', onLeave);
            }}
            draggable={!isJuceNative()}
            onDragStart={(e) => {
              const exportSeq: MidiSequence = params.arpEnabled
                ? {
                    ...sequence,
                    notes: arpeggiateNotes(sequence.notes, sequence.totalLengthPpq, {
                      mode: params.arpMode,
                      rate: params.arpRate,
                      octaves: params.arpOctaves,
                      gate: params.arpGate,
                    }),
                  }
                : sequence;
              const midiBytes = serializeMidiFile(
                exportSeq,
                params.transpose,
                params.velocityScale,
                params.velocityOffset,
                sequence.bpm * params.speedMultiplier
              );
              const safeName = `${sequence.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'MidiLens_Clip'}.mid`;
              const blob = new Blob([midiBytes.buffer as ArrayBuffer], { type: 'audio/midi' });
              const blobUrl = URL.createObjectURL(blob);
              e.dataTransfer.setData('text/plain', safeName);
              e.dataTransfer.setData('DownloadURL', `audio/midi:${safeName}:${blobUrl}`);
              window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
            }}
            title="Click, hold & drag directly onto a Logic Pro / Ableton / FL Studio MIDI track"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-black font-extrabold text-[10.5px] font-mono tracking-wider uppercase rounded shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-0.5 border border-emerald-300/50 cursor-grab active:cursor-grabbing transition whitespace-nowrap"
          >
            <GripVertical className="w-3.5 h-3.5 text-black shrink-0" />
            <span>DRAG MIDI TO DAW</span>
          </button>

          {/* Heavy Tactile Industrial Export MIDI Button */}
          <button
            onClick={() => setShowExportModal(true)}
            title="Export processed MIDI file (Type 0 / Type 1 .mid)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-[#f59e0b] via-[#d97706] to-[#b45309] text-black font-extrabold text-[10.5px] font-mono tracking-wider uppercase rounded shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-0.5 border border-amber-300/40 cursor-pointer transition whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span>EXPORT MIDI</span>
          </button>
        </div>
      </div>

      {/* Top Interactive Notification / Scan Alert Banner */}
      {notificationBanner && (
        <div className="shrink-0 bg-amber-500/15 border-b border-amber-500/30 px-5 py-2 flex items-center justify-between text-xs font-mono text-amber-300 transition animate-in fade-in">
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
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 px-4 py-1.5 bg-[#15171a] border-b border-black/80 shadow-[0_1px_0_rgba(255,255,255,0.06)] overflow-x-auto no-scrollbar">
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

            <button
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  syncMode: p.syncMode === 'daw' ? 'audition' : 'daw',
                }))
              }
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition active:translate-y-0.5 ${
                params.syncMode === 'daw'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/70 shadow-[0_0_8px_rgba(16,185,129,0.35)]'
                  : 'hardware-button text-neutral-400 hover:text-neutral-200'
              }`}
              title={
                params.syncMode === 'daw'
                  ? 'Sync Play ON: Pressing Play/Stop in the DAW automatically starts/stops MidiLens'
                  : 'Sync Play OFF (Free Audition): MidiLens plays independently from DAW transport'
              }
            >
              <Radio className={`w-3 h-3 ${params.syncMode === 'daw' ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
              <span>SYNC PLAY</span>
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
              title={`Quantise note timing to grid (${params.quantizeStrength ?? 100}% strength — adjust in Transform panel)`}
            >
              Q-Time{(params.quantizeStrength ?? 100) < 100 ? ` ${params.quantizeStrength}%` : ''}
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" title="Detected original MIDI key">
            <span className="silkscreen-label text-neutral-500">ORIG:</span>
            <span className="text-xs font-bold text-emerald-400 font-mono phosphor-glow-green">{keyResult.keyName}</span>
          </div>
        </div>
      </div>

      {/* Channel Strip 4: Musical Scale Matrix & PROMINENT MODULE SWITCHES */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 px-4 py-2 bg-[#181a1d] border-b-2 border-black/90 shadow-[0_1px_0_rgba(255,255,255,0.06)] overflow-x-auto no-scrollbar">
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

          {/* DAW Project Key & BPM (Auto-reads MIDI Key Signature meta-event if sent by host; editable because AU hosts like Logic Pro only broadcast BPM/Meter, not global Project Key) */}
          <div
            className="flex items-center gap-1.5 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
            title={
              dawKeyDetected
                ? 'Project Key received from host DAW MIDI Key Signature meta-event'
                : 'Audio Units (Logic Pro) share live BPM & Meter with plugins, not global Project Key. Select your DAW Project Key here (auto-updates if host sends a Key Signature meta-event).'
            }
          >
            <span className="silkscreen-label text-neutral-500">PROJECT:</span>
            <select
              value={params.projectKeyRoot}
              onChange={(e) => {
                setDawKeyDetected(false);
                setParams((p) => ({ ...p, projectKeyRoot: Number(e.target.value) }));
              }}
              className="bg-transparent text-xs font-mono font-bold text-emerald-400 focus:outline-none cursor-pointer"
              title="Set DAW Project Root Key"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i} className="bg-[#121418] text-neutral-200">
                  {getNoteName(i)}
                </option>
              ))}
            </select>
            <select
              value={params.projectScaleType}
              onChange={(e) => {
                setDawKeyDetected(false);
                setParams((p) => ({ ...p, projectScaleType: e.target.value as ScaleType }));
              }}
              className="bg-transparent text-[11px] font-mono font-bold text-emerald-400 focus:outline-none cursor-pointer"
              title="Set DAW Project Scale"
            >
              <option value="major" className="bg-[#121418] text-neutral-200">maj</option>
              <option value="minor" className="bg-[#121418] text-neutral-200">min</option>
              <option value="dorian" className="bg-[#121418] text-neutral-200">dor</option>
              <option value="phrygian" className="bg-[#121418] text-neutral-200">phr</option>
              <option value="harmonic_minor" className="bg-[#121418] text-neutral-200">harm</option>
            </select>
            {dawKeyDetected && (
              <span className="text-[8px] font-mono font-bold uppercase px-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                HOST
              </span>
            )}
            {dawHostBpm !== null && (
              <span className="text-xs font-mono font-bold text-emerald-400/90 tracking-wide">
                · {dawHostBpm} BPM
              </span>
            )}
            <button
              onClick={syncToProjectKey}
              className="hardware-button px-2 py-0.5 text-[9.5px] font-mono font-bold text-emerald-400 rounded transition uppercase"
              title="Sync active key/transpose, BPM, and meter to Project Key & host DAW"
            >
              Sync
            </button>
          </div>

          {/* Target Key Box (Selectable Root & Scale + Match button) */}
          <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <span className="silkscreen-label text-neutral-500">TARGET:</span>
            <select
              value={params.targetKeyRoot}
              onChange={(e) => setParams((p) => ({ ...p, targetKeyRoot: Number(e.target.value) }))}
              className="bg-transparent text-xs font-mono font-bold text-sky-400 focus:outline-none cursor-pointer"
              title="Target Root Key"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i} className="bg-[#121418] text-neutral-200">
                  {getNoteName(i)}
                </option>
              ))}
            </select>
            <select
              value={params.targetScaleType}
              onChange={(e) => setParams((p) => ({ ...p, targetScaleType: e.target.value as ScaleType }))}
              className="bg-transparent text-[11px] font-mono font-bold text-sky-400 focus:outline-none cursor-pointer"
              title="Target Scale Type"
            >
              <option value="major" className="bg-[#121418] text-neutral-200">Maj</option>
              <option value="minor" className="bg-[#121418] text-neutral-200">Min</option>
              <option value="dorian" className="bg-[#121418] text-neutral-200">Dor</option>
              <option value="phrygian" className="bg-[#121418] text-neutral-200">Phr</option>
              <option value="harmonic_minor" className="bg-[#121418] text-neutral-200">Harm</option>
            </select>
            <button
              onClick={applyTargetKeyMatch}
              className="hardware-button px-2 py-0.5 text-[9.5px] font-mono font-bold text-sky-400 rounded transition uppercase"
              title="Transpose playback and set scale to match target key"
            >
              Match
            </button>
          </div>
        </div>

        {/* Right: PROMINENT MODULE TOGGLE SWITCHES - HIGH VISIBILITY */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mechanical Rocker Switch: Transform / Groove / Voicings */}
          <button
            onClick={() => setShowTransformPanel(!showTransformPanel)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold rounded transition border ${
              showTransformPanel
                ? 'bg-sky-900/60 text-sky-200 border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                : 'hardware-button text-sky-300'
            }`}
            title="Toggle Transform Rack (Quantise Strength, Swing, Legato, Strum, Stretch, Voicings, Reverse, Mirror, Layer Extract)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-300" />
            <span className="uppercase text-[10.5px] tracking-wider">TRANSFORM</span>
          </button>

          {/* Mechanical Rocker Switch: Rule-Based Generator */}
          <button
            onClick={() => setShowGeneratorPanel(!showGeneratorPanel)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold rounded transition border ${
              showGeneratorPanel
                ? 'bg-emerald-900/60 text-emerald-200 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : 'hardware-button text-emerald-300'
            }`}
            title="Toggle Rule-Based MIDI Generator (Melody, Riff, Bass Line, Chords)"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span className="uppercase text-[10.5px] tracking-wider">GENERATE</span>
          </button>

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

          {/* Mechanical Rocker Switch: ARP MODULE */}
          <button
            onClick={() => setShowArpPanel(!showArpPanel)}
            className={`flex items-center gap-2 px-3 py-1 text-xs font-mono font-bold rounded transition border shadow-md ${
              showArpPanel || params.arpEnabled
                ? 'bg-gradient-to-b from-amber-500 to-amber-700 text-black font-extrabold border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                : 'bg-[#121418] text-amber-400 border-amber-500/50 hover:border-amber-400 hover:bg-neutral-900'
            }`}
            title="Click to toggle Arp control panel"
          >
            <Zap className={`w-3.5 h-3.5 ${showArpPanel || params.arpEnabled ? 'text-black fill-current animate-pulse' : 'text-amber-400'}`} />
            <span className="uppercase text-[10.5px] tracking-widest font-black">
              ARP
            </span>
          </button>
        </div>
      </div>

      {/* MIDI Transform Rack Panel (Groove, Quantise Strength, Swing, Legato/Staccato, Strum, Destructive Speed, Chords & Patterns) */}
      {showTransformPanel && (
        <div className="shrink-0 bg-[#12151a] py-2 px-4 border-b-2 border-black/90 shadow-inner space-y-1.5 text-xs font-mono">
          {/* Row 1: Rhythm, Timing & Groove */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 mr-1">
                <span className="silkscreen-label text-sky-400 font-bold">TRANSFORM:</span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300">
                  {selectedNoteIds.size > 0 ? `${selectedNoteIds.size} Sel` : `All (${sequence.notes.length})`}
                </span>
              </div>

              {/* Quantise Strength (%) */}
              <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                <span className="text-neutral-400 text-[10px]">Q-Str:</span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={params.quantizeStrength ?? 100}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, quantizeStrength: Number(e.target.value) }))
                  }
                  className="w-16 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-amber-500"
                  title="Quantise pull strength (50% = loose tighten, 100% = hard snap)"
                />
                <span className="text-amber-400 font-bold text-[10px] w-8 text-right">
                  {params.quantizeStrength ?? 100}%
                </span>
                <button
                  type="button"
                  onClick={applyTimingQuantize}
                  className="hardware-button px-2 py-0.5 text-amber-300 font-bold rounded text-[9.5px] uppercase"
                  title={`Quantise to ${params.quantizeGrid} grid at ${params.quantizeStrength ?? 100}% strength`}
                >
                  Quantise
                </button>
              </div>

              {/* Swing / Shuffle (%) */}
              <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                <span className="text-neutral-400 text-[10px]">Swing:</span>
                <div className="flex gap-0.5">
                  {(['1/8', '1/16'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSwingGrid(g)}
                      className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                        swingGrid === g ? 'bg-sky-500 text-black' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={swingPercent}
                  onChange={(e) => setSwingPercent(Number(e.target.value))}
                  className="w-16 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-sky-400"
                />
                <span className="text-sky-300 font-bold text-[10px] w-7 text-right">{swingPercent}%</span>
                <button
                  type="button"
                  onClick={applySwing}
                  className="hardware-button px-2 py-0.5 text-sky-300 font-bold rounded text-[9.5px] uppercase"
                  title="Push off-beat 8ths or 16ths for swing/shuffle groove"
                >
                  Apply
                </button>
              </div>

              {/* Legato / Overlap Fix & Staccato */}
              <div className="flex items-center gap-1 bg-[#0c0e10] px-2 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                <button
                  type="button"
                  onClick={applyLegato}
                  className="hardware-button px-2 py-0.5 text-emerald-300 font-bold rounded text-[9.5px] uppercase"
                  title="Extend or trim notes cleanly to touch next onset (removes gaps and overlaps)"
                >
                  Legato / Fix
                </button>
                <button
                  type="button"
                  onClick={applyStaccato}
                  className="hardware-button px-2 py-0.5 text-neutral-300 font-bold rounded text-[9.5px] uppercase"
                  title="Shorten note durations by 50%"
                >
                  Staccato 50%
                </button>
              </div>

              {/* Strum / Flam */}
              <div className="flex items-center gap-1.5 bg-[#0c0e10] px-2 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                <span className="text-neutral-400 text-[10px]">Strum:</span>
                <input
                  type="range"
                  min={5}
                  max={80}
                  step={5}
                  value={strumMs}
                  onChange={(e) => setStrumMs(Number(e.target.value))}
                  className="w-14 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-emerald-400"
                />
                <span className="text-emerald-300 font-bold text-[10px] w-8">{strumMs}ms</span>
                <button
                  type="button"
                  onClick={() => applyStrum('up')}
                  className="hardware-button px-1.5 py-0.5 text-emerald-300 font-bold rounded text-[9.5px]"
                  title="Strum chords low-to-high (Up-Strum)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => applyStrum('down')}
                  className="hardware-button px-1.5 py-0.5 text-emerald-300 font-bold rounded text-[9.5px]"
                  title="Strum chords high-to-low (Down-Strum)"
                >
                  ↓
                </button>
              </div>

              {/* Destructive Half/Double Speed Resize */}
              <div className="flex items-center gap-1 bg-[#0c0e10] px-2 py-1 rounded border border-amber-700/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                <span className="text-amber-400/90 text-[9.5px] font-bold">GRID RESIZE:</span>
                <button
                  type="button"
                  onClick={() => applyDestructiveSpeed(0.5)}
                  className="hardware-button px-2 py-0.5 text-amber-300 font-bold rounded text-[9.5px]"
                  title="Destructively compress notes 0.5× (Double-Time) so dragging to Logic Pro drops double-time notes onto the grid"
                >
                  0.5× (2× Spd)
                </button>
                <button
                  type="button"
                  onClick={() => applyDestructiveSpeed(2.0)}
                  className="hardware-button px-2 py-0.5 text-amber-300 font-bold rounded text-[9.5px]"
                  title="Destructively stretch notes 2× (Half-Time) so dragging to Logic Pro drops half-time notes onto the grid"
                >
                  2× (0.5× Spd)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTransformPanel(false)}
              className="text-neutral-400 hover:text-white p-1 rounded transition"
              title="Close Transform panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: Pitch, Chords, Patterns & Layer Extraction */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Chord Voicing Tools */}
            <div className="flex items-center gap-1 bg-[#0c0e10] px-2 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
              <span className="text-neutral-400 text-[10px] mr-0.5">CHORDS:</span>
              <button
                type="button"
                onClick={() => applyChordInvert('up')}
                className="hardware-button px-2 py-0.5 text-amber-300 font-bold rounded text-[9.5px]"
                title="Invert chord(s) up (lowest voice +1 octave)"
              >
                Inv ↑
              </button>
              <button
                type="button"
                onClick={() => applyChordInvert('down')}
                className="hardware-button px-2 py-0.5 text-amber-300 font-bold rounded text-[9.5px]"
                title="Invert chord(s) down (highest voice -1 octave)"
              >
                Inv ↓
              </button>
              <button
                type="button"
                onClick={applyDrop2}
                className="hardware-button px-2 py-0.5 text-purple-300 font-bold rounded text-[9.5px]"
                title="Drop-2 voicing (drops 2nd highest chord tone by 1 octave)"
              >
                Drop-2
              </button>
              <button
                type="button"
                onClick={applyOpenVoice}
                className="hardware-button px-2 py-0.5 text-purple-300 font-bold rounded text-[9.5px]"
                title="Toggle between Open (wide spread) and Close voicing"
              >
                Open / Close
              </button>
            </div>

            {/* Pattern Flip & Shift */}
            <div className="flex items-center gap-1 bg-[#0c0e10] px-2 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
              <span className="text-neutral-400 text-[10px] mr-0.5">PATTERN:</span>
              <button
                type="button"
                onClick={applyReversePattern}
                className="hardware-button px-2 py-0.5 text-sky-300 font-bold rounded text-[9.5px]"
                title="Reverse pattern horizontally (Retrograde)"
              >
                Reverse ↔
              </button>
              <button
                type="button"
                onClick={applyMirrorPattern}
                className="hardware-button px-2 py-0.5 text-sky-300 font-bold rounded text-[9.5px]"
                title="Mirror pitches vertically around center pitch (respects Scale Lock)"
              >
                Mirror ↕
              </button>
              <button
                type="button"
                onClick={() => applyRotatePattern(-0.25)}
                className="hardware-button px-2 py-0.5 text-neutral-200 font-bold rounded text-[9.5px]"
                title="Rotate pattern left by 1/16 note"
              >
                ◀ Shift 1/16
              </button>
              <button
                type="button"
                onClick={() => applyRotatePattern(0.25)}
                className="hardware-button px-2 py-0.5 text-neutral-200 font-bold rounded text-[9.5px]"
                title="Rotate pattern right by 1/16 note"
              >
                Shift 1/16 ▶
              </button>
            </div>

            {/* Layer Extraction */}
            <div className="flex items-center gap-1 bg-[#0c0e10] px-2 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
              <span className="text-neutral-400 text-[10px] mr-0.5">EXTRACT:</span>
              <button
                type="button"
                onClick={() => applyExtractLayer('bass')}
                className="hardware-button px-2 py-0.5 text-emerald-300 font-bold rounded text-[9.5px]"
                title="Keep only the lowest note at each chord/step to isolate a Bass-Root layer"
              >
                Bass-Root Only
              </button>
              <button
                type="button"
                onClick={() => applyExtractLayer('topline')}
                className="hardware-button px-2 py-0.5 text-amber-300 font-bold rounded text-[9.5px]"
                title="Keep only the highest note at each chord/step to isolate a Topline melody"
              >
                Topline Only
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rule-Based MIDI Generator Rack Panel (Selectable: Melody, Riff, Bass Line, Chords) */}
      {showGeneratorPanel && (
        <div className="shrink-0 bg-[#121518] py-2 px-4 border-b-2 border-black/90 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            {/* Left: Pattern Type Selector */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="silkscreen-label text-emerald-400 font-bold">GENERATOR:</span>
              <div className="flex items-center gap-1 bg-[#0c0e10] p-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)]">
                {(
                  [
                    { id: 'melody', label: 'Melody', hint: 'Conjunct contour, chord-tone anchors & cadential resolution' },
                    { id: 'riff', label: 'Riff', hint: 'Syncopated ostinato hook & bar-4 turnaround' },
                    { id: 'bass', label: 'Bass Line', hint: 'Root/5th lock, octave bounce & diatonic approach fills' },
                    { id: 'chords', label: 'Chords', hint: 'Diatonic progressions with smooth voice-leading' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGeneratorType(item.id)}
                    title={item.hint}
                    className={`px-2.5 py-1 rounded text-[10.5px] font-bold uppercase tracking-wider transition ${
                      generatorType === item.id
                        ? 'bg-emerald-500 text-black font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.65)]'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Bar Length Selector */}
              <div className="flex items-center gap-1 bg-[#0c0e10] px-2 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)]">
                <span className="silkscreen-label text-neutral-500 mr-1">LEN:</span>
                {([2, 4, 8] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setGeneratorBars(b)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                      generatorBars === b
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {b}B
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Locked Notes Badge + Active Key Source Readout + Generate Action */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {sequence.notes.some((n) => n.locked) && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded border border-sky-500/60 bg-sky-950/50 text-sky-300 font-bold text-[10.5px]"
                  title="Locked notes (cyan padlock on Piano Roll) are preserved when generating new patterns. Right-click notes to Lock/Unlock."
                >
                  <Lock className="w-3 h-3 text-sky-400" />
                  <span>{sequence.notes.filter((n) => n.locked).length} Locked</span>
                </div>
              )}

              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border bg-[#0c0e10] shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] ${
                  isConnectedToDaw ? 'border-emerald-600/60' : 'border-amber-600/50'
                }`}
                title={
                  dawKeyDetected
                    ? 'Project Key received from host MIDI Key Signature meta-event'
                    : isConnectedToDaw
                    ? 'Using Project Key set in the PROJECT strip (AU hosts like Logic Pro do not broadcast global Key Signature)'
                    : 'Using active App Key (SCALE selector)'
                }
              >
                <span className="silkscreen-label text-neutral-500">
                  {dawKeyDetected ? 'DAW PROJECT KEY:' : isConnectedToDaw ? 'PROJECT KEY:' : 'APP KEY:'}
                </span>
                <span
                  className={`font-bold text-[11px] ${
                    isConnectedToDaw ? 'text-emerald-400 phosphor-glow-green' : 'text-amber-400 phosphor-glow-amber'
                  }`}
                >
                  {getNoteName(effectiveGenRoot)}{' '}
                  {SCALE_DEFINITIONS[effectiveGenScale]?.name || effectiveGenScale}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleGeneratePattern()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-black font-extrabold rounded border border-emerald-200/60 shadow-[0_0_12px_rgba(16,185,129,0.45)] active:translate-y-0.5 transition uppercase text-[10.5px] tracking-wider"
                title={`Generate new ${generatorType} strictly in ${getNoteName(effectiveGenRoot)} ${SCALE_DEFINITIONS[effectiveGenScale]?.name || effectiveGenScale}`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  Generate{' '}
                  {generatorType === 'bass'
                    ? 'Bass Line'
                    : generatorType.charAt(0).toUpperCase() + generatorType.slice(1)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowGeneratorPanel(false)}
                className="text-neutral-400 hover:text-white p-1 rounded transition"
                title="Close Generator panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Humanise & Dynamics Rack Panel (Collapsible, never squashed) */}
      {showHumanizeModal && (
        <div className="shrink-0 bg-[#14161a] py-2 px-4 border-b-2 border-black/90 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="silkscreen-label text-purple-300 font-bold">
                  HUMANISE:
                </span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300">
                  {selectedNoteIds.size > 0 ? `${selectedNoteIds.size} Selected` : `All (${sequence.notes.length})`}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                <span className="text-neutral-400">Vel Jitter:</span>
                <span className="text-amber-400 font-bold min-w-[28px]">&plusmn;{humanizeVelRange}</span>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={humanizeVelRange}
                  onChange={(e) => setHumanizeVelRange(Number(e.target.value))}
                  className="w-24 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-amber-500 shrink-0"
                />
                <button
                  onClick={applyHumanizeVelocity}
                  className="px-2.5 py-1 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded transition uppercase text-[10px] shadow border border-amber-300/50"
                  title="Apply random ±Jitter velocity humanisation"
                >
                  Humanise Vel
                </button>
              </div>

              <div className="flex items-center gap-2 bg-[#0c0e10] px-2.5 py-1 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                <span className="text-neutral-400">Random:</span>
                <input
                  type="number"
                  min={1}
                  max={127}
                  value={randomMinVel}
                  onChange={(e) => setRandomMinVel(Number(e.target.value))}
                  className="w-11 px-1 py-0.5 bg-[#14161a] border border-neutral-700 rounded text-center text-neutral-200"
                />
                <span className="text-neutral-500">to</span>
                <input
                  type="number"
                  min={1}
                  max={127}
                  value={randomMaxVel}
                  onChange={(e) => setRandomMaxVel(Number(e.target.value))}
                  className="w-11 px-1 py-0.5 bg-[#14161a] border border-neutral-700 rounded text-center text-neutral-200"
                />
                <button
                  onClick={applyRandomizeVelocityRange}
                  className="hardware-button px-2.5 py-1 text-purple-300 font-bold rounded transition uppercase text-[10px]"
                >
                  Randomise
                </button>
              </div>

              <button
                onClick={applyHumanizeTiming}
                className="hardware-button px-2.5 py-1 text-emerald-300 font-bold rounded transition uppercase text-[10px]"
                title="Apply subtle ±12ms micro-timing drift"
              >
                Humanise Timing
              </button>
            </div>

            <button
              onClick={() => setShowHumanizeModal(false)}
              className="text-neutral-400 hover:text-white p-1 rounded transition"
              title="Close Humanise panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Main Piano Roll Canvas Container - Flexibly adapts without squashing Rack Bays */}
      <div className="flex-1 flex flex-col w-full min-h-[240px] overflow-hidden p-2 bg-[#0a0c0e] border-b-2 border-black/80 shadow-[inset_0_4px_12px_rgba(0,0,0,0.95)]">
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
          loopStartPpq={params.loopStartPpq ?? 0}
          loopEndPpq={params.loopEndPpq ?? null}
          onSnapshotBeforeChange={(description) => pushHistorySnapshot(description)}
          onNotesChange={(newNotes) => {
            setSequence((s) => ({ ...s, notes: newNotes }));
          }}
          onSeek={handleSeek}
          onLengthChange={(newLength) => {
            pushHistorySnapshot('Change Length');
            setSequence((s) => ({ ...s, totalLengthPpq: newLength }));
            setParams((p) => {
              const curStart = p.loopStartPpq ?? 0;
              const curEnd = p.loopEndPpq ?? null;
              if (curStart >= newLength - 0.5 || (curEnd !== null && curEnd > newLength)) {
                return {
                  ...p,
                  loopStartPpq: curStart >= newLength - 0.5 ? 0 : curStart,
                  loopEndPpq: curEnd !== null && curEnd > newLength ? null : curEnd,
                };
              }
              return p;
            });
          }}
          onLoopRangeChange={(start, end) => {
            setParams((p) => ({ ...p, loopStartPpq: start, loopEndPpq: end }));
          }}
          selectedNoteIds={selectedNoteIds}
          onSelectedNotesChange={(ids) => setSelectedNoteIds(ids)}
        />
      </div>

      {/* 2. Velocity Heatmap, Transpose, Diatonic Harmonise & Speed Controls Strip - Below Piano Roll */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#16181b] border-t border-b border-black/80 shadow-[0_2px_6px_rgba(0,0,0,0.7)] text-xs font-mono overflow-x-auto no-scrollbar">
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
              className="w-20 min-w-[80px] h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-amber-500 shrink-0"
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

      {/* 3. Arpeggiator Control Module Rack Bay (Renders at full un-squashed size) */}
      {showArpPanel && (
        <div className="shrink-0 bg-[#121417] py-2 border-t-2 border-b-2 border-black/90 shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)]">
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
      )}

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
      <LibraryModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        scannedFiles={scannedFiles}
        savedFolderPaths={savedFolderPaths}
        libraryMeta={libraryMeta}
        projectKeyRoot={params.projectKeyRoot}
        projectBpm={sequence.bpm}
        onToggleFavorite={handleToggleFavorite}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        onSelectFile={(scannedItem, originalIndex) => {
          setCurrentScannedFileIdx(originalIndex);
          setActiveSourceType('scanned');
          pushHistorySnapshot(`Load ${scannedItem.name}`);
          setShowFolderModal(false);
          loadScannedItem(scannedItem, originalIndex);
        }}
        activeFileIndex={activeSourceType === 'scanned' ? currentScannedFileIdx : -1}
        onScanFolderClick={handleScanFolderClick}
        onRescanFolders={isJuceNative() ? handleRescanSavedFolders : undefined}
        onClearLibrary={() => {
          setScannedFiles([]);
          setSavedFolderPaths([]);
          setCurrentScannedFileIdx(-1);
          if (activeSourceType === 'scanned') setActiveSourceType('preset');
          if (isJuceNative()) emitToJuce('clearScannedLibrary', {});
        }}
        isScanning={isScanning || isRescanning}
      />
    </div>
  );
};
