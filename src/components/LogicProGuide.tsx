import React, { useState } from 'react';
import { Terminal, ShieldCheck, CheckCircle2, Copy, Check, AlertTriangle, Cpu, Music2, Apple, Monitor, Package, FileCode } from 'lucide-react';

export const LogicProGuide: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'mac' | 'win'>('mac');

  const copyCommand = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full space-y-6 text-zinc-300">
      {/* Platform Switcher & Overview Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-zinc-900 to-zinc-900 border border-slate-700/80 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight font-mono">
                MidiLens Cross-Platform Installation & Build Guide
              </h2>
              <p className="text-xs text-zinc-400">
                How to compile and package installable AU (Logic Pro MIDI FX), VST3, and Standalone formats for macOS and Windows.
              </p>
            </div>
          </div>

          {/* OS Switcher Buttons */}
          <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setPlatform('mac')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                platform === 'mac'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>macOS (AU / VST3)</span>
            </button>
            <button
              onClick={() => setPlatform('win')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                platform === 'win'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Windows (VST3 / Standalone)</span>
            </button>
          </div>
        </div>
      </div>

      {platform === 'win' ? (
        /* Windows Steps */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                  1
                </span>
                <h3 className="text-sm font-bold text-white">Generate 64-bit Visual Studio Project</h3>
              </div>
              <button
                onClick={() =>
                  copyCommand('win1', `cmake -B build -G "Visual Studio 17 2022" -A x64 -DCMAKE_BUILD_TYPE=Release`)
                }
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
              >
                {copiedId === 'win1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'win1' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Configures the solution for Microsoft Visual Studio 2022 using the official MSVC 64-bit compiler.
            </p>
            <div className="p-3 bg-zinc-950 font-mono text-xs rounded-lg border border-zinc-800 text-amber-300 overflow-x-auto">
              <pre>{`cmake -B build -G "Visual Studio 17 2022" -A x64 -DCMAKE_BUILD_TYPE=Release`}</pre>
            </div>
          </div>

          <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                  2
                </span>
                <h3 className="text-sm font-bold text-white">Compile VST3 and Standalone (.exe)</h3>
              </div>
              <button
                onClick={() =>
                  copyCommand('win2', `cmake --build build --config Release --target MidiPreviewer_VST3 MidiPreviewer_Standalone`)
                }
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
              >
                {copiedId === 'win2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'win2' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Builds optimized Release binaries of the VST3 plugin bundle and the standalone executable.
            </p>
            <div className="p-3 bg-zinc-950 font-mono text-xs rounded-lg border border-zinc-800 text-amber-300 overflow-x-auto">
              <pre>{`cmake --build build --config Release --target MidiPreviewer_VST3 MidiPreviewer_Standalone`}</pre>
            </div>
          </div>

          <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                  3
                </span>
                <h3 className="text-sm font-bold text-white">Install into Windows VST3 Folder</h3>
              </div>
              <button
                onClick={() =>
                  copyCommand(
                    'win3',
                    `Copy-Item -Recurse -Force "build\\MidiPreviewer_artefacts\\Release\\VST3\\MidiLens.vst3" "C:\\Program Files\\Common Files\\VST3\\"`
                  )
                }
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
              >
                {copiedId === 'win3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'win3' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Copies the VST3 bundle to the universal Windows VST3 location where Cubase, Ableton, FL Studio, and Studio One scan plugins.
            </p>
            <div className="p-3 bg-zinc-950 font-mono text-xs rounded-lg border border-zinc-800 text-amber-300 overflow-x-auto">
              <pre>{`Copy-Item -Recurse -Force "build\\MidiPreviewer_artefacts\\Release\\VST3\\MidiLens.vst3" "C:\\Program Files\\Common Files\\VST3\\"`}</pre>
            </div>
          </div>

          <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                  4
                </span>
                <h3 className="text-sm font-bold text-white">Create Windows Installer (.exe) with Inno Setup</h3>
              </div>
              <button
                onClick={() =>
                  copyCommand(
                    'win4',
                    `iscc.exe installer.iss`
                  )
                }
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
              >
                {copiedId === 'win4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'win4' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Compiles an Inno Setup script into a standalone self-contained installer for end-users.
            </p>
            <div className="p-3 bg-zinc-950 font-mono text-xs rounded-lg border border-zinc-800 text-amber-300 overflow-x-auto">
              <pre>{`iscc.exe installer.iss\n# Output: MidiLens-Windows-Installer.exe`}</pre>
            </div>
          </div>
        </div>
      ) : (
        /* macOS Steps */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1: Universal Binary CMake Build */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                1
              </span>
              <h3 className="text-sm font-bold text-white">Universal Binary CMake Build</h3>
            </div>
            <button
              onClick={() =>
                copyCommand(
                  'step1',
                  `cmake -B build -G Xcode -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" -DCMAKE_OSX_DEPLOYMENT_TARGET="11.0"\ncmake --build build --config Release --target MidiPreviewer_AU MidiPreviewer_VST3`
                )
              }
              className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
            >
              {copiedId === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'step1' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Generates a Universal macOS binary containing native slices for both Apple Silicon (ARM64) and Intel (x86_64).
          </p>
          <div className="p-3 bg-zinc-950 font-mono text-xs rounded-lg border border-zinc-800 text-amber-300 overflow-x-auto">
            <pre>
{`cmake -B build -G Xcode \\
  -DCMAKE_BUILD_TYPE=Release \\
  -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" \\
  -DCMAKE_OSX_DEPLOYMENT_TARGET="11.0"

cmake --build build --config Release --target MidiPreviewer_AU MidiPreviewer_VST3`}
            </pre>
          </div>
        </div>

        {/* Step 2: Install to macOS Audio Plug-Ins */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                2
              </span>
              <h3 className="text-sm font-bold text-white">Deploy to User Components Directory</h3>
            </div>
            <button
              onClick={() =>
                copyCommand(
                  'step2',
                  `mkdir -p ~/Library/Audio/Plug-Ins/Components\ncp -R "build/MidiPreviewer_artefacts/Release/AU/MIDI Previewer.component" ~/Library/Audio/Plug-Ins/Components/`
                )
              }
              className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
            >
              {copiedId === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'step2' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Installs the Audio Unit into your user plug-in directory where macOS scans components automatically.
          </p>
          <div className="p-3 bg-zinc-950 font-mono text-xs rounded-lg border border-zinc-800 text-amber-300 overflow-x-auto">
            <pre>
{`mkdir -p ~/Library/Audio/Plug-Ins/Components
cp -R "build/MidiPreviewer_artefacts/Release/AU/MIDI Previewer.component" \\
      ~/Library/Audio/Plug-Ins/Components/`}
            </pre>
          </div>
        </div>

        {/* Step 3: Ad-Hoc Code Signing & Gatekeeper */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                3
              </span>
              <h3 className="text-sm font-bold text-white">Ad-Hoc Signing & Quarantine Removal</h3>
            </div>
            <button
              onClick={() =>
                copyCommand(
                  'step3',
                  `xattr -cr ~/Library/Audio/Plug-Ins/Components/"MIDI Previewer.component"\ncodesign --force --deep --sign - ~/Library/Audio/Plug-Ins/Components/"MIDI Previewer.component"`
                )
              }
              className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
            >
              {copiedId === 'step3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'step3' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Logic Pro runs in a strict sandbox on Apple Silicon. Without removing quarantine and ad-hoc signing, Logic blocks the binary.
          </p>
          <div className="p-3 bg-zinc-950 font-mono text-xs rounded-lg border border-zinc-800 text-amber-300 overflow-x-auto">
            <pre>
{`xattr -cr ~/Library/Audio/Plug-Ins/Components/"MIDI Previewer.component"
codesign --force --deep --sign - \\
  ~/Library/Audio/Plug-Ins/Components/"MIDI Previewer.component"`}
            </pre>
          </div>
        </div>

        {/* Step 4: Reset AudioComponentRegistrar & auval */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs">
                4
              </span>
              <h3 className="text-sm font-bold text-white">Cache Invalidation & Apple auval Test</h3>
            </div>
            <button
              onClick={() =>
                copyCommand('step4', `killall -9 AudioComponentRegistrar\nauval -v aumf MPrv Adsp`)
              }
              className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
            >
              {copiedId === 'step4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'step4' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Terminates the macOS caching daemon and executes Apple's official validation tool.
          </p>
          <div className="p-3 bg-zinc-950 font-mono text-xs rounded-lg border border-zinc-800 text-amber-300 overflow-x-auto">
            <pre>
{`killall -9 AudioComponentRegistrar
auval -v aumf MPrv Adsp`}
            </pre>
          </div>
        </div>
        </div>
      )}

      {/* Real-time Safety Audit & Zero-Latency Protocols */}
      <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">Audio Thread Safety & Zero-Latency Audit</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Zero Latency</span>
            </div>
            <p className="text-zinc-400">
              <code className="text-zinc-300">getLatencySamples()</code> returns strictly 0. No internal ring-buffering
              or lookahead latency is introduced into the DAW timeline.
            </p>
          </div>

          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Lock-Free Memory Fences</span>
            </div>
            <p className="text-zinc-400">
              Sequence snapshots are swapped via <code className="text-zinc-300">std::atomic_load/store</code> with
              acquire-release semantics. Audio thread never waits on message thread mutexes.
            </p>
          </div>

          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Polyphonic Note-Off Safety</span>
            </div>
            <p className="text-zinc-400">
              Active sounding notes are tracked in a fixed-size pool (<code className="text-zinc-300">std::array</code>).
              Loop wrap, scrub, and stop events dispatch immediate note-offs across all 16 MIDI channels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
