import React from 'react';
import { PluginParameters, ArpMode, ArpRate, ArpOctaves } from '../types';
import { Zap, Play, Layers, Gauge, Sparkles, Wand2 } from 'lucide-react';

interface ArpeggiatorControlsProps {
  params: PluginParameters;
  onParamsChange: (updater: (prev: PluginParameters) => PluginParameters) => void;
  onApplyArpToSequence: () => void;
}

const ARP_MODES: { value: ArpMode; label: string; iconSymbol: string }[] = [
  { value: 'up', label: 'Up', iconSymbol: '▲' },
  { value: 'down', label: 'Down', iconSymbol: '▼' },
  { value: 'up-down', label: 'Up/Down', iconSymbol: '▲▼' },
  { value: 'down-up', label: 'Down/Up', iconSymbol: '▼▲' },
  { value: 'random', label: 'Random', iconSymbol: '🎲' },
  { value: 'chord', label: 'Strum', iconSymbol: '🎸' },
];

const ARP_RATES: ArpRate[] = ['1/4', '1/8', '1/16', '1/32', '1/8T', '1/16T'];
const ARP_OCTAVES: ArpOctaves[] = [1, 2, 3, 4];

export const ArpeggiatorControls: React.FC<ArpeggiatorControlsProps> = ({
  params,
  onParamsChange,
  onApplyArpToSequence,
}) => {
  return (
    <div className="w-full bg-[#181b28] border border-amber-500/30 rounded-2xl p-4 shadow-xl text-slate-200 font-mono space-y-3.5 animate-in fade-in duration-200">
      {/* Top Header & Master Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onParamsChange((p) => ({ ...p, arpEnabled: !p.arpEnabled }))}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-lg ${
              params.arpEnabled
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Zap className={`w-4 h-4 ${params.arpEnabled ? 'fill-current' : ''}`} />
            <span>{params.arpEnabled ? 'ARP ACTIVE' : 'ENABLE ARPEGGIATOR'}</span>
          </button>
          <span className="text-[10px] text-slate-400">
            {params.arpEnabled
              ? 'Arpeggiating notes in real time during playback'
              : 'Turn on to arpeggiate incoming notes'}
          </span>
        </div>

        {/* Apply Arp to Sequence Button */}
        <button
          onClick={onApplyArpToSequence}
          className="px-3 py-1.5 text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          title="Bake current arpeggiator pattern directly into the Piano Roll sequence"
        >
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Apply Arp to Piano Roll</span>
        </button>
      </div>

      {/* Arpeggiator Parameter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Mode Selector */}
        <div className="flex flex-col space-y-1.5 bg-[#12141f] p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 font-semibold flex items-center gap-1">
            <Play className="w-3 h-3 text-amber-400" /> Pattern Mode
          </span>
          <div className="grid grid-cols-3 gap-1">
            {ARP_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => onParamsChange((p) => ({ ...p, arpMode: m.value }))}
                className={`py-1 px-1 text-[10px] font-bold rounded transition border text-center ${
                  params.arpMode === m.value
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rate / Division Selector */}
        <div className="flex flex-col space-y-1.5 bg-[#12141f] p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 font-semibold flex items-center gap-1">
            <Gauge className="w-3 h-3 text-sky-400" /> Rate / Division
          </span>
          <div className="grid grid-cols-3 gap-1">
            {ARP_RATES.map((r) => (
              <button
                key={r}
                onClick={() => onParamsChange((p) => ({ ...p, arpRate: r }))}
                className={`py-1 text-[10px] font-bold rounded transition border text-center ${
                  params.arpRate === r
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Octave Range Selector */}
        <div className="flex flex-col space-y-1.5 bg-[#12141f] p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-400 font-semibold flex items-center gap-1">
            <Layers className="w-3 h-3 text-emerald-400" /> Octave Range
          </span>
          <div className="grid grid-cols-4 gap-1">
            {ARP_OCTAVES.map((oct) => (
              <button
                key={oct}
                onClick={() => onParamsChange((p) => ({ ...p, arpOctaves: oct }))}
                className={`py-1 text-[10px] font-bold rounded transition border text-center ${
                  params.arpOctaves === oct
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {oct} Oct
              </button>
            ))}
          </div>
        </div>

        {/* Gate Length Control */}
        <div className="flex flex-col space-y-1.5 bg-[#12141f] p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-semibold">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" /> Gate Length
            </span>
            <span className="text-purple-300 font-bold">{Math.round(params.arpGate * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={params.arpGate}
            onChange={(e) => onParamsChange((p) => ({ ...p, arpGate: parseFloat(e.target.value) }))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400 mt-1"
          />
          <div className="flex gap-1 justify-between mt-1">
            {[0.25, 0.5, 0.75, 1.0].map((g) => (
              <button
                key={g}
                onClick={() => onParamsChange((p) => ({ ...p, arpGate: g }))}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                  params.arpGate === g
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {g * 100}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
