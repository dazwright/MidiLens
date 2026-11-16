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
  { value: 'up-down', label: 'Up/Dn', iconSymbol: '▲▼' },
  { value: 'down-up', label: 'Dn/Up', iconSymbol: '▼▲' },
  { value: 'random', label: 'Rand', iconSymbol: '🎲' },
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
    <div className="w-full shrink-0 bg-[#181a1e] border-2 border-black/90 rounded-md p-2.5 shadow-2xl text-neutral-200 font-mono space-y-2 chassis-bevel">
      {/* Top Channel Header & Master Industrial Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b-2 border-black/80 pb-2 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Heavy Rocker / Latch Button */}
          <button
            onClick={() => onParamsChange((p) => ({ ...p, arpEnabled: !p.arpEnabled }))}
            className={`px-3 py-1 rounded font-bold text-xs flex items-center gap-2 transition uppercase tracking-wider border shrink-0 ${
              params.arpEnabled
                ? 'bg-[#d97706] text-black border-amber-300 shadow-[0_0_12px_rgba(217,119,6,0.7)] font-black'
                : 'hardware-button text-neutral-300'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${params.arpEnabled ? 'fill-current' : ''}`} />
            <span>{params.arpEnabled ? 'ARP CIRCUIT: ENGAGED' : 'ENGAGE ARPEGGIATOR'}</span>
          </button>
          <span className="silkscreen-label text-neutral-400">
            {params.arpEnabled
              ? 'REAL-TIME PATTERN GENERATOR ACTIVE'
              : 'HARDWARE BYPASS MODE'}
          </span>
        </div>

        {/* Industrial Action Button: Apply to Sequence */}
        <button
          onClick={onApplyArpToSequence}
          className="hardware-button px-3 py-1 text-xs font-bold text-amber-400 border border-amber-600/50 rounded flex items-center gap-1.5 shadow shrink-0"
          title="Print current arpeggio pattern directly into the Piano Roll sequence"
        >
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="tracking-wider uppercase text-[10px]">Print Arp to Roll</span>
        </button>
      </div>

      {/* Segmented Stepped Selectors: Stamped Recessed Wells */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        {/* Module 1: Stepped Pattern Mode Selector */}
        <div className="flex flex-col space-y-1.5 rack-recess p-2 rounded min-w-0">
          <span className="silkscreen-label flex items-center gap-1">
            <Play className="w-2.5 h-2.5 text-amber-500 shrink-0" /> PATTERN MODE
          </span>
          <div className="grid grid-cols-3 gap-1">
            {ARP_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => onParamsChange((p) => ({ ...p, arpMode: m.value }))}
                className={`py-1 px-1 text-[9px] font-bold rounded uppercase tracking-wider transition text-center border whitespace-nowrap ${
                  params.arpMode === m.value
                    ? 'bg-[#d97706] text-black border-amber-400 shadow-[0_0_8px_rgba(217,119,6,0.5)] font-black'
                    : 'bg-[#181a1d] text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Module 2: Stepped Rate / Division Selector */}
        <div className="flex flex-col space-y-1.5 rack-recess p-2 rounded min-w-0">
          <span className="silkscreen-label flex items-center gap-1">
            <Gauge className="w-2.5 h-2.5 text-amber-500 shrink-0" /> RATE / CLOCK
          </span>
          <div className="grid grid-cols-3 gap-1">
            {ARP_RATES.map((r) => (
              <button
                key={r}
                onClick={() => onParamsChange((p) => ({ ...p, arpRate: r }))}
                className={`py-1 px-1 text-[9px] font-bold rounded uppercase tracking-wider transition text-center border whitespace-nowrap ${
                  params.arpRate === r
                    ? 'bg-[#d97706] text-black border-amber-400 shadow-[0_0_8px_rgba(217,119,6,0.5)] font-black'
                    : 'bg-[#181a1d] text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Module 3: Stepped Octave Range Selector */}
        <div className="flex flex-col space-y-1.5 rack-recess p-2 rounded min-w-0">
          <span className="silkscreen-label flex items-center gap-1">
            <Layers className="w-2.5 h-2.5 text-amber-500 shrink-0" /> OCTAVE RANGE
          </span>
          <div className="grid grid-cols-4 gap-1">
            {ARP_OCTAVES.map((oct) => (
              <button
                key={oct}
                onClick={() => onParamsChange((p) => ({ ...p, arpOctaves: oct }))}
                className={`py-1.5 px-1 text-[9px] font-bold rounded uppercase tracking-wider transition text-center border whitespace-nowrap ${
                  params.arpOctaves === oct
                    ? 'bg-[#d97706] text-black border-amber-400 shadow-[0_0_8px_rgba(217,119,6,0.5)] font-black'
                    : 'bg-[#181a1d] text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {oct}x
              </button>
            ))}
          </div>
        </div>

        {/* Module 4: Analog Gate Potentiometer / Slider */}
        <div className="flex flex-col justify-between space-y-1.5 rack-recess p-2 rounded min-w-[160px]">
          <div className="flex items-center justify-between silkscreen-label">
            <span className="flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" /> GATE DURATION
            </span>
            <span className="text-amber-400 font-mono font-bold text-[10px]">{Math.round(params.arpGate * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={params.arpGate}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onParamsChange((p) => ({ ...p, arpGate: val }));
            }}
            className="w-full min-w-[120px] accent-amber-500 cursor-pointer h-2 bg-neutral-900 rounded-lg my-1 shrink-0"
          />
          <div className="flex justify-between text-[8px] text-neutral-500 font-mono">
            <span>STACCATO</span>
            <span>LEGATO</span>
          </div>
        </div>
      </div>
    </div>
  );
};
