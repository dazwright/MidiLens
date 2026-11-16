import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { MidiNote, ScaleType } from '../types';
import { isPitchInScale, snapPitchToScale, getVelocityColor } from '../scaleUtils';
import { getNoteName } from '../keyDetection';
import { detectChordsInSequence } from '../midiTransform';
import {
  ZoomIn,
  ZoomOut,
  MoveHorizontal,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  X,
  Music,
  Lock,
  Unlock,
} from 'lucide-react';
import { synthAudioEngine } from '../audioEngine';

interface ContextMenuState {
  x: number;
  y: number;
  targetPpq: number;
  targetPitch: number;
  hitNoteId?: number;
}

interface PianoRollProps {
  notes: MidiNote[];
  totalLengthPpq: number;
  playheadPpq: number;
  previewTranspose: number;
  scaleRoot: number;
  scaleType: ScaleType;
  scaleLock: boolean;
  timeSigNumerator?: number;
  timeSigDenominator?: number;
  loopStartPpq?: number;
  loopEndPpq?: number | null;
  selectedNoteIds?: Set<number>;
  onNotesChange: (notes: MidiNote[]) => void;
  onSeek: (ppq: number) => void;
  onLengthChange: (newLengthPpq: number) => void;
  onLoopRangeChange?: (startPpq: number, endPpq: number | null) => void;
  onSelectedNotesChange?: (selectedIds: Set<number>) => void;
  onSnapshotBeforeChange?: (description: string) => void;
}

function getMaxNoteId(notes: MidiNote[]): number {
  let max = 0;
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].id > max) max = notes[i].id;
  }
  return max;
}

function getMinStartPpq(notes: MidiNote[]): number {
  if (notes.length === 0) return 0;
  let min = notes[0].startPpq;
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].startPpq < min) min = notes[i].startPpq;
  }
  return min;
}

export const PianoRoll: React.FC<PianoRollProps> = ({
  notes,
  totalLengthPpq,
  playheadPpq,
  previewTranspose,
  scaleRoot,
  scaleType,
  scaleLock,
  timeSigNumerator = 4,
  timeSigDenominator = 4,
  loopStartPpq = 0,
  loopEndPpq = null,
  selectedNoteIds: propSelectedNoteIds,
  onNotesChange,
  onSeek,
  onLengthChange,
  onLoopRangeChange,
  onSelectedNotesChange,
  onSnapshotBeforeChange,
}) => {
  const [showChordNames, setShowChordNames] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 0 });
  const [staticRenderTick, setStaticRenderTick] = useState(0);
  const [marqueeTick, setMarqueeTick] = useState(0);

  const [internalSelectedNoteIds, setInternalSelectedNoteIds] = useState<Set<number>>(new Set());
  const selectedNoteIds = propSelectedNoteIds !== undefined ? propSelectedNoteIds : internalSelectedNoteIds;

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Clipboard buffer ref for Cut / Copy / Paste
  const clipboardRef = useRef<
    {
      pitch: number;
      offsetPpq: number;
      durationPpq: number;
      velocity: number;
      channel?: number;
    }[]
  >([]);

  const updateSelectedNoteIds = useCallback(
    (newSet: Set<number>) => {
      setInternalSelectedNoteIds(newSet);
      if (onSelectedNotesChange) {
        onSelectedNotesChange(newSet);
      }
    },
    [onSelectedNotesChange]
  );
  const [dimensions, setDimensions] = useState({ width: 800, height: 440 });

  // Zoom factors
  const [zoomX, setZoomX] = useState(1.0); // 0.5x to 4.0x
  const [zoomY, setZoomY] = useState(1.0); // 0.7x to 2.5x

  // Pitch range auto-fit dynamically centered on actual notes (including transpose preview)
  let rawMinPitch = 48;
  let rawMaxPitch = 72;
  if (notes.length > 0) {
    rawMinPitch = 127;
    rawMaxPitch = 0;
    for (const n of notes) {
      const eff = Math.min(127, Math.max(0, n.pitch + previewTranspose));
      if (eff < rawMinPitch) rawMinPitch = eff;
      if (eff > rawMaxPitch) rawMaxPitch = eff;
    }
    const span = rawMaxPitch - rawMinPitch;
    if (span < 16) {
      const pad = Math.ceil((16 - span) / 2);
      rawMinPitch = Math.max(0, rawMinPitch - pad);
      rawMaxPitch = Math.min(127, rawMaxPitch + pad);
    }
  }
  const minPitch = Math.max(0, rawMinPitch - 3);
  const maxPitch = Math.min(127, rawMaxPitch + 3);

  const rulerHeight = 40;
  const pianoKeysWidth = 56;

  const effectiveLoopStart = Math.max(0, Math.min(totalLengthPpq - 0.5, loopStartPpq || 0));
  const effectiveLoopEnd =
    loopEndPpq !== null && loopEndPpq !== undefined && loopEndPpq > effectiveLoopStart + 0.49
      ? Math.min(totalLengthPpq, loopEndPpq)
      : totalLengthPpq;
  const isCustomLoopActive = effectiveLoopStart > 0.01 || effectiveLoopEnd < totalLengthPpq - 0.01;

  const detectedChords = useMemo(() => {
    if (!showChordNames) return [];
    return detectChordsInSequence(
      notes,
      totalLengthPpq,
      timeSigNumerator,
      timeSigDenominator,
      previewTranspose,
      scaleRoot
    );
  }, [showChordNames, notes, totalLengthPpq, timeSigNumerator, timeSigDenominator, previewTranspose, scaleRoot]);

  // Interaction tracking state
  const dragRef = useRef<{
    mode: 'none' | 'scrub' | 'move' | 'resize' | 'marquee' | 'dragLength' | 'dragLoopA' | 'dragLoopB';
    startX: number;
    startY: number;
    activeNoteId: number;
    initialPpq: number;
    initialPitch: number;
    initialDuration: number;
    initialLengthPpq: number;
    initialSelectedNotes: Map<number, { startPpq: number; pitch: number }>;
    initialDurations?: Map<number, number>;
    hasPushedSnapshot?: boolean;
    marquee?: { x1: number; y1: number; x2: number; y2: number };
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    activeNoteId: -1,
    initialPpq: 0,
    initialPitch: 0,
    initialDuration: 1,
    initialLengthPpq: totalLengthPpq,
    initialSelectedNotes: new Map(),
    hasPushedSnapshot: false,
  });

  // Responsive canvas resize (handles both window resize and flex container resize when ARP/Humanise panels toggle)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (containerRef.current) {
        const nextW = containerRef.current.clientWidth;
        const nextH = containerRef.current.clientHeight;
        setDimensions((prev) =>
          prev.width === nextW && prev.height === nextH ? prev : { width: nextW, height: nextH }
        );
      }
    };
    updateSize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const basePixelsPerPpq = Math.max(4, (dimensions.width - pianoKeysWidth - 60) / Math.max(4, totalLengthPpq));
  const pixelsPerPpq = basePixelsPerPpq * zoomX;

  const pitchSpan = Math.max(1, maxPitch - minPitch + 1);
  const baseNoteHeight = Math.max(4, (dimensions.height - rulerHeight) / pitchSpan);
  const noteHeight = baseNoteHeight * zoomY;

  // Coordinate transforms
  const ppqToX = useCallback((ppq: number) => pianoKeysWidth + ppq * pixelsPerPpq, [pianoKeysWidth, pixelsPerPpq]);
  const xToPpq = useCallback((x: number) => Math.max(0, (x - pianoKeysWidth) / pixelsPerPpq), [pianoKeysWidth, pixelsPerPpq]);
  const pitchToY = useCallback((pitch: number) => rulerHeight + (maxPitch - pitch) * noteHeight, [rulerHeight, maxPitch, noteHeight]);
  const yToPitch = useCallback(
    (y: number) => Math.min(maxPitch, Math.max(minPitch, maxPitch - Math.floor((y - rulerHeight) / noteHeight))),
    [rulerHeight, maxPitch, minPitch, noteHeight]
  );

  // Copy Callback
  const handleCopy = useCallback(() => {
    const targetIds =
      contextMenu?.hitNoteId !== undefined
        ? selectedNoteIds.has(contextMenu.hitNoteId)
          ? selectedNoteIds
          : new Set([contextMenu.hitNoteId])
        : selectedNoteIds;

    if (targetIds.size > 0) {
      const selectedNotes = notes.filter((n) => targetIds.has(n.id));
      const minPpq = getMinStartPpq(selectedNotes);
      clipboardRef.current = selectedNotes.map((n) => ({
        pitch: n.pitch,
        offsetPpq: n.startPpq - minPpq,
        durationPpq: n.durationPpq,
        velocity: n.velocity,
        channel: n.channel,
      }));
    }
    setContextMenu(null);
  }, [contextMenu, selectedNoteIds, notes]);

  // Cut Callback
  const handleCut = useCallback(() => {
    const targetIds =
      contextMenu?.hitNoteId !== undefined
        ? selectedNoteIds.has(contextMenu.hitNoteId)
          ? selectedNoteIds
          : new Set([contextMenu.hitNoteId])
        : selectedNoteIds;

    if (targetIds.size > 0) {
      if (onSnapshotBeforeChange) onSnapshotBeforeChange('Cut Notes');
      const selectedNotes = notes.filter((n) => targetIds.has(n.id));
      const minPpq = getMinStartPpq(selectedNotes);
      clipboardRef.current = selectedNotes.map((n) => ({
        pitch: n.pitch,
        offsetPpq: n.startPpq - minPpq,
        durationPpq: n.durationPpq,
        velocity: n.velocity,
        channel: n.channel,
      }));

      const remaining = notes.filter((n) => !targetIds.has(n.id));
      onNotesChange(remaining);
      updateSelectedNoteIds(new Set());
    }
    setContextMenu(null);
  }, [contextMenu, selectedNoteIds, notes, onNotesChange, updateSelectedNoteIds, onSnapshotBeforeChange]);

  // Paste Callback
  const handlePaste = useCallback(
    (overridePpq?: number) => {
      if (clipboardRef.current.length > 0) {
        if (onSnapshotBeforeChange) onSnapshotBeforeChange('Paste Notes');
        const pasteStartPpq = overridePpq !== undefined ? overridePpq : contextMenu ? contextMenu.targetPpq : playheadPpq;
        let maxId = getMaxNoteId(notes);
        const newNotes: MidiNote[] = [];
        const newSelectedIds = new Set<number>();

        clipboardRef.current.forEach((clip) => {
          maxId++;
          let pitch = clip.pitch;
          if (contextMenu && contextMenu.targetPitch !== undefined && clipboardRef.current.length === 1) {
            pitch = contextMenu.targetPitch;
          }
          if (scaleLock && scaleType !== 'chromatic') {
            pitch = snapPitchToScale(pitch, scaleRoot, scaleType);
          }
          pitch = Math.min(127, Math.max(0, pitch));

          const pastedNote: MidiNote = {
            id: maxId,
            pitch,
            startPpq: Math.max(0, pasteStartPpq + clip.offsetPpq),
            durationPpq: clip.durationPpq,
            velocity: clip.velocity,
            channel: clip.channel || 1,
          };
          newNotes.push(pastedNote);
          newSelectedIds.add(pastedNote.id);
        });

        onNotesChange([...notes, ...newNotes]);
        updateSelectedNoteIds(newSelectedIds);
      }
      setContextMenu(null);
    },
    [contextMenu, playheadPpq, notes, scaleLock, scaleType, scaleRoot, onNotesChange, updateSelectedNoteIds, onSnapshotBeforeChange]
  );

  // Static Layer Render (background, pitch lanes, keybed, grid, loop bounds, ruler, chords, notes)
  // Cached on an offscreen canvas so playhead movement does not re-render thousands of notes or allocate backing textures every frame
  useEffect(() => {
    if (!staticCanvasRef.current && typeof document !== 'undefined') {
      staticCanvasRef.current = document.createElement('canvas');
    }
    const staticCanvas = staticCanvasRef.current;
    if (!staticCanvas) return;
    const ctx = staticCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.max(1, Math.round(dimensions.width * dpr));
    const targetH = Math.max(1, Math.round(dimensions.height * dpr));
    if (staticCanvas.width !== targetW || staticCanvas.height !== targetH) {
      staticCanvas.width = targetW;
      staticCanvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { width, height } = dimensions;

    // Background - Phosphor CRT Night-Green
    ctx.fillStyle = '#070d09';
    ctx.fillRect(0, 0, width, height);

    // Draw Pitch Lanes
    for (let p = minPitch; p <= maxPitch; p++) {
      const y = pitchToY(p);
      const semitone = p % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(semitone);
      const inScale = scaleType === 'chromatic' ? true : isPitchInScale(p, scaleRoot, scaleType);

      if (scaleType !== 'chromatic' && !inScale) {
        ctx.fillStyle = isBlack ? '#030504' : '#050907';
        ctx.fillRect(pianoKeysWidth, y, width - pianoKeysWidth, noteHeight);
      } else {
        ctx.fillStyle = isBlack ? '#060d09' : '#0d1912';
        ctx.fillRect(pianoKeysWidth, y, width - pianoKeysWidth, noteHeight);
      }

      const isC = semitone === 0;
      ctx.strokeStyle = isC ? 'rgba(16, 185, 129, 0.35)' : inScale ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = isC ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(pianoKeysWidth, y + noteHeight);
      ctx.lineTo(width, y + noteHeight);
      ctx.stroke();
    }

    // Draw Piano Key Column on Left (High-contrast Black & White Keyboard)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, rulerHeight, pianoKeysWidth, height - rulerHeight);

    const blackKeyWidth = pianoKeysWidth - 20;
    const sharpNames: Record<number, string> = { 1: 'C#', 3: 'D#', 6: 'F#', 8: 'G#', 10: 'A#' };

    for (let p = minPitch; p <= maxPitch; p++) {
      const y = pitchToY(p);
      const semitone = ((p % 12) + 12) % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(semitone);
      const inScale = scaleType === 'chromatic' ? true : isPitchInScale(p, scaleRoot, scaleType);

      if (isBlack) {
        ctx.fillStyle = inScale ? '#f1f5f9' : '#dce1e8';
        ctx.fillRect(blackKeyWidth, y, pianoKeysWidth - blackKeyWidth, noteHeight);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(blackKeyWidth, y + noteHeight / 2);
        ctx.lineTo(pianoKeysWidth, y + noteHeight / 2);
        ctx.stroke();

        ctx.fillStyle = inScale ? '#090b0f' : '#1b1f26';
        ctx.fillRect(0, y + 0.5, blackKeyWidth, Math.max(2, noteHeight - 1));

        ctx.fillStyle = inScale ? '#2a303c' : '#333a47';
        ctx.fillRect(1, y + 1, Math.max(1, blackKeyWidth - 2), 1.5);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, y + 0.5, blackKeyWidth, Math.max(2, noteHeight - 1));

        if (noteHeight >= 10 && sharpNames[semitone]) {
          ctx.fillStyle = inScale ? '#e2e8f0' : '#94a3b8';
          ctx.font = 'bold 8px "SF Mono", "JetBrains Mono", Menlo, Monaco, ui-monospace, monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(sharpNames[semitone], 4, y + noteHeight / 2);
        }
      } else {
        ctx.fillStyle = inScale ? '#ffffff' : '#dde2e9';
        ctx.fillRect(0, y, pianoKeysWidth, noteHeight);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
        ctx.fillRect(pianoKeysWidth - 3, y, 3, noteHeight);

        ctx.strokeStyle = semitone === 0 ? '#475569' : '#94a3b8';
        ctx.lineWidth = semitone === 0 ? 1.2 : 0.8;
        ctx.beginPath();
        ctx.moveTo(0, y + noteHeight);
        ctx.lineTo(pianoKeysWidth, y + noteHeight);
        ctx.stroke();

        if (semitone === 0) {
          const octave = Math.floor(p / 12) - 1;
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 9.5px "SF Mono", "JetBrains Mono", Menlo, Monaco, ui-monospace, monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(`C${octave}`, pianoKeysWidth - 10, y + noteHeight / 2);
        } else if (noteHeight >= 13) {
          ctx.fillStyle = inScale ? '#475569' : '#64748b';
          ctx.font = '600 8px "SF Mono", "JetBrains Mono", Menlo, Monaco, ui-monospace, monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(getNoteName(semitone), pianoKeysWidth - 10, y + noteHeight / 2);
        }
      }

      if (scaleType !== 'chromatic') {
        ctx.fillStyle = inScale ? '#10b981' : 'rgba(100, 116, 139, 0.25)';
        ctx.beginPath();
        ctx.arc(pianoKeysWidth - 5, y + noteHeight / 2, inScale ? 2.4 : 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Crisp vertical divider separating keyboard column from note grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pianoKeysWidth, rulerHeight);
    ctx.lineTo(pianoKeysWidth, height);
    ctx.stroke();

    // Vertical Bar & Beat Grid
    const barPpq = timeSigNumerator * (4 / timeSigDenominator);
    const beatPpq = 4 / timeSigDenominator;
    const numBars = Math.ceil(totalLengthPpq / barPpq) + 2;

    for (let bar = 0; bar <= numBars; bar++) {
      const barStartPpq = bar * barPpq;
      const x = ppqToX(barStartPpq);
      if (x > width) break;

      ctx.strokeStyle = '#3d465c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, rulerHeight);
      ctx.lineTo(x, height);
      ctx.stroke();

      for (let beat = 1; beat < timeSigNumerator; beat++) {
        const bx = ppqToX(barStartPpq + beat * beatPpq);
        if (bx < width) {
          ctx.strokeStyle = '#272d3d';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(bx, rulerHeight);
          ctx.lineTo(bx, height);
          ctx.stroke();
        }
      }
    }

    // Sequence Length Marker Boundary Line
    const lengthX = ppqToX(totalLengthPpq);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(lengthX, rulerHeight);
    ctx.lineTo(lengthX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    if (lengthX < width) {
      ctx.fillStyle = 'rgba(10, 12, 18, 0.55)';
      ctx.fillRect(lengthX, rulerHeight, width - lengthX, height - rulerHeight);
    }

    // Custom A/B Loop Region Shading & Vertical Guide Lines
    const loopAX = ppqToX(effectiveLoopStart);
    const loopBX = ppqToX(effectiveLoopEnd);
    if (isCustomLoopActive) {
      ctx.fillStyle = 'rgba(4, 8, 12, 0.55)';
      if (loopAX > pianoKeysWidth) {
        ctx.fillRect(pianoKeysWidth, rulerHeight, loopAX - pianoKeysWidth, height - rulerHeight);
      }
      if (loopBX < lengthX) {
        ctx.fillRect(loopBX, rulerHeight, lengthX - loopBX, height - rulerHeight);
      }

      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(loopAX, rulerHeight);
      ctx.lineTo(loopAX, height);
      ctx.moveTo(loopBX, rulerHeight);
      ctx.lineTo(loopBX, height);
      ctx.stroke();
      ctx.restore();
    }

    // Top Ruler (CRT Scope Header Strip + Chord Recognition Strip + A/B Loop Bar)
    ctx.fillStyle = '#080d0a';
    ctx.fillRect(0, 0, width, rulerHeight);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerHeight);
    ctx.lineTo(width, rulerHeight);
    ctx.stroke();

    ctx.fillStyle = isCustomLoopActive ? 'rgba(56, 189, 248, 0.28)' : 'rgba(16, 185, 129, 0.12)';
    ctx.fillRect(loopAX, 0, Math.max(4, loopBX - loopAX), 6);
    ctx.fillStyle = isCustomLoopActive ? '#38bdf8' : 'rgba(52, 211, 153, 0.45)';
    ctx.fillRect(loopAX, 0, Math.max(4, loopBX - loopAX), 2);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 10px "SF Mono", "JetBrains Mono", Menlo, Monaco, ui-monospace, monospace';
    ctx.textAlign = 'left';

    for (let bar = 0; bar <= numBars; bar++) {
      const barStartPpq = bar * barPpq;
      const x = ppqToX(barStartPpq);
      if (x > width) break;

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, rulerHeight - 14);
      ctx.lineTo(x, rulerHeight);
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.fillText(`${bar + 1}`, x + 5, 17);

      for (let beat = 1; beat < timeSigNumerator; beat++) {
        const bx = ppqToX(barStartPpq + beat * beatPpq);
        if (bx < width) {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
          ctx.beginPath();
          ctx.moveTo(bx, rulerHeight - 6);
          ctx.lineTo(bx, rulerHeight);
          ctx.stroke();
        }
      }
    }

    // Detected Chords Row inside Bottom Half of Ruler (y = 22..38)
    if (showChordNames && detectedChords.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(pianoKeysWidth, 20, Math.max(0, width - pianoKeysWidth), 20);
      ctx.clip();
      ctx.font = 'bold 9px "SF Mono", "JetBrains Mono", Menlo, Monaco, ui-monospace, monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      for (const ch of detectedChords) {
        const cx = ppqToX(ch.startPpq);
        const cw = Math.max(18, ppqToX(ch.endPpq) - cx - 2);
        if (cx > width || cx + cw < pianoKeysWidth) continue;

        ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
        ctx.beginPath();
        ctx.roundRect(cx + 2, 23, Math.min(cw - 2, Math.max(24, ch.label.length * 6.5 + 8)), 14, 3);
        ctx.fill();

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.fillText(ch.label, cx + 6, 30);
      }
      ctx.restore();
    }

    // Left Corner Header Badge in Ruler
    ctx.fillStyle = '#0c120e';
    ctx.fillRect(0, 0, pianoKeysWidth, rulerHeight);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 8px "SF Mono", "JetBrains Mono", Menlo, Monaco, ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KEYS', pianoKeysWidth / 2, 12);
    if (showChordNames) {
      ctx.fillStyle = '#d97706';
      ctx.fillText('CHORDS', pianoKeysWidth / 2, 29);
    }

    // Draggable A & B Loop Locator Flags on Ruler
    ctx.fillStyle = isCustomLoopActive ? '#38bdf8' : '#0284c7';
    ctx.beginPath();
    ctx.moveTo(loopAX, 0);
    ctx.lineTo(loopAX + 13, 0);
    ctx.lineTo(loopAX + 13, 12);
    ctx.lineTo(loopAX + 6, 15);
    ctx.lineTo(loopAX, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#04121d';
    ctx.font = 'bold 8.5px "SF Mono", "JetBrains Mono", Menlo, Monaco, ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', loopAX + 6.5, 6.5);

    ctx.fillStyle = isCustomLoopActive ? '#38bdf8' : '#0284c7';
    ctx.beginPath();
    ctx.moveTo(loopBX - 13, 0);
    ctx.lineTo(loopBX, 0);
    ctx.lineTo(loopBX, 12);
    ctx.lineTo(loopBX - 6, 15);
    ctx.lineTo(loopBX - 13, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#04121d';
    ctx.fillText('B', loopBX - 6.5, 6.5);

    // Draggable Length Handle on Ruler
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.roundRect(lengthX - 11, 16, 22, 20, 3);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8.5px "SF Mono", "JetBrains Mono", Menlo, Monaco, ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('END', lengthX, 26);

    // Draw Notes with Horizontal Viewport Culling & Conditional Glow Throttling
    const monoFontFamily = '"SF Mono", "JetBrains Mono", Menlo, Monaco, ui-monospace, monospace';
    const enableNoteGlow = notes.length <= 150;

    for (const note of notes) {
      const x = ppqToX(note.startPpq);
      const w = Math.max(6, note.durationPpq * pixelsPerPpq);
      if (x + w < pianoKeysWidth || x > width) continue;

      const effectivePitch = Math.min(127, Math.max(0, note.pitch + previewTranspose));
      const inScale = scaleType === 'chromatic' ? true : isPitchInScale(effectivePitch, scaleRoot, scaleType);
      const y = pitchToY(effectivePitch);
      const boxH = Math.max(3, noteHeight - 1.5);
      const boxY = y + 0.75;
      const isSelected = selectedNoteIds.has(note.id);
      const isLocked = Boolean(note.locked);
      const velColor = getVelocityColor(note.velocity);

      if (enableNoteGlow || isSelected) {
        ctx.save();
        if (isSelected) {
          ctx.shadowColor = isLocked ? 'rgba(56, 189, 248, 0.85)' : 'rgba(255, 255, 255, 0.75)';
          ctx.shadowBlur = 8;
        } else if (isLocked) {
          ctx.shadowColor = 'rgba(14, 165, 233, 0.65)';
          ctx.shadowBlur = 6;
        } else if (inScale) {
          ctx.shadowColor = velColor.base;
          ctx.shadowBlur = 4;
        }
      }

      if (inScale) {
        ctx.fillStyle = velColor.base;
        ctx.beginPath();
        ctx.roundRect(x, boxY, w, boxH, 1.5);
        ctx.fill();
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(x, boxY, w, boxH, 1.5);
        ctx.fill();
        ctx.globalAlpha = isSelected ? 0.55 : 0.35;
        ctx.fillStyle = velColor.base;
        ctx.beginPath();
        ctx.roundRect(x, boxY, w, boxH, 1.5);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (enableNoteGlow || isSelected) {
        ctx.restore();
      }

      ctx.fillStyle = isSelected
        ? 'rgba(255, 255, 255, 0.65)'
        : isLocked
          ? '#7dd3fc'
          : inScale
            ? velColor.highlight
            : 'rgba(148, 163, 184, 0.3)';
      ctx.fillRect(x + 1, boxY + 0.5, Math.max(1, w - 2), 1.0);

      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(x + 0.5, boxY + 0.5, Math.max(1, w - 1), Math.max(1, boxH - 1));
        if (isLocked && w >= 6) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x + 2, boxY + 2, Math.max(1, w - 4), Math.max(1, boxH - 4));
        }
      } else if (isLocked) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, boxY + 0.5, Math.max(1, w - 1), Math.max(1, boxH - 1));
      } else {
        ctx.strokeStyle = inScale ? velColor.border : '#334155';
        ctx.lineWidth = 1.0;
        ctx.strokeRect(x, boxY, w, boxH);
      }

      if (isSelected && w >= 10) {
        ctx.fillStyle = isLocked ? '#38bdf8' : '#ffffff';
        ctx.fillRect(x + 1, boxY + 1, 2, Math.max(1, boxH - 2));
      }

      if (w >= 12) {
        const handleW = Math.min(5, Math.max(2.5, w * 0.14));
        ctx.fillStyle = isSelected ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.22)';
        ctx.fillRect(x + w - handleW - 1, boxY + 1.5, handleW, Math.max(1, boxH - 3));
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(x + w - 2.5, boxY + 2, 1, Math.max(1, boxH - 4));
      }

      const showPadlock = isLocked && w >= 12 && noteHeight >= 7;
      if (showPadlock) {
        const lockX = isSelected ? x + 4.5 : x + 3;
        const lockMidY = y + noteHeight / 2;
        ctx.save();
        const lockCol = velColor.isLight && inScale ? '#0c4a6e' : '#e0f2fe';
        ctx.strokeStyle = lockCol;
        ctx.fillStyle = lockCol;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(lockX + 2.5, lockMidY - 1.2, 1.8, Math.PI, 0);
        ctx.stroke();
        ctx.fillRect(lockX + 0.5, lockMidY - 1, 4, 3.5);
        ctx.restore();
      }

      if (!inScale) {
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 2, boxY + boxH - 1.5);
        ctx.lineTo(x + Math.min(w - 2, 10), boxY + 1.5);
        ctx.stroke();
      }

      if (w >= 8 && noteHeight >= 4.5) {
        const pc = ((effectivePitch % 12) + 12) % 12;
        const octave = Math.floor(effectivePitch / 12) - 1;
        const useFlats = [1, 3, 5, 8, 10].includes(scaleRoot);
        const noteLetter = getNoteName(pc, useFlats);
        const displayName = w >= 22 ? `${noteLetter}${octave}` : noteLetter;
        const textOffsetX = x + (showPadlock ? 12 : isSelected ? 4.5 : 3);

        if (!showPadlock || w >= 20) {
          const fontSize = noteHeight < 8 ? Math.max(6.5, noteHeight - 0.5) : Math.min(10, Math.max(7, Math.floor(noteHeight - 2.5)));
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + 1, y - 2, Math.max(0, w - 2.5), noteHeight + 4);
          ctx.clip();

          ctx.font = `700 ${fontSize}px ${monoFontFamily}`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';

          const useDarkInk = inScale && velColor.isLight;
          if (!useDarkInk) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillText(displayName, textOffsetX + 0.5, y + noteHeight / 2 + 0.6);
            ctx.fillStyle = '#ffffff';
          } else {
            ctx.fillStyle = '#05080f';
          }
          ctx.fillText(displayName, textOffsetX, y + noteHeight / 2 + 0.25);
          ctx.restore();
        }
      }
    }

    setStaticRenderTick((t) => t + 1);
  }, [
    dimensions,
    minPitch,
    maxPitch,
    totalLengthPpq,
    previewTranspose,
    notes,
    selectedNoteIds,
    noteHeight,
    pixelsPerPpq,
    pianoKeysWidth,
    rulerHeight,
    scaleRoot,
    scaleType,
    scaleLock,
    effectiveLoopStart,
    effectiveLoopEnd,
    isCustomLoopActive,
    showChordNames,
    detectedChords,
    timeSigNumerator,
    timeSigDenominator,
    pitchToY,
    ppqToX,
  ]);

  // Dynamic Composite Pass: blits cached static layer + draws Playhead & Marquee box without reallocating backing buffers
  useEffect(() => {
    const canvas = canvasRef.current;
    const staticCanvas = staticCanvasRef.current;
    if (!canvas || !staticCanvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = dimensions;
    const targetW = Math.max(1, Math.round(width * dpr));
    const targetH = Math.max(1, Math.round(height * dpr));

    if (
      canvasSizeRef.current.width !== targetW ||
      canvasSizeRef.current.height !== targetH ||
      canvasSizeRef.current.dpr !== dpr
    ) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvasSizeRef.current = { width: targetW, height: targetH, dpr };
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(staticCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Draw Playhead (Glowing Phosphor line with analog bloom)
    const playheadX = ppqToX(playheadPpq);
    if (playheadX >= pianoKeysWidth && playheadX <= width) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.fillRect(playheadX - 3, rulerHeight, 7, height - rulerHeight);

      ctx.save();
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 9;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerHeight);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, rulerHeight - 12);
      ctx.lineTo(playheadX + 5, rulerHeight - 12);
      ctx.lineTo(playheadX, rulerHeight);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Draw Marquee Selection Box
    if (dragRef.current.mode === 'marquee' && dragRef.current.marquee) {
      const { x1, y1, x2, y2 } = dragRef.current.marquee;
      const mx = Math.min(x1, x2);
      const my = Math.min(y1, y2);
      const mw = Math.abs(x2 - x1);
      const mh = Math.abs(y2 - y1);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, my, mw, mh);
    }
  }, [dimensions, playheadPpq, pianoKeysWidth, rulerHeight, ppqToX, staticRenderTick, marqueeTick]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (contextMenu) {
      setContextMenu(null);
    }
    if (e.button !== 0) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lengthHandleX = ppqToX(totalLengthPpq);
    const loopAX = ppqToX(effectiveLoopStart);
    const loopBX = ppqToX(effectiveLoopEnd);

    // Check A / B Loop Locator Flags on top of Ruler
    if (y <= 17 && x >= loopAX - 4 && x <= loopAX + 16 && onLoopRangeChange) {
      dragRef.current = {
        mode: 'dragLoopA',
        startX: x,
        startY: y,
        activeNoteId: -1,
        initialPpq: effectiveLoopStart,
        initialPitch: 0,
        initialDuration: 1,
        initialLengthPpq: totalLengthPpq,
        initialSelectedNotes: new Map(),
      };
      return;
    }

    if (y <= 17 && x >= loopBX - 16 && x <= loopBX + 4 && onLoopRangeChange) {
      dragRef.current = {
        mode: 'dragLoopB',
        startX: x,
        startY: y,
        activeNoteId: -1,
        initialPpq: effectiveLoopEnd,
        initialPitch: 0,
        initialDuration: 1,
        initialLengthPpq: totalLengthPpq,
        initialSelectedNotes: new Map(),
      };
      return;
    }

    if (y <= rulerHeight && y >= 15 && Math.abs(x - lengthHandleX) <= 14) {
      dragRef.current = {
        mode: 'dragLength',
        startX: x,
        startY: y,
        activeNoteId: -1,
        initialPpq: 0,
        initialPitch: 0,
        initialDuration: 1,
        initialLengthPpq: totalLengthPpq,
        initialSelectedNotes: new Map(),
      };
      return;
    }

    if (y <= rulerHeight) {
      dragRef.current = {
        mode: 'scrub',
        startX: x,
        startY: y,
        activeNoteId: -1,
        initialPpq: 0,
        initialPitch: 0,
        initialDuration: 1,
        initialLengthPpq: totalLengthPpq,
        initialSelectedNotes: new Map(),
      };
      onSeek(xToPpq(x));
      return;
    }

    // Clicking a piano key on the left-hand keyboard auditions that pitch cleanly
    if (x <= pianoKeysWidth) {
      const clickedPitch = yToPitch(y);
      synthAudioEngine.auditionNote(clickedPitch, 0.85, 0.35);
      return;
    }

    let hitNote: MidiNote | null = null;
    let hitNearEdge = false;

    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      const effPitch = n.pitch + previewTranspose;
      const nx = ppqToX(n.startPpq);
      const nw = Math.max(8, n.durationPpq * pixelsPerPpq);
      const ny = pitchToY(effPitch);

      if (x >= nx && x <= nx + nw && y >= ny && y <= ny + noteHeight) {
        hitNote = n;
        // Generous right-edge resize zone (min 8px, up to 18px or 35% of note width)
        const edgeZone = Math.max(8, Math.min(18, nw * 0.35));
        hitNearEdge = x >= nx + nw - edgeZone;
        break;
      }
    }

    if (hitNote) {
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      let newSelected = new Set(selectedNoteIds);

      if (isShift) {
        if (newSelected.has(hitNote.id)) newSelected.delete(hitNote.id);
        else newSelected.add(hitNote.id);
      } else if (!newSelected.has(hitNote.id)) {
        newSelected.clear();
        newSelected.add(hitNote.id);
      }

      let activeNotesToDrag = notes.filter((n) => newSelected.has(n.id));
      let activeIdToTrack = hitNote.id;

      if (isAlt) {
        if (onSnapshotBeforeChange) onSnapshotBeforeChange('Duplicate & Drag Note(s)');
        // Alt-drag note duplication: duplicate all selected notes immediately
        let maxId = getMaxNoteId(notes);
        const duplicatedNotes: MidiNote[] = [];
        const duplicatedSelectedIds = new Set<number>();
        const noteIdMap = new Map<number, number>();

        activeNotesToDrag.forEach((n) => {
          maxId++;
          const dup: MidiNote = {
            ...n,
            id: maxId,
          };
          duplicatedNotes.push(dup);
          duplicatedSelectedIds.add(dup.id);
          noteIdMap.set(n.id, dup.id);
        });

        const updatedNotesList = [...notes, ...duplicatedNotes];
        newSelected = duplicatedSelectedIds;
        activeNotesToDrag = duplicatedNotes;
        if (noteIdMap.has(hitNote.id)) {
          activeIdToTrack = noteIdMap.get(hitNote.id)!;
        }

        onNotesChange(updatedNotesList);
        updateSelectedNoteIds(newSelected);
      } else {
        updateSelectedNoteIds(newSelected);
      }

      // Snapshot starting coordinates and durations for all selected notes so they move/resize together
      const initialMap = new Map<number, { startPpq: number; pitch: number }>();
      const initialDurMap = new Map<number, number>();
      activeNotesToDrag.forEach((n) => {
        initialMap.set(n.id, { startPpq: n.startPpq, pitch: n.pitch });
        initialDurMap.set(n.id, n.durationPpq);
      });

      const trackedNote = activeNotesToDrag.find((n) => n.id === activeIdToTrack) || activeNotesToDrag[0];

      dragRef.current = {
        mode: hitNearEdge && !isAlt ? 'resize' : 'move',
        startX: x,
        startY: y,
        activeNoteId: trackedNote.id,
        initialPpq: trackedNote.startPpq,
        initialPitch: trackedNote.pitch,
        initialDuration: trackedNote.durationPpq,
        initialLengthPpq: totalLengthPpq,
        initialSelectedNotes: initialMap,
        initialDurations: initialDurMap,
        hasPushedSnapshot: isAlt,
      };
    } else {
      if (!e.shiftKey) updateSelectedNoteIds(new Set());
      dragRef.current = {
        mode: 'marquee',
        startX: x,
        startY: y,
        activeNoteId: -1,
        initialPpq: 0,
        initialPitch: 0,
        initialDuration: 1,
        initialLengthPpq: totalLengthPpq,
        initialSelectedNotes: new Map(),
        hasPushedSnapshot: false,
        marquee: { x1: x, y1: y, x2: x, y2: y },
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const canvas = canvasRef.current;

    if (dragRef.current.mode === 'none') {
      if (canvas) {
        const lengthHandleX = ppqToX(totalLengthPpq);
        const loopAX = ppqToX(effectiveLoopStart);
        const loopBX = ppqToX(effectiveLoopEnd);
        if (
          (y <= 17 && ((x >= loopAX - 4 && x <= loopAX + 16) || (x >= loopBX - 16 && x <= loopBX + 4))) ||
          (y <= rulerHeight && y >= 15 && Math.abs(x - lengthHandleX) <= 14)
        ) {
          canvas.style.cursor = 'ew-resize';
        } else if (y <= rulerHeight) {
          canvas.style.cursor = 'pointer';
        } else if (x <= pianoKeysWidth) {
          canvas.style.cursor = 'pointer';
        } else {
          let isOverResizeEdge = false;
          let isOverNote = false;

          for (let i = notes.length - 1; i >= 0; i--) {
            const n = notes[i];
            const effPitch = n.pitch + previewTranspose;
            const nx = ppqToX(n.startPpq);
            const nw = Math.max(8, n.durationPpq * pixelsPerPpq);
            const ny = pitchToY(effPitch);

            if (x >= nx && x <= nx + nw && y >= ny && y <= ny + noteHeight) {
              isOverNote = true;
              const edgeZone = Math.max(8, Math.min(18, nw * 0.35));
              if (x >= nx + nw - edgeZone) {
                isOverResizeEdge = true;
              }
              break;
            }
          }

          if (isOverResizeEdge) {
            canvas.style.cursor = 'ew-resize';
          } else if (isOverNote) {
            canvas.style.cursor = 'grab';
          } else {
            canvas.style.cursor = 'crosshair';
          }
        }
      }
      return;
    }

    if (dragRef.current.mode === 'dragLoopA' && onLoopRangeChange) {
      const snapStep = e.shiftKey ? 0.25 : 0.5;
      const rawPpq = xToPpq(x);
      const snappedA = Math.max(0, Math.min(effectiveLoopEnd - 0.5, Math.round(rawPpq / snapStep) * snapStep));
      onLoopRangeChange(snappedA, effectiveLoopEnd >= totalLengthPpq - 0.01 ? null : effectiveLoopEnd);
    } else if (dragRef.current.mode === 'dragLoopB' && onLoopRangeChange) {
      const snapStep = e.shiftKey ? 0.25 : 0.5;
      const rawPpq = xToPpq(x);
      const snappedB = Math.min(totalLengthPpq, Math.max(effectiveLoopStart + 0.5, Math.round(rawPpq / snapStep) * snapStep));
      onLoopRangeChange(effectiveLoopStart, snappedB >= totalLengthPpq - 0.01 ? null : snappedB);
    } else if (dragRef.current.mode === 'dragLength') {
      const rawPpq = xToPpq(x);
      const snappedLength = Math.max(4, Math.round(rawPpq * 2) / 2);
      onLengthChange(snappedLength);
    } else if (dragRef.current.mode === 'scrub') {
      onSeek(xToPpq(x));
    } else if (dragRef.current.mode === 'move' && dragRef.current.activeNoteId >= 0) {
      if (canvas) canvas.style.cursor = 'grabbing';
      if (!dragRef.current.hasPushedSnapshot) {
        if (onSnapshotBeforeChange) onSnapshotBeforeChange('Move Note(s)');
        dragRef.current.hasPushedSnapshot = true;
      }
      const deltaPpq = (x - dragRef.current.startX) / pixelsPerPpq;
      const quantizedDeltaPpq = Math.round(deltaPpq * 4) / 4;

      const currentPitch = yToPitch(y);
      let targetPitch = currentPitch - previewTranspose;

      if (scaleLock && scaleType !== 'chromatic') {
        targetPitch = snapPitchToScale(targetPitch, scaleRoot, scaleType);
      }

      const pitchDelta = targetPitch - dragRef.current.initialPitch;
      const initialMap = dragRef.current.initialSelectedNotes;

      const updated = notes.map((n) => {
        if (selectedNoteIds.has(n.id)) {
          const init = initialMap.get(n.id) || { startPpq: n.startPpq, pitch: n.pitch };
          const newStart = Math.max(0, init.startPpq + quantizedDeltaPpq);
          let newPitch = Math.min(127, Math.max(0, init.pitch + pitchDelta));
          if (scaleLock && scaleType !== 'chromatic') {
            newPitch = snapPitchToScale(newPitch, scaleRoot, scaleType);
          }
          return { ...n, startPpq: newStart, pitch: newPitch };
        }
        return n;
      });
      onNotesChange(updated);
    } else if (dragRef.current.mode === 'resize' && dragRef.current.activeNoteId >= 0) {
      if (canvas) canvas.style.cursor = 'ew-resize';
      if (!dragRef.current.hasPushedSnapshot) {
        if (onSnapshotBeforeChange) onSnapshotBeforeChange('Resize Note Duration');
        dragRef.current.hasPushedSnapshot = true;
      }
      const deltaPpq = (x - dragRef.current.startX) / pixelsPerPpq;
      // Normal snap to 1/16th (0.25 PPQ); fine snap to 1/64th (0.0625 PPQ) with Shift
      const snapStep = e.shiftKey ? 0.0625 : 0.25;
      const quantizedDelta = Math.round(deltaPpq / snapStep) * snapStep;
      const durMap = dragRef.current.initialDurations;

      const updated = notes.map((n) => {
        if (selectedNoteIds.has(n.id)) {
          const initDur = durMap?.get(n.id) ?? n.durationPpq;
          const newDuration = Math.max(snapStep, Math.round((initDur + quantizedDelta) / snapStep) * snapStep);
          return { ...n, durationPpq: newDuration };
        } else if (n.id === dragRef.current.activeNoteId) {
          const initDur = dragRef.current.initialDuration;
          const newDuration = Math.max(snapStep, Math.round((initDur + quantizedDelta) / snapStep) * snapStep);
          return { ...n, durationPpq: newDuration };
        }
        return n;
      });
      onNotesChange(updated);
    } else if (dragRef.current.mode === 'marquee') {
      dragRef.current.marquee = {
        x1: dragRef.current.startX,
        y1: dragRef.current.startY,
        x2: x,
        y2: y,
      };

      const xMin = Math.min(dragRef.current.startX, x);
      const xMax = Math.max(dragRef.current.startX, x);
      const yMin = Math.min(dragRef.current.startY, y);
      const yMax = Math.max(dragRef.current.startY, y);

      const marqueeSelected = new Set<number>();
      for (const n of notes) {
        const nx = ppqToX(n.startPpq);
        const nw = Math.max(6, n.durationPpq * pixelsPerPpq);
        const ny = pitchToY(n.pitch + previewTranspose);

        if (nx < xMax && nx + nw > xMin && ny < yMax && ny + noteHeight > yMin) {
          marqueeSelected.add(n.id);
        }
      }
      updateSelectedNoteIds(marqueeSelected);
      setMarqueeTick((t) => t + 1);
    }
  };

  const handleMouseUp = () => {
    const wasMarquee = dragRef.current.mode === 'marquee';
    dragRef.current.mode = 'none';
    dragRef.current.marquee = undefined;
    dragRef.current.initialDurations = undefined;
    if (wasMarquee) {
      setMarqueeTick((t) => t + 1);
    }
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'crosshair';
    }
  };

  // Right-click Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (y <= rulerHeight || x <= pianoKeysWidth) return;

    const rawPpq = xToPpq(x);
    // Snap targetPpq to nearest 1/16 note (0.25 PPQ)
    const targetPpq = Math.max(0, Math.round(rawPpq * 4) / 4);

    let targetPitch = yToPitch(y) - previewTranspose;
    if (scaleLock && scaleType !== 'chromatic') {
      targetPitch = snapPitchToScale(targetPitch, scaleRoot, scaleType);
    }
    targetPitch = Math.min(127, Math.max(0, targetPitch));

    // Check if right click hit an existing note
    let hitNote: MidiNote | null = null;
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      const effPitch = n.pitch + previewTranspose;
      const nx = ppqToX(n.startPpq);
      const nw = Math.max(6, n.durationPpq * pixelsPerPpq);
      const ny = pitchToY(effPitch);

      if (x >= nx && x <= nx + nw && y >= ny && y <= ny + noteHeight) {
        hitNote = n;
        break;
      }
    }

    if (hitNote) {
      if (!selectedNoteIds.has(hitNote.id)) {
        updateSelectedNoteIds(new Set([hitNote.id]));
      }
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetPpq,
      targetPitch,
      hitNoteId: hitNote ? hitNote.id : undefined,
    });
  };

  const handleAddNote = useCallback(() => {
    if (!contextMenu) return;
    if (onSnapshotBeforeChange) onSnapshotBeforeChange('Add Note');
    const maxId = getMaxNoteId(notes);
    let pitch = contextMenu.targetPitch;
    if (scaleLock && scaleType !== 'chromatic') {
      pitch = snapPitchToScale(pitch, scaleRoot, scaleType);
    }
    pitch = Math.min(127, Math.max(0, pitch));

    // Default duration 1.0 PPQ or adjusted to fit within sequence length
    const remaining = totalLengthPpq - contextMenu.targetPpq;
    const durationPpq = remaining > 0 ? Math.min(1.0, Math.max(0.25, remaining)) : 1.0;

    let defaultVel = 0.75;
    if (notes.length > 0) {
      const avg = notes.reduce((s, n) => s + n.velocity, 0) / notes.length;
      defaultVel = Math.min(1.0, Math.max(0.1, Math.round(avg * 100) / 100));
    }

    const newNote: MidiNote = {
      id: maxId + 1,
      pitch,
      startPpq: contextMenu.targetPpq,
      durationPpq,
      velocity: defaultVel,
      channel: 1,
    };

    onNotesChange([...notes, newNote]);
    updateSelectedNoteIds(new Set([newNote.id]));
    synthAudioEngine.auditionNote(pitch + previewTranspose, defaultVel, 0.35);
    setContextMenu(null);
  }, [
    contextMenu,
    notes,
    scaleLock,
    scaleType,
    scaleRoot,
    totalLengthPpq,
    onNotesChange,
    updateSelectedNoteIds,
    previewTranspose,
    onSnapshotBeforeChange,
  ]);

  const handleDeleteSelected = useCallback(() => {
    const toDelete =
      contextMenu?.hitNoteId !== undefined
        ? selectedNoteIds.has(contextMenu.hitNoteId)
          ? selectedNoteIds
          : new Set([contextMenu.hitNoteId])
        : selectedNoteIds;

    if (toDelete.size > 0) {
      if (onSnapshotBeforeChange) onSnapshotBeforeChange('Delete Note(s)');
      const remaining = notes.filter((n) => !toDelete.has(n.id));
      onNotesChange(remaining);
      updateSelectedNoteIds(new Set());
    }
    setContextMenu(null);
  }, [contextMenu, selectedNoteIds, notes, onNotesChange, updateSelectedNoteIds, onSnapshotBeforeChange]);

  const handleDuplicateSelected = useCallback(() => {
    const toDup =
      contextMenu?.hitNoteId !== undefined
        ? selectedNoteIds.has(contextMenu.hitNoteId)
          ? selectedNoteIds
          : new Set([contextMenu.hitNoteId])
        : selectedNoteIds;

    if (toDup.size > 0) {
      if (onSnapshotBeforeChange) onSnapshotBeforeChange('Duplicate Note(s)');
      let maxId = getMaxNoteId(notes);
      const duplicated: MidiNote[] = [];
      const newSelected = new Set<number>();

      notes.forEach((n) => {
        if (toDup.has(n.id)) {
          maxId++;
          const dupNote: MidiNote = {
            ...n,
            id: maxId,
            startPpq: n.startPpq + n.durationPpq,
          };
          duplicated.push(dupNote);
          newSelected.add(dupNote.id);
        }
      });

      onNotesChange([...notes, ...duplicated]);
      updateSelectedNoteIds(newSelected);
    }
    setContextMenu(null);
  }, [contextMenu, selectedNoteIds, notes, onNotesChange, updateSelectedNoteIds, onSnapshotBeforeChange]);

  const handleTransposeOctave = useCallback(
    (semitones: number) => {
      const targetIds =
        contextMenu?.hitNoteId !== undefined
          ? selectedNoteIds.has(contextMenu.hitNoteId)
            ? selectedNoteIds
            : new Set([contextMenu.hitNoteId])
          : selectedNoteIds;

      if (targetIds.size > 0) {
        if (onSnapshotBeforeChange) onSnapshotBeforeChange(`Transpose Octave (${semitones > 0 ? '+12' : '-12'})`);
        const updated = notes.map((n) => {
          if (targetIds.has(n.id)) {
            const newPitch = Math.min(127, Math.max(0, n.pitch + semitones));
            return { ...n, pitch: newPitch };
          }
          return n;
        });
        onNotesChange(updated);
      }
      setContextMenu(null);
    },
    [contextMenu, selectedNoteIds, notes, onNotesChange, onSnapshotBeforeChange]
  );

  const handleSetDuration = useCallback(
    (durationPpq: number) => {
      const targetIds =
        contextMenu?.hitNoteId !== undefined
          ? selectedNoteIds.has(contextMenu.hitNoteId)
            ? selectedNoteIds
            : new Set([contextMenu.hitNoteId])
          : selectedNoteIds;

      if (targetIds.size > 0) {
        if (onSnapshotBeforeChange) onSnapshotBeforeChange(`Set Note Duration (${durationPpq} PPQ)`);
        const updated = notes.map((n) => {
          if (targetIds.has(n.id)) {
            return { ...n, durationPpq: Math.max(0.0625, durationPpq) };
          }
          return n;
        });
        onNotesChange(updated);
      }
      setContextMenu(null);
    },
    [contextMenu, selectedNoteIds, notes, onNotesChange, onSnapshotBeforeChange]
  );

  const handleMultiplyDuration = useCallback(
    (factor: number) => {
      const targetIds =
        contextMenu?.hitNoteId !== undefined
          ? selectedNoteIds.has(contextMenu.hitNoteId)
            ? selectedNoteIds
            : new Set([contextMenu.hitNoteId])
          : selectedNoteIds;

      if (targetIds.size > 0) {
        if (onSnapshotBeforeChange) onSnapshotBeforeChange(`Multiply Note Duration (${factor}x)`);
        const updated = notes.map((n) => {
          if (targetIds.has(n.id)) {
            return { ...n, durationPpq: Math.max(0.0625, n.durationPpq * factor) };
          }
          return n;
        });
        onNotesChange(updated);
      }
      setContextMenu(null);
    },
    [contextMenu, selectedNoteIds, notes, onNotesChange, onSnapshotBeforeChange]
  );

  const handleSelectAll = useCallback(() => {
    updateSelectedNoteIds(new Set(notes.map((n) => n.id)));
    setContextMenu(null);
  }, [notes, updateSelectedNoteIds]);

  const handleDeselectAll = useCallback(() => {
    updateSelectedNoteIds(new Set());
    setContextMenu(null);
  }, [updateSelectedNoteIds]);

  const handleSetLockSelected = useCallback(
    (lockState: boolean) => {
      const targetIds =
        contextMenu?.hitNoteId !== undefined
          ? selectedNoteIds.has(contextMenu.hitNoteId)
            ? selectedNoteIds
            : new Set([contextMenu.hitNoteId])
          : selectedNoteIds;

      if (targetIds.size > 0) {
        if (onSnapshotBeforeChange) {
          onSnapshotBeforeChange(lockState ? 'Lock Note(s)' : 'Unlock Note(s)');
        }
        const updated = notes.map((n) =>
          targetIds.has(n.id) ? { ...n, locked: lockState } : n
        );
        onNotesChange(updated);
      }
      setContextMenu(null);
    },
    [contextMenu, selectedNoteIds, notes, onNotesChange, onSnapshotBeforeChange]
  );

  const handleUnlockAllLocked = useCallback(() => {
    const hasAnyLocked = notes.some((n) => n.locked);
    if (hasAnyLocked) {
      if (onSnapshotBeforeChange) onSnapshotBeforeChange('Unlock All Notes');
      onNotesChange(notes.map((n) => (n.locked ? { ...n, locked: false } : n)));
    }
    setContextMenu(null);
  }, [notes, onNotesChange, onSnapshotBeforeChange]);

  // Keyboard Shortcuts: Cut, Copy, Paste, Delete, Backspace, Cmd/Ctrl+A, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNoteIds.size > 0) {
          e.preventDefault();
          if (onSnapshotBeforeChange) onSnapshotBeforeChange('Delete Note(s)');
          const remaining = notes.filter((n) => !selectedNoteIds.has(n.id));
          onNotesChange(remaining);
          updateSelectedNoteIds(new Set());
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        updateSelectedNoteIds(new Set(notes.map((n) => n.id)));
      } else if (e.key === 'Escape') {
        setContextMenu(null);
        updateSelectedNoteIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, selectedNoteIds, onNotesChange, updateSelectedNoteIds, handleCopy, handleCut, handlePaste, onSnapshotBeforeChange]);

  // Close context menu on outside click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (contextMenu) {
        const menuEl = document.getElementById('piano-roll-context-menu');
        if (menuEl && !menuEl.contains(e.target as Node)) {
          setContextMenu(null);
        }
      }
    };

    if (contextMenu) {
      window.addEventListener('mousedown', handleGlobalClick);
      return () => window.removeEventListener('mousedown', handleGlobalClick);
    }
  }, [contextMenu]);

  const handleDoubleMidi = () => {
    if (onSnapshotBeforeChange) onSnapshotBeforeChange('Double Length (2x)');
    const oldLength = totalLengthPpq;
    const newLength = oldLength * 2;
    const maxId = getMaxNoteId(notes);
    const duplicatedNotes = notes.map((n, i) => ({
      ...n,
      id: maxId + i + 1,
      startPpq: n.startPpq + oldLength,
    }));
    onNotesChange([...notes, ...duplicatedNotes]);
    onLengthChange(newLength);
  };

  const handleHalveMidi = () => {
    if (onSnapshotBeforeChange) onSnapshotBeforeChange('Halve Length (0.5x)');
    const newLength = Math.max(4, totalLengthPpq / 2);
    const filteredNotes = notes.filter((n) => n.startPpq < newLength);
    onNotesChange(filteredNotes);
    onLengthChange(newLength);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full flex-1 min-h-0 select-none overflow-hidden rounded-md border-2 border-black/90 bg-[#070d09] crt-screen shadow-[inset_0_0_35px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.08)] focus:outline-none flex flex-col"
      tabIndex={0}
    >
      {/* Bottom Floating Analog Scope Mini-Toolbar */}
      <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 bg-[#121418]/90 border border-neutral-700/80 rounded px-2.5 py-1 shadow-2xl backdrop-blur-md">
        {/* Zoom Controls */}
        <button
          onClick={() => setZoomX((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
          className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition"
          title="Zoom Out Time (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono font-bold text-emerald-400 px-1">{Math.round(zoomX * 100)}%</span>
        <button
          onClick={() => setZoomX((z) => Math.min(3.5, Number((z + 0.2).toFixed(1))))}
          className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition"
          title="Zoom In Time (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-neutral-700 mx-1" />

        {/* Chord Recognition Ruler Toggle */}
        <button
          onClick={() => setShowChordNames((v) => !v)}
          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border transition ${
            showChordNames
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
          }`}
          title="Toggle live chord detection labels on the ruler"
        >
          Chords
        </button>

        {/* A/B Audition Loop Region Readout & Reset */}
        {onLoopRangeChange && (
          <button
            onClick={() => onLoopRangeChange(0, null)}
            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border transition ${
              isCustomLoopActive
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 hover:bg-sky-500/30'
                : 'bg-neutral-800/80 text-neutral-400 border-neutral-700 hover:text-neutral-200'
            }`}
            title={
              isCustomLoopActive
                ? `Looping A (${effectiveLoopStart.toFixed(1)}) → B (${effectiveLoopEnd.toFixed(1)} PPQ). Click to reset A/B loop to full length.`
                : 'Drag the blue A and B flags on the top ruler to loop a specific bar region'
            }
          >
            {isCustomLoopActive
              ? `A/B ${effectiveLoopStart.toFixed(1)}–${effectiveLoopEnd.toFixed(1)} ✕`
              : 'A/B Loop'}
          </button>
        )}

        <div className="w-px h-3.5 bg-neutral-700 mx-1" />

        {/* Double and Halve Length Pills */}
        <button
          onClick={handleDoubleMidi}
          className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#d97706]/20 text-amber-400 hover:bg-[#d97706]/35 border border-amber-600/40 rounded transition"
          title="Double MIDI sequence length (2x)"
        >
          2x Double
        </button>
        <button
          onClick={handleHalveMidi}
          className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#d97706]/20 text-amber-400 hover:bg-[#d97706]/35 border border-amber-600/40 rounded transition"
          title="Halve MIDI sequence length (0.5x)"
        >
          0.5x Halve
        </button>

        <div className="w-px h-3.5 bg-neutral-700 mx-1" />

        {/* Draggable Length Indicator with Bars conversion */}
        {(() => {
          const barPpq = timeSigNumerator * (4 / timeSigDenominator);
          const barsCount = totalLengthPpq / barPpq;
          const barsDisplay = Number.isInteger(barsCount) ? barsCount : barsCount.toFixed(1);
          return (
            <div
              className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 px-1 select-none"
              title={`Total Sequence Length: ${totalLengthPpq} PPQ (${barsDisplay} Bars in ${timeSigNumerator}/${timeSigDenominator} time). Drag the orange END handle on the top ruler or use 2x/0.5x buttons to resize.`}
            >
              <MoveHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{totalLengthPpq} PPQ ({barsDisplay} {barsDisplay === 1 || barsDisplay === '1.0' ? 'Bar' : 'Bars'})</span>
            </div>
          );
        })()}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full flex-1 min-h-0 block cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      />

      {/* Right-click Context Menu */}
      {contextMenu && (() => {
        const targetIds =
          contextMenu.hitNoteId !== undefined
            ? selectedNoteIds.has(contextMenu.hitNoteId)
              ? selectedNoteIds
              : new Set([contextMenu.hitNoteId])
            : selectedNoteIds;
        const targetNotes = notes.filter((n) => targetIds.has(n.id));
        const hasTargetNotes = targetIds.size > 0;
        const allTargetsLocked = targetNotes.length > 0 && targetNotes.every((n) => n.locked);
        const someTargetsLocked = targetNotes.some((n) => n.locked);

        return (
          <div
            id="piano-roll-context-menu"
            className="fixed z-50 min-w-[220px] max-h-[calc(100vh-16px)] overflow-y-auto bg-[#1a1d29]/95 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 backdrop-blur-md text-xs font-mono select-none animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${Math.min(contextMenu.x, window.innerWidth - 250)}px`,
              top: `${Math.max(8, Math.min(contextMenu.y, window.innerHeight - 440))}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Info Pill */}
            <div className="px-2.5 py-1 text-[10px] text-slate-400 border-b border-slate-800 flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1 text-amber-300">
                <Music className="w-3 h-3 text-amber-400" />
                {getNoteName(contextMenu.targetPitch % 12)}{Math.floor(contextMenu.targetPitch / 12) - 1} · {contextMenu.targetPpq.toFixed(2)} PPQ
              </span>
              <button
                onClick={() => setContextMenu(null)}
                className="text-slate-500 hover:text-white p-0.5 rounded transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="py-1 flex flex-col gap-0.5">
              {/* Add Note & Delete Note */}
              <button
                onClick={handleAddNote}
                className="w-full px-2.5 py-1.5 text-left text-slate-100 hover:bg-sky-500 hover:text-slate-950 rounded-lg flex items-center gap-2 transition font-bold"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  Add Note ({getNoteName(contextMenu.targetPitch % 12)}{Math.floor(contextMenu.targetPitch / 12) - 1})
                </span>
              </button>

              <button
                onClick={handleDeleteSelected}
                disabled={!hasTargetNotes}
                className="w-full px-2.5 py-1.5 text-left text-rose-400 hover:bg-rose-500/20 disabled:opacity-35 disabled:hover:bg-transparent rounded-lg flex items-center justify-between gap-2 transition font-semibold"
                title="Delete selected or right-clicked note(s)"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    Delete Note{targetIds.size > 1 ? `s (${targetIds.size})` : ''}
                  </span>
                </span>
                <span className="text-[10px] text-rose-400/70 font-mono">⌫</span>
              </button>

              <div className="h-px bg-slate-800 my-1" />

              {/* Cut / Copy / Paste Options */}
              <button
                onClick={handleCut}
                disabled={!hasTargetNotes}
                className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-700/80 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cut</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">⌘X</span>
              </button>

              <button
                onClick={handleCopy}
                disabled={!hasTargetNotes}
                className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-700/80 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">⌘C</span>
              </button>

              <button
                onClick={() => handlePaste()}
                disabled={clipboardRef.current.length === 0}
                className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-700/80 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2">
                  <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Paste</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">⌘V</span>
              </button>

              {/* Note manipulation options if hit note or selection exists */}
              {hasTargetNotes && (
                <>
                  <div className="h-px bg-slate-800 my-1" />

                  {!allTargetsLocked && (
                    <button
                      onClick={() => handleSetLockSelected(true)}
                      className="w-full px-2.5 py-1.5 text-left text-sky-300 hover:bg-sky-500/20 rounded-lg flex items-center justify-between gap-2 transition font-semibold"
                      title="Lock selected notes so they are preserved during random generation"
                    >
                      <span className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-sky-400" />
                        <span>
                          Lock Note{targetIds.size > 1 ? `s (${targetIds.size})` : ''}
                        </span>
                      </span>
                      <span className="text-[9px] text-sky-400/80 uppercase">Keep on Gen</span>
                    </button>
                  )}

                  {someTargetsLocked && (
                    <button
                      onClick={() => handleSetLockSelected(false)}
                      className="w-full px-2.5 py-1.5 text-left text-amber-300 hover:bg-amber-500/20 rounded-lg flex items-center gap-2 transition font-semibold"
                      title="Unlock selected notes so random generation replaces them normally"
                    >
                      <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Unlock Note{targetIds.size > 1 ? `s (${targetIds.size})` : ''}
                      </span>
                    </button>
                  )}

                  <div className="h-px bg-slate-800 my-1" />

                  <button
                    onClick={handleDuplicateSelected}
                    className="w-full px-2.5 py-1.5 text-left text-slate-300 hover:bg-slate-700/80 rounded-lg flex items-center gap-2 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Duplicate Note{targetIds.size > 1 ? `s (${targetIds.size})` : ''}</span>
                  </button>

                  <button
                    onClick={() => handleTransposeOctave(12)}
                    className="w-full px-2.5 py-1.5 text-left text-slate-300 hover:bg-slate-700/80 rounded-lg flex items-center gap-2 transition"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-slate-400" />
                    <span>Octave Up (+12 st)</span>
                  </button>

                  <button
                    onClick={() => handleTransposeOctave(-12)}
                    className="w-full px-2.5 py-1.5 text-left text-slate-300 hover:bg-slate-700/80 rounded-lg flex items-center gap-2 transition"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                    <span>Octave Down (-12 st)</span>
                  </button>

                  <div className="h-px bg-slate-800 my-1" />

                  {/* Quick Note Duration / Length Presets */}
                  <div className="px-2.5 py-1 flex items-center justify-between">
                    <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider">
                      Note Length
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      or drag note edge
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 px-1.5 pb-1">
                    {[
                      { label: '1/16', ppq: 0.25 },
                      { label: '1/8', ppq: 0.5 },
                      { label: '1/4', ppq: 1.0 },
                      { label: '1/2', ppq: 2.0 },
                      { label: '1 Bar', ppq: 4.0 },
                      { label: '2 Bars', ppq: 8.0 },
                      { label: '2x ⇥', factor: 2.0 },
                      { label: '0.5x ⇤', factor: 0.5 },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (item.factor) handleMultiplyDuration(item.factor);
                          else if (item.ppq) handleSetDuration(item.ppq);
                        }}
                        className="px-1.5 py-1 text-[9.5px] font-mono font-bold bg-[#14161b] hover:bg-amber-500 hover:text-black text-neutral-300 rounded border border-neutral-700/80 transition text-center shadow-xs"
                        title={item.factor ? `Multiply duration by ${item.factor}x` : `Set duration to ${item.label} (${item.ppq} PPQ)`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

            <div className="h-px bg-slate-800 my-1" />

            <button
              onClick={handleSelectAll}
              className="w-full px-2.5 py-1.5 text-left text-slate-300 hover:bg-slate-700/80 rounded-lg flex items-center gap-2 transition"
            >
              <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Select All Notes</span>
            </button>

            {notes.some((n) => n.locked) && (
              <button
                onClick={handleUnlockAllLocked}
                className="w-full px-2.5 py-1.5 text-left text-sky-300 hover:bg-sky-500/15 rounded-lg flex items-center gap-2 transition"
              >
                <Unlock className="w-3.5 h-3.5 text-sky-400" />
                <span>Unlock All Locked ({notes.filter((n) => n.locked).length})</span>
              </button>
            )}

            {selectedNoteIds.size > 0 && (
              <button
                onClick={handleDeselectAll}
                className="w-full px-2.5 py-1.5 text-left text-slate-400 hover:bg-slate-700/80 rounded-lg flex items-center gap-2 transition"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
                <span>Deselect ({selectedNoteIds.size})</span>
              </button>
            )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
