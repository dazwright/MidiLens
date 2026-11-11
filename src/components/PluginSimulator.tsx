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
  });

  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<number>>(new Set());

  const [keyResult, setKeyResult] = useState<KeyResult>(() => analyzeKeyFromNotes(PRESET_SEQUENCES[0].notes));
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Folder scanning state
  const [scannedFiles, setScannedFiles] = useState<ScannedMidiFile[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
  }, []);

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
  }, []);

  // Recalculate Key Detection whenever sequence notes change
  useEffect(() => {
    const res = analyzeKeyFromNotes(sequence.notes);
    setKeyResult(res);
  }, [sequence.notes]);

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

  // MIDI Pattern Selection Navigation
  const currentSequenceIdx = PRESET_SEQUENCES.findIndex((s) => s.name === sequence.name);

  const handleSelectSequence = (idx: number) => {
    pushHistorySnapshot(`Load Groove (${PRESET_SEQUENCES[idx]?.name || 'Preset'})`);
    const safeIdx = (idx + PRESET_SEQUENCES.length) % PRESET_SEQUENCES.length;
    synthAudioEngine.stop();
    setPlayheadPpq(0);
    setSequence(PRESET_SEQUENCES[safeIdx]);
  };

  // Single File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      pushHistorySnapshot(`Open File (${file.name})`);
      loadMidiFromFile(file);
    }
  };

  // Folder Scanning
  const handleFolderScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const discovered: ScannedMidiFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
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

    setScannedFiles(discovered);
    setShowFolderModal(true);
  };

  const loadMidiFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsed = parseMidiFile(buffer, file.name);
        synthAudioEngine.stop();
        setPlayheadPpq(0);
        setSequence(parsed);
      } catch (err) {
        alert('Could not parse MIDI file: ' + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Drag and Drop from OS
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.mid') || file.name.endsWith('.midi'))) {
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

      {/* Scaler 3 / Riffer Style Modern Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[#1b1e2a] border-b border-slate-800/80">
        {/* Left: Brand Pill, Preset Manager Drawer, MIDI Pattern Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-sky-500/20 to-blue-600/20 border border-sky-500/30 rounded-full">
            <img src="/icon.svg" alt="MidiLens Icon" className="w-4 h-4 rounded-full shadow-sm" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300">
              MIDILENS
            </span>
          </div>

          {/* MidiLens Settings Preset Manager Button */}
          <button
            onClick={() => setShowPresetDrawer(true)}
            className="flex items-center gap-2 bg-[#232736] hover:bg-slate-700/80 border border-sky-500/30 rounded-xl px-3 py-1.5 text-sky-300 font-mono font-bold text-xs shadow-sm transition group"
            title="Open Preset Manager to load/save scale, quantization & humanize settings"
          >
            <Bookmark className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="truncate max-w-[160px]">Preset: {activeLensPreset.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* MIDI Groove Sequence Navigator Bar */}
          <div className="flex items-center bg-[#232736] border border-slate-700/60 rounded-xl p-0.5 shadow-sm">
            <button
              onClick={() => handleSelectSequence(currentSequenceIdx - 1)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
              title="Previous Groove Pattern"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              className="text-xs bg-transparent text-slate-200 font-semibold cursor-pointer px-2.5 py-1 focus:outline-none max-w-[180px] truncate"
              onChange={(e) => handleSelectSequence(Number(e.target.value))}
              value={currentSequenceIdx >= 0 ? currentSequenceIdx : 0}
            >
              {PRESET_SEQUENCES.map((p, idx) => (
                <option key={p.name} value={idx} className="bg-[#1b1e2a] text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleSelectSequence(currentSequenceIdx + 1)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
              title="Next Groove Pattern"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons: Scan Folder & Open File */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => folderInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs bg-[#232736] hover:bg-slate-700/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-amber-300 font-medium transition shadow-sm"
              title="Scan a folder and all its subfolders on your hard drive for .mid files"
            >
              <FolderSearch className="w-3.5 h-3.5 text-amber-400" />
              <span>Scan Folder</span>
            </button>
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is standard
              webkitdirectory="true"
              directory="true"
              multiple
              className="hidden"
              onChange={handleFolderScan}
            />

            {scannedFiles.length > 0 && (
              <button
                onClick={() => setShowFolderModal(true)}
                className="flex items-center gap-1.5 text-xs bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-1.5 text-amber-300 font-mono transition"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Library ({scannedFiles.length})</span>
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs bg-[#232736] hover:bg-slate-700/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-slate-300 font-medium transition shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Open</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mid,.midi"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Right: Drag-Out to DAW Handle (Sleek Amber Region Exporter) */}
        <div className="flex items-center gap-3">
          <button
            onClick={exportMidiFile}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', sequence.name);
            }}
            title="Drag or click to export modified MIDI into your DAW track or filesystem"
            className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-grab active:cursor-grabbing transition"
          >
            <Download className="w-4 h-4 text-slate-950 group-hover:-translate-y-0.5 transition-transform" />
            <span>DRAG TO DAW (.MID)</span>
          </button>
        </div>
      </div>

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
              <span className="text-[9px] uppercase text-slate-500 tracking-wider">TEMPO</span>
              <span className="font-bold text-amber-400">
                {Math.round(sequence.bpm * params.speedMultiplier)} BPM
              </span>
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
          <div className="flex items-center gap-1.5 bg-[#202433] px-3 py-1.5 rounded-xl border border-slate-700/60">
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
        </div>

        {/* Right: Scale, Sync to project key, Target key & Humanize */}
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

          {/* Detected Key Badge */}
          <div className="flex items-center gap-1.5 bg-[#202433] px-2.5 py-1.5 rounded-xl border border-slate-700/60" title="Detected original MIDI key">
            <span className="text-[10px] font-mono text-slate-400">Orig:</span>
            <span className="text-xs font-bold text-sky-300 font-mono">{keyResult.keyName}</span>
          </div>

          {/* Humanize Button */}
          <button
            onClick={() => setShowHumanizeModal(!showHumanizeModal)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-gradient-to-r from-purple-900/50 to-indigo-900/50 hover:from-purple-800/60 hover:to-indigo-800/60 text-purple-200 border border-purple-500/30 rounded-xl transition shadow-sm"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-300" />
            <span>Humanise</span>
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

      {/* Main Piano Roll Canvas Container */}
      <div className="flex-1 w-full min-h-[400px] p-2 bg-[#141722]">
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
          onSelectedNotesChange={(ids) => setSelectedNoteIds(ids)}
        />
      </div>

      {/* Bottom Footer / Controls Bar (Scaler 3 style bottom strip) */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-[#1b1e2a] border-t border-slate-800/80 text-xs font-mono">
        {/* Velocity Color Heatmap Legend */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
            Velocity Heatmap:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-[10px]">Soft (0)</span>
            <div className="w-36 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-500 border border-slate-700 shadow-sm" />
            <span className="text-rose-400 font-bold text-[10px]">Loud (127)</span>
          </div>
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

      {/* Scanned Folder Library Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl bg-[#1b1e2a] border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#141722] border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FolderSearch className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white font-mono">
                  SCANNED MIDI LIBRARY ({scannedFiles.length} files found)
                </h3>
              </div>
              <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#171a24] border-b border-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search MIDI files or subfolders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredScannedFiles.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">
                  No MIDI files matching "{searchQuery}"
                </div>
              ) : (
                filteredScannedFiles.map((f, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      pushHistorySnapshot(`Load ${f.name}`);
                      loadMidiFromFile(f.file);
                      setShowFolderModal(false);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-mono bg-[#141722]/60 hover:bg-amber-500/10 hover:border-amber-500/30 border border-slate-800/80 transition"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <FileMusic className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-200 block truncate">{f.name}</span>
                        <span className="text-[10px] text-slate-500 block truncate">{f.relativePath}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 ml-3 font-mono">
                      {(f.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
