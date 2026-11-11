import React, { useEffect, useRef, useState } from 'react';
import { detectChordFromPitches, ChordAnalysisResult } from '../chordDetector';
import { getNoteName } from '../keyDetection';
import { synthAudioEngine } from '../audioEngine';
import { MidiNote, ScaleType } from '../types';
import { Activity, Music, Sparkles, Volume2, Info } from 'lucide-react';

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
  scaleRoot,
  scaleType,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visualMode, setVisualMode] = useState<'realtime' | 'playhead' | 'selected'>('realtime');

  // Determine current pitches to analyze based on mode or active voices
  let targetPitches: number[] = [];
  let sourceLabel = 'Real-time Audio Output';

  if (activePitches.length > 0) {
    targetPitches = activePitches;
    sourceLabel = 'Real-time Playing Voices';
  } else if (selectedNoteIds.size > 0 && visualMode === 'selected') {
    targetPitches = sequenceNotes.filter((n) => selectedNoteIds.has(n.id)).map((n) => n.pitch);
    sourceLabel = `Selected Notes (${selectedNoteIds.size})`;
  } else {
    // Playhead note slice
    const playheadNotes = sequenceNotes.filter(
      (n) => playheadPpq >= n.startPpq && playheadPpq < n.startPpq + n.durationPpq
    );
    targetPitches = playheadNotes.map((n) => n.pitch);
    sourceLabel = `Playhead Position (${playheadPpq.toFixed(2)} PPQ)`;
  }

  // Detect Chord
  const chordResult: ChordAnalysisResult = detectChordFromPitches(targetPitches);

  // Active pitch class set
  const activePitchClasses = new Set(targetPitches.map((p) => ((p % 12) + 12) % 12));

  // Audio Oscilloscope & Spectrum Canvas Animation Loop
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

      ctx.clearRect(0, 0, width, height);

      // Background grid line
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (analyser && targetPitches.length > 0) {
        const bufferLength = analyser.frequencyBinCount;
        const timeData = new Uint8Array(bufferLength);
        const freqData = new Uint8Array(bufferLength);

        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        // 1. Render Spectrum Bars
        const barWidth = width / (bufferLength / 2);
        for (let i = 0; i < bufferLength / 2; i++) {
          const barHeight = (freqData[i] / 255) * (height - 10);
          const x = i * barWidth;
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, 'rgba(14, 165, 233, 0.15)');
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0.6)');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        }

        // 2. Render Waveform Oscilloscope Line
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
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
        ctx.shadowBlur = 0;
      } else {
        // Idle ambient subtle wave line
        const now = performance.now() * 0.002;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.beginPath();
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.05 + now) * 3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [targetPitches]);

  return (
    <div className="w-full bg-[#151824] border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-200 font-mono space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Visualizer Source Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              Real-time Harmonic Output & Chord Visualizer
            </h3>
            <span className="text-[10px] text-slate-400">
              Source: <strong className="text-amber-400">{sourceLabel}</strong>
            </span>
          </div>
        </div>

        {/* Source Selector Pills */}
        <div className="flex items-center gap-1 bg-[#1c202e] p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setVisualMode('realtime')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
              visualMode === 'realtime'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Live Output
          </button>
          <button
            onClick={() => setVisualMode('playhead')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
              visualMode === 'playhead'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Playhead Slice
          </button>
          <button
            onClick={() => setVisualMode('selected')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
              visualMode === 'selected'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Selection ({selectedNoteIds.size})
          </button>
        </div>
      </div>

      {/* Main Chord Badge + Interactive 12-Tone Pitch Wheel + Audio Spectrum Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Box 1: Big Detected Chord Name Display */}
        <div className="flex flex-col items-start justify-center p-4 bg-[#1b1e2c] border border-slate-700/70 rounded-xl space-y-2 shadow-inner min-h-[110px]">
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-1">
            <Music className="w-3 h-3 text-amber-400" />
            Detected Chord:
          </span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-extrabold text-amber-400 tracking-tight font-mono drop-shadow">
              {chordResult.fullName}
            </h2>
            {chordResult.isSlashChord && (
              <span className="text-xs text-sky-400 font-bold bg-sky-500/10 border border-sky-500/30 rounded px-1.5 py-0.5">
                Slash / Bass {chordResult.bassNote}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              {chordResult.quality}
            </span>
            {chordResult.intervals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                {chordResult.intervals.join(' - ')}
              </span>
            )}
          </div>
        </div>

        {/* Box 2: 12-Tone Interactive Pitch Class Ring */}
        <div className="flex flex-col items-center justify-center p-3 bg-[#1b1e2c] border border-slate-700/70 rounded-xl space-y-2 min-h-[110px]">
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-400" />
            12-Tone Harmonic Circle
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
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30 scale-105'
                        : 'bg-sky-500 text-slate-950 border-sky-300 shadow-md shadow-sky-500/30 scale-105'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                  title={`Click to audition ${noteName}`}
                >
                  <span>{noteName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Box 3: Real-time Audio Spectrum & Oscilloscope Canvas */}
        <div className="flex flex-col items-start justify-center p-3 bg-[#1b1e2c] border border-slate-700/70 rounded-xl space-y-1.5 min-h-[110px]">
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-emerald-400" />
            Audio Output Waveform & Spectrum
          </span>
          <div className="relative w-full h-16 bg-[#0f111a] rounded-lg border border-slate-800 overflow-hidden">
            <canvas ref={canvasRef} width={280} height={64} className="w-full h-full block" />
          </div>
        </div>
      </div>

      {/* Bottom Notes & Pitches Breakdown Bar */}
      {chordResult.pitchNames.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-[#1b1e2c] border border-slate-800 rounded-xl text-[11px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-semibold text-[10px] uppercase">Active Pitches:</span>
            {chordResult.pitchNames.map((name, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-amber-300 font-bold"
              >
                {name}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[10px]">
            <span>Root: <strong className="text-amber-400">{chordResult.rootNote}</strong></span>
            <span>Bass: <strong className="text-sky-400">{chordResult.bassNote}</strong></span>
            <span>Count: <strong className="text-slate-200">{targetPitches.length} Notes</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
