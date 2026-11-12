import React, { useState } from 'react';
import { MidiSequence, PluginParameters } from '../types';
import { serializeMidiFile } from '../midiParser';
import { arpeggiateNotes } from '../arpUtils';
import { isJuceNative, emitToJuce, uint8ArrayToBase64 } from '../juceBridge';
import { Download, FileMusic, X, Check, Layers, Disc, Settings2 } from 'lucide-react';

interface MidiExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sequence: MidiSequence;
  params: PluginParameters;
}

export const MidiExportModal: React.FC<MidiExportModalProps> = ({
  isOpen,
  onClose,
  sequence,
  params,
}) => {
  const [format, setFormat] = useState<0 | 1>(0);
  const [filename, setFilename] = useState(() => {
    const cleanName = (sequence.name || 'Midilens_Pattern').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${cleanName}.mid`;
  });
  const [includeTranspose, setIncludeTranspose] = useState(true);
  const [includeVelocity, setIncludeVelocity] = useState(true);
  const [includeArp, setIncludeArp] = useState(params.arpEnabled);

  if (!isOpen) return null;

  const handleExport = () => {
    let exportNotes = sequence.notes;

    // Apply Arpeggiator pattern if enabled and checked
    if (includeArp && (params.arpEnabled || includeArp)) {
      exportNotes = arpeggiateNotes(sequence.notes, sequence.totalLengthPpq, {
        mode: params.arpMode,
        rate: params.arpRate,
        octaves: params.arpOctaves,
        gate: params.arpGate,
      });
    }

    const exportSeq: MidiSequence = {
      ...sequence,
      notes: exportNotes,
    };

    const binaryData = serializeMidiFile(exportSeq, {
      format,
      transpose: includeTranspose ? params.transpose : 0,
      velocityScale: includeVelocity ? params.velocityScale : 1.0,
      velocityOffset: includeVelocity ? params.velocityOffset : 0,
      bpm: sequence.bpm,
      trackName: sequence.name,
    });

    const finalFilename = filename.endsWith('.mid') ? filename : `${filename}.mid`;

    if (isJuceNative()) {
      emitToJuce('nativeSaveMidi', {
        filename: finalFilename,
        base64: uint8ArrayToBase64(binaryData),
      });
      onClose();
      return;
    }

    const blob = new Blob([binaryData.buffer as ArrayBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#1b1e2c] border border-slate-700/80 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-5 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                Export MIDI File (.MID)
              </h3>
              <span className="text-[10px] text-slate-400">
                Save piano roll state to your local machine
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selection Cards (Type 0 vs Type 1) */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            MIDI Standard Format:
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Type 0 Button */}
            <button
              onClick={() => setFormat(0)}
              className={`p-3 rounded-xl border text-left flex flex-col space-y-1.5 transition ${
                format === 0
                  ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/40 text-slate-100'
                  : 'bg-[#12141f] border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5 text-amber-300">
                  <Disc className="w-3.5 h-3.5" /> Type 0
                </span>
                {format === 0 && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </div>
              <span className="text-[10px] text-slate-400 leading-tight">
                Single track chunk containing all notes, tempo &amp; meta events. Universal hardware compatibility.
              </span>
            </button>

            {/* Type 1 Button */}
            <button
              onClick={() => setFormat(1)}
              className={`p-3 rounded-xl border text-left flex flex-col space-y-1.5 transition ${
                format === 1
                  ? 'bg-sky-500/15 border-sky-500/60 ring-1 ring-sky-500/40 text-slate-100'
                  : 'bg-[#12141f] border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5 text-sky-300">
                  <Layers className="w-3.5 h-3.5" /> Type 1
                </span>
                {format === 1 && <Check className="w-3.5 h-3.5 text-sky-400" />}
              </div>
              <span className="text-[10px] text-slate-400 leading-tight">
                Multi-track format (Conductor tempo track + Note track). Recommended for DAWs (Ableton, Logic, FL).
              </span>
            </button>
          </div>
        </div>

        {/* Filename Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            File Name:
          </label>
          <div className="flex items-center gap-2 bg-[#12141f] border border-slate-700/80 rounded-xl px-3 py-2">
            <FileMusic className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-100 focus:outline-none w-full"
              placeholder="sequence_export.mid"
            />
          </div>
        </div>

        {/* Export Options Options Toggles */}
        <div className="space-y-2 bg-[#12141f] p-3 rounded-xl border border-slate-800 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
            <Settings2 className="w-3 h-3 text-slate-400" /> Options &amp; Transformations:
          </span>

          <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer py-0.5">
            <span>Include Transposition ({params.transpose >= 0 ? `+${params.transpose}` : params.transpose} st)</span>
            <input
              type="checkbox"
              checked={includeTranspose}
              onChange={(e) => setIncludeTranspose(e.target.checked)}
              className="accent-amber-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer py-0.5">
            <span>Include Velocity Scaling ({Math.round(params.velocityScale * 100)}%)</span>
            <input
              type="checkbox"
              checked={includeVelocity}
              onChange={(e) => setIncludeVelocity(e.target.checked)}
              className="accent-amber-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer py-0.5">
            <span>Bake Active Arpeggiator Pattern ({params.arpMode.toUpperCase()})</span>
            <input
              type="checkbox"
              checked={includeArp}
              onChange={(e) => setIncludeArp(e.target.checked)}
              className="accent-amber-500 rounded"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>Export .MID File</span>
          </button>
        </div>
      </div>
    </div>
  );
};
