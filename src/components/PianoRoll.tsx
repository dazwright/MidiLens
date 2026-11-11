import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MidiNote, ScaleType } from '../types';
import { isPitchInScale, snapPitchToScale, getVelocityColor } from '../scaleUtils';
import { getNoteName } from '../keyDetection';
import {
  ZoomIn,
  ZoomOut,
  MoveHorizontal,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  X,
  Music,
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
  selectedNoteIds?: Set<number>;
  onNotesChange: (notes: MidiNote[]) => void;
  onSeek: (ppq: number) => void;
  onLengthChange: (newLengthPpq: number) => void;
  onSelectedNotesChange?: (selectedIds: Set<number>) => void;
}

export const PianoRoll: React.FC<PianoRollProps> = ({
  notes,
  totalLengthPpq,
  playheadPpq,
  previewTranspose,
  scaleRoot,
  scaleType,
  scaleLock,
  selectedNoteIds: propSelectedNoteIds,
  onNotesChange,
  onSeek,
  onLengthChange,
  onSelectedNotesChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [internalSelectedNoteIds, setInternalSelectedNoteIds] = useState<Set<number>>(new Set());
  const selectedNoteIds = propSelectedNoteIds !== undefined ? propSelectedNoteIds : internalSelectedNoteIds;

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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

  // Pitch range auto-fit
  const minPitch = Math.max(12, Math.min(...notes.map((n) => n.pitch), 48) - 4);
  const maxPitch = Math.min(120, Math.max(...notes.map((n) => n.pitch), 72) + 4);

  const rulerHeight = 34;
  const pianoKeysWidth = 48;

  // Interaction tracking state
  const dragRef = useRef<{
    mode: 'none' | 'scrub' | 'move' | 'resize' | 'marquee' | 'dragLength';
    startX: number;
    startY: number;
    activeNoteId: number;
    initialPpq: number;
    initialPitch: number;
    initialDuration: number;
    initialLengthPpq: number;
    initialSelectedNotes: Map<number, { startPpq: number; pitch: number }>;
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
  });

  // Responsive canvas resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const basePixelsPerPpq = Math.max(30, (dimensions.width - pianoKeysWidth - 60) / Math.max(4, totalLengthPpq));
  const pixelsPerPpq = basePixelsPerPpq * zoomX;

  const pitchSpan = Math.max(1, maxPitch - minPitch + 1);
  const baseNoteHeight = Math.max(10, (dimensions.height - rulerHeight) / pitchSpan);
  const noteHeight = baseNoteHeight * zoomY;

  // Coordinate transforms
  const ppqToX = useCallback((ppq: number) => pianoKeysWidth + ppq * pixelsPerPpq, [pianoKeysWidth, pixelsPerPpq]);
  const xToPpq = useCallback((x: number) => Math.max(0, (x - pianoKeysWidth) / pixelsPerPpq), [pianoKeysWidth, pixelsPerPpq]);
  const pitchToY = useCallback((pitch: number) => rulerHeight + (maxPitch - pitch) * noteHeight, [rulerHeight, maxPitch, noteHeight]);
  const yToPitch = useCallback(
    (y: number) => Math.min(maxPitch, Math.max(minPitch, maxPitch - Math.floor((y - rulerHeight) / noteHeight))),
    [rulerHeight, maxPitch, minPitch, noteHeight]
  );

  // Keyboard shortcut for note deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNoteIds.size > 0) {
          e.preventDefault();
          const remaining = notes.filter((n) => !selectedNoteIds.has(n.id));
          updateSelectedNoteIds(new Set());
          onNotesChange(remaining);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteIds, notes, onNotesChange, updateSelectedNoteIds]);

  // Main Canvas Render with Scaler 3 / Riffer Modern Matte Aesthetic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const { width, height } = dimensions;

    // Background - Riffer style dark slate/blue matte
    ctx.fillStyle = '#161922';
    ctx.fillRect(0, 0, width, height);

    // Draw Pitch Lanes
    for (let p = minPitch; p <= maxPitch; p++) {
      const y = pitchToY(p);
      const semitone = p % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(semitone);
      const inScale = scaleType === 'chromatic' ? true : isPitchInScale(p, scaleRoot, scaleType);

      if (scaleType !== 'chromatic' && !inScale) {
        // Out-of-scale pitch lane: Darkened graphite with subtle diagonal hatch
        ctx.fillStyle = '#0f1118';
        ctx.fillRect(pianoKeysWidth, y, width - pianoKeysWidth, noteHeight);

        ctx.strokeStyle = '#181b26';
        ctx.lineWidth = 1;
        for (let hx = pianoKeysWidth; hx < width; hx += 18) {
          ctx.beginPath();
          ctx.moveTo(hx, y + noteHeight);
          ctx.lineTo(hx + 12, y);
          ctx.stroke();
        }
      } else {
        // In-scale pitch lane
        ctx.fillStyle = isBlack ? '#1b1e2a' : '#222634';
        ctx.fillRect(pianoKeysWidth, y, width - pianoKeysWidth, noteHeight);
      }

      // Pitch dividers
      const isC = semitone === 0;
      ctx.strokeStyle = isC ? '#475168' : inScale ? '#2b3143' : '#1c202d';
      ctx.lineWidth = isC ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(pianoKeysWidth, y + noteHeight);
      ctx.lineTo(width, y + noteHeight);
      ctx.stroke();
    }

    // Draw Piano Key Column on Left (Scaler 3 style key strip)
    ctx.fillStyle = '#1b1e28';
    ctx.fillRect(0, rulerHeight, pianoKeysWidth, height - rulerHeight);

    for (let p = minPitch; p <= maxPitch; p++) {
      const y = pitchToY(p);
      const semitone = p % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(semitone);
      const inScale = scaleType === 'chromatic' ? true : isPitchInScale(p, scaleRoot, scaleType);

      if (isBlack) {
        ctx.fillStyle = inScale ? '#2a2f40' : '#181a24';
        ctx.fillRect(0, y, pianoKeysWidth - 14, noteHeight - 1);
      } else {
        ctx.fillStyle = inScale ? '#242836' : '#14161f';
        ctx.fillRect(0, y, pianoKeysWidth, noteHeight);

        ctx.strokeStyle = inScale ? '#3a4256' : '#222634';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(0, y, pianoKeysWidth, noteHeight);

        if (semitone === 0) {
          const octave = Math.floor(p / 12) - 1;
          ctx.fillStyle = inScale ? '#f1f5f9' : '#64748b';
          ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`C${octave}`, pianoKeysWidth - 5, y + noteHeight * 0.72);
        }
      }

      // Scale indicator dot on key
      if (scaleType !== 'chromatic') {
        ctx.fillStyle = inScale ? '#38bdf8' : '#334155';
        ctx.beginPath();
        ctx.arc(pianoKeysWidth - 7, y + noteHeight / 2, inScale ? 2.2 : 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Vertical Bar & Beat Grid
    const numBars = Math.ceil(totalLengthPpq / 4) + 2;
    for (let bar = 0; bar <= numBars; bar++) {
      const x = ppqToX(bar * 4);
      if (x > width) break;

      ctx.strokeStyle = '#3d465c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, rulerHeight);
      ctx.lineTo(x, height);
      ctx.stroke();

      for (let beat = 1; beat < 4; beat++) {
        const bx = x + beat * pixelsPerPpq;
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

    // Gray out area beyond sequence total length
    if (lengthX < width) {
      ctx.fillStyle = 'rgba(10, 12, 18, 0.55)';
      ctx.fillRect(lengthX, rulerHeight, width - lengthX, height - rulerHeight);
    }

    // Top Ruler (Scaler 3 style header strip)
    ctx.fillStyle = '#1e222e';
    ctx.fillRect(0, 0, width, rulerHeight);
    ctx.strokeStyle = '#333a4d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerHeight);
    ctx.lineTo(width, rulerHeight);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    for (let bar = 0; bar <= numBars; bar++) {
      const x = ppqToX(bar * 4);
      if (x > width) break;

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, rulerHeight - 12);
      ctx.lineTo(x, rulerHeight);
      ctx.stroke();

      ctx.fillText(`${bar + 1}`, x + 5, 21);

      for (let beat = 1; beat < 4; beat++) {
        const bx = x + beat * pixelsPerPpq;
        if (bx < width) {
          ctx.strokeStyle = '#475569';
          ctx.beginPath();
          ctx.moveTo(bx, rulerHeight - 6);
          ctx.lineTo(bx, rulerHeight);
          ctx.stroke();
        }
      }
    }

    // Draggable Length Handle on Ruler
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(lengthX - 11, 4, 22, 24, 5);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('END', lengthX, 19);

    // Draw Notes with Glowing Soft Blocks (Riffer style colorful cards)
    for (const note of notes) {
      const effectivePitch = Math.min(127, Math.max(0, note.pitch + previewTranspose));
      const inScale = scaleType === 'chromatic' ? true : isPitchInScale(effectivePitch, scaleRoot, scaleType);
      const x = ppqToX(note.startPpq);
      const w = Math.max(6, note.durationPpq * pixelsPerPpq);
      const y = pitchToY(effectivePitch);
      const isSelected = selectedNoteIds.has(note.id);

      const velColors = getVelocityColor(note.velocity);

      ctx.save();
      if (isSelected) {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
      } else if (inScale) {
        ctx.shadowColor = velColors.base;
        ctx.shadowBlur = 4;
      }

      ctx.fillStyle = inScale ? velColors.base : '#475569';
      ctx.beginPath();
      ctx.roundRect(x, y + 1, w, noteHeight - 2, 4);
      ctx.fill();
      ctx.restore();

      // Top highlight sheen
      ctx.fillStyle = velColors.highlight;
      ctx.fillRect(x + 2, y + 2, Math.max(1, w - 4), 1.5);

      // Border: Cyan if selected, velocity border otherwise
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(x - 1, y, w + 2, noteHeight);
      } else {
        ctx.strokeStyle = inScale ? velColors.border : '#334155';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // Out of scale warning icon/stripes on note if scaleLock is enabled
      if (!inScale) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + noteHeight - 3);
        ctx.lineTo(x + Math.min(w - 2, 12), y + 3);
        ctx.stroke();
      }

      // Note Name Label rendered directly on the note block
      if (w >= 12 && noteHeight >= 8) {
        const pc = ((effectivePitch % 12) + 12) % 12;
        const octave = Math.floor(effectivePitch / 12) - 1;
        const useFlats = [1, 3, 5, 8, 10].includes(scaleRoot);
        const noteLetter = getNoteName(pc, useFlats);
        const displayName = w >= 28 ? `${noteLetter}${octave}` : noteLetter;

        const fontSize = Math.min(10, Math.max(7, Math.floor(noteHeight - 3)));
        ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        // Dark shadow for high contrast on light velocity colors
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(0, 0, 0, 0.75)';
        ctx.fillText(displayName, x + 4, y + noteHeight / 2 + 1);

        // Main text
        ctx.fillStyle = isSelected ? '#0f172a' : '#f8fafc';
        ctx.fillText(displayName, x + 3.5, y + noteHeight / 2);
      }
    }

    // Draw Playhead (Laser line with glow)
    const playheadX = ppqToX(playheadPpq);
    if (playheadX >= pianoKeysWidth && playheadX <= width) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(playheadX - 2, rulerHeight, 5, height - rulerHeight);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, rulerHeight);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, rulerHeight - 14);
      ctx.lineTo(playheadX + 6, rulerHeight - 14);
      ctx.lineTo(playheadX, rulerHeight);
      ctx.closePath();
      ctx.fill();
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
  }, [
    dimensions,
    minPitch,
    maxPitch,
    totalLengthPpq,
    playheadPpq,
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
    pitchToY,
    ppqToX,
  ]);

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
    if (y <= rulerHeight && Math.abs(x - lengthHandleX) <= 14) {
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

    let hitNote: MidiNote | null = null;
    let hitNearEdge = false;

    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      const effPitch = n.pitch + previewTranspose;
      const nx = ppqToX(n.startPpq);
      const nw = Math.max(6, n.durationPpq * pixelsPerPpq);
      const ny = pitchToY(effPitch);

      if (x >= nx && x <= nx + nw && y >= ny && y <= ny + noteHeight) {
        hitNote = n;
        hitNearEdge = x >= nx + nw - 7;
        break;
      }
    }

    if (hitNote) {
      const isShift = e.shiftKey;
      const newSelected = new Set(selectedNoteIds);

      if (isShift) {
        if (newSelected.has(hitNote.id)) newSelected.delete(hitNote.id);
        else newSelected.add(hitNote.id);
      } else if (!newSelected.has(hitNote.id)) {
        newSelected.clear();
        newSelected.add(hitNote.id);
      }
      updateSelectedNoteIds(newSelected);

      // Snapshot starting coordinates for all selected notes so they move together
      const initialMap = new Map<number, { startPpq: number; pitch: number }>();
      notes.forEach((n) => {
        if (newSelected.has(n.id)) {
          initialMap.set(n.id, { startPpq: n.startPpq, pitch: n.pitch });
        }
      });

      dragRef.current = {
        mode: hitNearEdge ? 'resize' : 'move',
        startX: x,
        startY: y,
        activeNoteId: hitNote.id,
        initialPpq: hitNote.startPpq,
        initialPitch: hitNote.pitch,
        initialDuration: hitNote.durationPpq,
        initialLengthPpq: totalLengthPpq,
        initialSelectedNotes: initialMap,
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
        marquee: { x1: x, y1: y, x2: x, y2: y },
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragRef.current.mode === 'dragLength') {
      const rawPpq = xToPpq(x);
      const snappedLength = Math.max(4, Math.round(rawPpq * 2) / 2);
      onLengthChange(snappedLength);
    } else if (dragRef.current.mode === 'scrub') {
      onSeek(xToPpq(x));
    } else if (dragRef.current.mode === 'move' && dragRef.current.activeNoteId >= 0) {
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
      const currentPpq = xToPpq(x);
      const updated = notes.map((n) => {
        if (n.id === dragRef.current.activeNoteId) {
          const newDuration = Math.max(0.25, Math.round((currentPpq - n.startPpq) * 4) / 4);
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
    }
  };

  const handleMouseUp = () => {
    dragRef.current.mode = 'none';
    dragRef.current.marquee = undefined;
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
    const maxId = Math.max(0, ...notes.map((n) => n.id));
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
  ]);

  const handleDeleteSelected = useCallback(() => {
    const toDelete =
      contextMenu?.hitNoteId !== undefined
        ? selectedNoteIds.has(contextMenu.hitNoteId)
          ? selectedNoteIds
          : new Set([contextMenu.hitNoteId])
        : selectedNoteIds;

    if (toDelete.size > 0) {
      const remaining = notes.filter((n) => !toDelete.has(n.id));
      onNotesChange(remaining);
      updateSelectedNoteIds(new Set());
    }
    setContextMenu(null);
  }, [contextMenu, selectedNoteIds, notes, onNotesChange, updateSelectedNoteIds]);

  const handleDuplicateSelected = useCallback(() => {
    const toDup =
      contextMenu?.hitNoteId !== undefined
        ? selectedNoteIds.has(contextMenu.hitNoteId)
          ? selectedNoteIds
          : new Set([contextMenu.hitNoteId])
        : selectedNoteIds;

    if (toDup.size > 0) {
      let maxId = Math.max(0, ...notes.map((n) => n.id));
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
  }, [contextMenu, selectedNoteIds, notes, onNotesChange, updateSelectedNoteIds]);

  const handleTransposeOctave = useCallback(
    (semitones: number) => {
      const targetIds =
        contextMenu?.hitNoteId !== undefined
          ? selectedNoteIds.has(contextMenu.hitNoteId)
            ? selectedNoteIds
            : new Set([contextMenu.hitNoteId])
          : selectedNoteIds;

      if (targetIds.size > 0) {
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
    [contextMenu, selectedNoteIds, notes, onNotesChange]
  );

  const handleSelectAll = useCallback(() => {
    updateSelectedNoteIds(new Set(notes.map((n) => n.id)));
    setContextMenu(null);
  }, [notes, updateSelectedNoteIds]);

  const handleDeselectAll = useCallback(() => {
    updateSelectedNoteIds(new Set());
    setContextMenu(null);
  }, [updateSelectedNoteIds]);

  // Keyboard Shortcuts: Delete, Backspace, Cmd/Ctrl+A, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNoteIds.size > 0) {
          e.preventDefault();
          const remaining = notes.filter((n) => !selectedNoteIds.has(n.id));
          onNotesChange(remaining);
          updateSelectedNoteIds(new Set());
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        updateSelectedNoteIds(new Set(notes.map((n) => n.id)));
      } else if (e.key === 'Escape') {
        setContextMenu(null);
        updateSelectedNoteIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, selectedNoteIds, onNotesChange, updateSelectedNoteIds]);

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
    const oldLength = totalLengthPpq;
    const newLength = oldLength * 2;
    const maxId = Math.max(0, ...notes.map((n) => n.id));
    const duplicatedNotes = notes.map((n, i) => ({
      ...n,
      id: maxId + i + 1,
      startPpq: n.startPpq + oldLength,
    }));
    onNotesChange([...notes, ...duplicatedNotes]);
    onLengthChange(newLength);
  };

  const handleHalveMidi = () => {
    const newLength = Math.max(4, totalLengthPpq / 2);
    const filteredNotes = notes.filter((n) => n.startPpq < newLength);
    onNotesChange(filteredNotes);
    onLengthChange(newLength);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden rounded-xl border border-slate-700/60 bg-[#161922] shadow-inner focus:outline-none flex flex-col"
      tabIndex={0}
    >
      {/* Bottom Floating Scaler 3 / Riffer Mini-Toolbar */}
      <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 bg-[#1a1d28]/95 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-2xl backdrop-blur-md">
        {/* Zoom Controls */}
        <button
          onClick={() => setZoomX((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded transition"
          title="Zoom Out Time (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono font-bold text-slate-300 px-1">{Math.round(zoomX * 100)}%</span>
        <button
          onClick={() => setZoomX((z) => Math.min(3.5, Number((z + 0.2).toFixed(1))))}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded transition"
          title="Zoom In Time (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-slate-700 mx-1" />

        {/* Double and Halve Length Pills */}
        <button
          onClick={handleDoubleMidi}
          className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg transition"
          title="Double MIDI sequence length (2x)"
        >
          2x Double
        </button>
        <button
          onClick={handleHalveMidi}
          className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
          title="Halve MIDI sequence length (0.5x)"
        >
          0.5x Halve
        </button>

        <div className="w-px h-3.5 bg-slate-700 mx-1" />

        {/* Draggable Length Indicator */}
        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 px-1" title="Drag the orange END handle on the ruler to adjust length">
          <MoveHorizontal className="w-3.5 h-3.5 text-amber-400" />
          <span>{totalLengthPpq} PPQ</span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      />

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          id="piano-roll-context-menu"
          className="fixed z-50 min-w-[210px] bg-[#1a1d29]/95 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 backdrop-blur-md text-xs font-mono select-none animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.min(contextMenu.x, window.innerWidth - 230)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 280)}px`,
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
            {/* Add Note Button */}
            <button
              onClick={handleAddNote}
              className="w-full px-2.5 py-1.5 text-left text-slate-100 hover:bg-sky-500 hover:text-slate-950 rounded-lg flex items-center gap-2 transition font-bold"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Add Note ({getNoteName(contextMenu.targetPitch % 12)}{Math.floor(contextMenu.targetPitch / 12) - 1})
              </span>
            </button>

            {/* Note manipulation options if hit note or selection exists */}
            {(contextMenu.hitNoteId !== undefined || selectedNoteIds.size > 0) && (
              <>
                <button
                  onClick={handleDuplicateSelected}
                  className="w-full px-2.5 py-1.5 text-left text-slate-300 hover:bg-slate-700/80 rounded-lg flex items-center gap-2 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Duplicate Note{selectedNoteIds.size > 1 ? `s (${selectedNoteIds.size})` : ''}</span>
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

                <button
                  onClick={handleDeleteSelected}
                  className="w-full px-2.5 py-1.5 text-left text-rose-400 hover:bg-rose-500/20 rounded-lg flex items-center gap-2 transition font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    Delete Note{selectedNoteIds.size > 1 ? `s (${selectedNoteIds.size})` : ''}
                  </span>
                </button>
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
      )}
    </div>
  );
};
