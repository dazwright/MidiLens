import React, { useState } from 'react';
import { PluginSimulator } from './components/PluginSimulator';
import { CodeExplorer } from './components/CodeExplorer';
import { LogicProGuide } from './components/LogicProGuide';
import { JUCE_CODE_FILES } from './codeFiles';
import JSZip from 'jszip';
import {
  Radio,
  Sliders,
  Code2,
  BookOpen,
  Download,
  Sparkles,
  Layers,
  Music,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'guide'>('simulator');
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('MidiLens_JUCE_Project');

      for (const f of JUCE_CODE_FILES) {
        folder?.file(f.path, f.content);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MidiLens_JUCE_Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error creating zip: ' + (err as Error).message);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200 antialiased">
      {/* Top Application Header (Scaler 3 / Riffer Inspired) */}
      <header className="border-b border-slate-800/80 bg-[#121520]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-slate-950 font-bold">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white font-mono">
                  MIDILENS
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold">
                  JUCE C++
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  AU MIDI FX (Logic Pro)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scale Lock &bull; Pitch/Timing Quantize &bull; Humanise &bull; Recursive Folder Search &bull; Lock-Free Audio DSP
              </p>
            </div>
          </div>

          {/* Quick Download Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/15 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'PACKAGING...' : 'DOWNLOAD JUCE PROJECT (.ZIP)'}</span>
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 border-t border-slate-800/60 pt-1.5 pb-1">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-mono font-semibold rounded-xl transition ${
              activeTab === 'simulator'
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Interactive Plugin Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-mono font-semibold rounded-xl transition ${
              activeTab === 'code'
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JUCE C++ Codebase ({JUCE_CODE_FILES.length} Files)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-mono font-semibold rounded-xl transition ${
              activeTab === 'guide'
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Logic Pro AU & auval Guide</span>
          </button>
        </div>
      </header>

      {/* Main App Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'simulator' && (
          <div className="w-full">
            <PluginSimulator />
          </div>
        )}

        {activeTab === 'code' && (
          <div>
            <CodeExplorer />
          </div>
        )}

        {activeTab === 'guide' && (
          <div>
            <LogicProGuide />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#121520] py-3.5 px-6 text-xs text-slate-500 font-mono flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-semibold">MIDI PREVIEWER JUCE C++ ENGINE</span>
          <span>&bull;</span>
          <span>Target: AU (aumf) &bull; VST3 &bull; CLAP</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>C++20</span>
          <span>JUCE 8.0.4</span>
          <span>Universal (Apple Silicon & Intel)</span>
        </div>
      </footer>
    </div>
  );
}
