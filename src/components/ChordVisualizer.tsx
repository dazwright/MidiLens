import React, { useEffect, useRef, useState } from 'react';
import { detectChordFromPitches, ChordAnalysisResult } from '../chordDetector';
import { synthAudioEngine } from '../audioEngine';
import { MidiNote, ScaleType } from '../types';
import { Activity, Music, Sparkles, Volume2 } from 'lucide-react';

interface ChordVisualizerProps {
  activePitches: number[];
  sequenceNotes: MidiNote[];
  playheadPpq: number;
  selectedNoteIds: Set<number>;
  scaleRoot: number;
  scaleType: ScaleType;
}

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const ChordVisualizer: React.FC<ChordVisualizerProps> = ({
  activePitches,
  sequenceNotes,
  playheadPpq,
  selectedNoteIds,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visualMode, setVisualMode] = useState<'realtime' | 'playhead' | 'selected'>('realtime');

  // Determine current pitches to analyze based on mode or active voices
  let targetPitches: number[] = [];
  let sourceLabel = 'REAL-TIME AUDIO';

  if (activePitches.length > 0) {
    targetPitches = activePitches;
    sourceLabel = 'LIVE CATHODE VOICES';
  } else if (selectedNoteIds.size > 0 && visualMode === 'selected') {
    targetPitches = sequenceNotes.filter((n) => selectedNoteIds.has(n.id)).map((n) => n.pitch);
    sourceLabel = `BUFFER SELECTION (${selectedNoteIds.size})`;
  } else {
    const playheadNotes = sequenceNotes.filter(
      (n) => playheadPpq >= n.startPpq && playheadPpq < n.startPpq + n.durationPpq
    );
    targetPitches = playheadNotes.map((n) => n.pitch);
    sourceLabel = `SWEEP SLICE (${playheadPpq.toFixed(2)} PPQ)`;
  }

  // Detect Chord
  const chordResult: ChordAnalysisResult = detectChordFromPitches(targetPitches);
  const activePitchClasses = new Set(targetPitches.map((p) => ((p % 12) + 12) % 12));

  // Analog Cathode Oscilloscope Canvas Animation Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const analyser = synthAudioEngine.getAnalyserNode();
      const width = canvas.width;
      const height = canvas.height;

      // Dark obsidian phosphor screen clear
      ctx.fillStyle = '#070d09';
      ctx.fillRect(0, 0, width, height);

      // CRT phosphor reticle grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      if (analyser && targetPitches.length > 0) {
        const bufferLength = analyser.frequencyBinCount;
        const timeData = new Uint8Array(bufferLength);
        const freqData = new Uint8Array(bufferLength);

        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        // 1. Phosphor Frequency Spectrum Trace
        const barWidth = width / (bufferLength / 2);
        for (let i = 0; i < bufferLength / 2; i++) {
          const barHeight = (freqData[i] / 255) * (height - 8);
          const x = i * barWidth;
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.1)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.55)');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 0.5, barHeight);
        }

        // 2. Oscilloscope Cathode Ray Waveform (Phosphor Green Glow)
        ctx.save();
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = '#10b981';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 10;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.restore();
      } else {
        // Idle ambient subtle harmonic trace line
        const now = performance.now() * 0.002;
        ctx.save();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        for (let x = 0; x < width; x += 3) {
          const y = height / 2 + Math.sin(x * 0.06 + now) * 2.5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [targetPitches]);

  return (
    <div className="w-full bg-[#181a1e] border-2 border-black/90 rounded-md p-3.5 shadow-2xl text-neutral-200 font-mono space-y-3 chassis-bevel">
      {/* Top Header & Visualizer Mode Stepped Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black/80 pb-2.5 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-black/60 border border-neutral-700/80 text-emerald-400 shadow-inner">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="silkscreen-label text-neutral-300 flex items-center gap-2">
              TELEMETRY & HARMONIC CRT DECK
            </h3>
            <span className="text-[10px] text-neutral-500 font-mono">
              CHANNEL: <strong className="text-amber-400">{sourceLabel}</strong>
            </span>
          </div>
        </div>

        {/* Segmented Rocker Mode Switch */}
        <div className="flex items-center bg-[#101214] p-0.5 rounded border border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
          <button
            onClick={() => setVisualMode('realtime')}
            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition ${
              visualMode === 'realtime'
                ? 'bg-[#d97706] text-black font-extrabold shadow-[0_0_8px_rgba(217,119,6,0.5)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Live Output
          </button>
          <button
            onClick={() => setVisualMode('playhead')}
            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition ${
              visualMode === 'playhead'
                ? 'bg-[#d97706] text-black font-extrabold shadow-[0_0_8px_rgba(217,119,6,0.5)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Playhead
          </button>
          <button
            onClick={() => setVisualMode('selected')}
            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition ${
              visualMode === 'selected'
                ? 'bg-[#d97706] text-black font-extrabold shadow-[0_0_8px_rgba(217,119,6,0.5)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Selection ({selectedNoteIds.size})
          </button>
        </div>
      </div>

      {/* Main CRT Screens Deck: 3 Recessed Phosphor Wells */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Screen 1: Bold Warm Amber 7-Segment CRT Readout */}
        <div className="flex flex-col items-start justify-center p-3.5 bg-[#070d09] crt-screen border-2 border-black/90 rounded space-y-1.5 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)] min-h-[110px]">
          <span className="silkscreen-label text-emerald-500/80 flex items-center gap-1.5">
            <Music className="w-3 h-3 text-amber-500" />
            DETECTED CHORD // CRT TUBE
          </span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-extrabold text-[#fbbf24] tracking-tight font-mono drop-shadow-[0_0_12px_rgba(245,158,11,0.65)]">
              {chordResult.fullName}
            </h2>
            {chordResult.isSlashChord && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-600/40 rounded px-1.5 py-0.5">
                BASS {chordResult.bassNote}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
            <span className="px-2 py-0.5 rounded bg-[#0e1710] text-emerald-400 font-bold border border-emerald-900/60">
              {chordResult.quality}
            </span>
            {chordResult.intervals.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 font-bold border border-amber-800/40">
                {chordResult.intervals.join(' - ')}
              </span>
            )}
          </div>
        </div>

        {/* Screen 2: 12-Tone Frequency Matrix Array */}
        <div className="flex flex-col items-center justify-center p-3 bg-[#070d09] crt-screen border-2 border-black/90 rounded space-y-2 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)] min-h-[110px]">
          <span className="silkscreen-label text-emerald-500/80 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            12-TONE FREQUENCY MATRIX
          </span>
          <div className="grid grid-cols-6 gap-1 w-full max-w-[220px]">
            {PITCH_CLASSES.map((noteName, pc) => {
              const isActive = activePitchClasses.has(pc);
              const isRoot = chordResult.rootNote === noteName;
              return (
                <button
                  key={pc}
                  onClick={() => synthAudioEngine.auditionNote(60 + pc, 0.75, 0.4)}
                  className={`py-1 rounded text-[10px] font-mono font-bold transition flex flex-col items-center justify-center border ${
                    isActive
                      ? isRoot
                        ? 'bg-[#d97706] text-black border-amber-400 shadow-[0_0_10px_rgba(217,119,6,0.8)] scale-105'
                        : 'bg-[#10b981] text-black border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-105'
                      : 'bg-[#0b120d] text-emerald-800 border-emerald-950/80 hover:bg-[#121c15] hover:text-emerald-400'
                  }`}
                  title={`Trigger tone generator: ${noteName}`}
                >
                  <span>{noteName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Screen 3: Phosphor Oscilloscope Cathode Ray Tube */}
        <div className="flex flex-col items-start justify-center p-3 bg-[#070d09] crt-screen border-2 border-black/90 rounded space-y-1.5 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)] min-h-[110px]">
          <span className="silkscreen-label text-emerald-500/80 flex items-center gap-1.5">
            <Volume2 className="w-3 h-3 text-emerald-400" />
            ANALOG HARMONIC SCOPE
          </span>
          <div className="relative w-full h-16 bg-[#040705] rounded border border-emerald-950/60 overflow-hidden shadow-inner">
            <canvas ref={canvasRef} width={280} height={64} className="w-full h-full block" />
          </div>
        </div>
      </div>

      {/* Bottom Notes & Pitches Telemetry Strip */}
      {chordResult.pitchNames.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 bg-[#101215] border border-neutral-700/80 rounded text-[10px] shadow-inner">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="silkscreen-label text-neutral-400">ACTIVE PITCHES:</span>
            {chordResult.pitchNames.map((name, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded bg-black/80 border border-emerald-900/80 font-mono text-emerald-400 font-bold"
              >
                {name}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-neutral-400 text-[10px]">
            <span>ROOT: <strong className="text-amber-400">{chordResult.rootNote}</strong></span>
            <span>BASS: <strong className="text-emerald-400">{chordResult.bassNote}</strong></span>
            <span>VOICES: <strong className="text-neutral-200">{targetPitches.length}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
