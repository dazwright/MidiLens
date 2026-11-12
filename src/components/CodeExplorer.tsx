import React, { useState } from 'react';
import { JUCE_CODE_FILES } from '../codeFiles';
import { CodeFileEntry } from '../types';
import JSZip from 'jszip';
import {
  FileCode,
  Download,
  Copy,
  Check,
  FolderTree,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFileEntry>(JUCE_CODE_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('MidiLens_JUCE_Project');

      for (const f of JUCE_CODE_FILES) {
        const isExec = f.path.endsWith('.sh') || f.path.endsWith('.command');
        folder?.file(f.path, f.content, {
          unixPermissions: isExec ? 0o755 : 0o644,
        });
      }

      const content = await zip.generateAsync({ type: 'blob', platform: 'UNIX' });
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

  const categories = Array.from(new Set(JUCE_CODE_FILES.map((f) => f.category)));

  return (
    <div className="flex flex-col lg:flex-row w-full h-[720px] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Left Sidebar: File Tree & Project Actions */}
      <div className="w-full lg:w-72 bg-zinc-900/90 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col justify-between">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-300">
                JUCE SOURCE TREE
              </span>
            </div>
            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
              {JUCE_CODE_FILES.length} files
            </span>
          </div>

          {/* Grouped File List */}
          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
            {categories.map((cat) => (
              <div key={cat} className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2 font-semibold">
                  {cat}
                </span>
                <div className="space-y-0.5">
                  {JUCE_CODE_FILES.filter((f) => f.category === cat).map((file) => {
                    const isSelected = file.filename === selectedFile.filename;
                    return (
                      <button
                        key={file.filename}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-xs font-mono transition ${
                          isSelected
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                            : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                          <span className="truncate">{file.filename}</span>
                        </div>
                        {file.language === 'cpp' && (
                          <span className="text-[9px] text-zinc-600 font-mono">C++</span>
                        )}
                        {file.language === 'cmake' && (
                          <span className="text-[9px] text-zinc-600 font-mono">CMake</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom ZIP Exporter */}
        <div className="p-3 bg-zinc-950/80 border-t border-zinc-800">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold text-xs rounded-lg shadow-lg shadow-amber-500/10 transition"
          >
            <Download className="w-4 h-4" />
            <span>{isZipping ? 'PACKAGING ZIP...' : 'DOWNLOAD JUCE PROJECT (.ZIP)'}</span>
          </button>
          <p className="text-[10px] text-zinc-500 text-center mt-2 font-mono">
            CMake + universal binary scripts ready for Xcode & Ninja
          </p>
        </div>
      </div>

      {/* Right Content Area: Code Viewer & Description */}
      <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
        {/* File Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-zinc-200">{selectedFile.filename}</span>
            <span className="text-xs font-mono text-zinc-500">/{selectedFile.path}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* File Rationale / Description Banner */}
        <div className="px-4 py-2 bg-zinc-900/40 border-b border-zinc-800/80 text-xs text-zinc-400 flex items-center gap-2 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{selectedFile.description}</span>
        </div>

        {/* Code Content with Line Numbers */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs text-zinc-300 leading-relaxed bg-[#0b0c0e]">
          <pre className="select-text">
            <code>
              {selectedFile.content.split('\n').map((line, idx) => (
                <div key={idx} className="table-row hover:bg-zinc-900/50">
                  <span className="table-cell select-none pr-4 text-right text-zinc-600 w-10">
                    {idx + 1}
                  </span>
                  <span className="table-cell whitespace-pre">{line}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};
