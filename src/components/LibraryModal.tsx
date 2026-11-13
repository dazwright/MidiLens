import React, { useState, useMemo } from 'react';
import { ScannedMidiFile } from '../types';
import {
  FolderSearch,
  Search,
  FolderOpen,
  FileMusic,
  X,
  Folder,
  FolderTree,
  Tag,
  ListFilter,
  ArrowUpDown,
  Dices,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Music,
  Check,
  Info,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedFiles: ScannedMidiFile[];
  savedFolderPaths?: string[];
  onSelectFile: (file: ScannedMidiFile, originalIndex: number) => void;
  activeFileIndex: number;
  onScanFolderClick: () => void;
  onRescanFolders?: () => void;
  onClearLibrary?: () => void;
  isScanning: boolean;
}

type ViewMode = 'explorer' | 'categories' | 'all';
type SortOption = 'name-asc' | 'name-desc' | 'folder-asc' | 'size-desc' | 'size-asc';

export interface FolderNode {
  path: string;
  name: string;
  filesCount: number;
  subfolders: FolderNode[];
  fileIndexes: number[];
}

export function detectCategoryTag(relativePath: string, name: string): string {
  const full = `${relativePath} ${name}`.toLowerCase();
  if (/\b(bass|sub|808|low|bottom|root)\b/i.test(full)) return 'Bass';
  if (/\b(chord|prog|key|keys|piano|pad|stab|rhodes|clav|organ|voicing)\b/i.test(full)) return 'Chords & Keys';
  if (/\b(melody|lead|hook|riff|solo|synth|vocal|theme|topline|counter)\b/i.test(full)) return 'Melody & Lead';
  if (/\b(drum|perc|hat|snare|kick|beat|groove|rhythm|fill|percussion|toploop)\b/i.test(full)) return 'Drums & Rhythm';
  if (/\b(arp|arpeggio|seq|sequence|run|pattern|ostinato)\b/i.test(full)) return 'Arps & Sequences';
  return 'General / Uncategorized';
}

export const CATEGORY_ICONS: Record<string, string> = {
  'Bass': '🎸',
  'Chords & Keys': '🎹',
  'Melody & Lead': '🎼',
  'Drums & Rhythm': '🥁',
  'Arps & Sequences': '🌀',
  'General / Uncategorized': '📁',
};

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  scannedFiles,
  savedFolderPaths = [],
  onSelectFile,
  activeFileIndex,
  onScanFolderClick,
  onRescanFolders,
  onClearLibrary,
  isScanning,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('explorer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [visibleCount, setVisibleCount] = useState(60);

  // Group files into folder dictionary (only computed when modal is open so startup/streaming stays instant)
  const { folderMap, folderList, categoryMap, categoryList } = useMemo(() => {
    if (!isOpen) {
      return {
        folderMap: {} as Record<string, { folderPath: string; folderName: string; fileIndexes: number[] }>,
        folderList: [] as { folderPath: string; folderName: string; fileIndexes: number[] }[],
        categoryMap: {} as Record<string, number[]>,
        categoryList: [] as string[],
      };
    }
    const fMap: Record<string, { folderPath: string; folderName: string; fileIndexes: number[] }> = {};
    const cMap: Record<string, number[]> = {
      'Bass': [],
      'Chords & Keys': [],
      'Melody & Lead': [],
      'Drums & Rhythm': [],
      'Arps & Sequences': [],
      'General / Uncategorized': [],
    };

    scannedFiles.forEach((file, idx) => {
      // Determine folder path
      const parts = file.relativePath.split('/');
      const folderPath = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Root Folder';
      const folderName = parts.length > 1 ? parts[parts.length - 2] : 'Root Folder';

      if (!fMap[folderPath]) {
        fMap[folderPath] = { folderPath, folderName, fileIndexes: [] };
      }
      fMap[folderPath].fileIndexes.push(idx);

      // Category detection
      const tag = detectCategoryTag(file.relativePath, file.name);
      if (!cMap[tag]) cMap[tag] = [];
      cMap[tag].push(idx);
    });

    const fList = Object.values(fMap).sort((a, b) => a.folderPath.localeCompare(b.folderPath));
    const cList = Object.keys(cMap).filter((cat) => cMap[cat].length > 0);

    return { folderMap: fMap, folderList: fList, categoryMap: cMap, categoryList: cList };
  }, [isOpen, scannedFiles]);

  // Filtered & Sorted File Items
  const processedFiles = useMemo(() => {
    if (!isOpen) return [];
    let items = scannedFiles.map((file, originalIndex) => ({
      file,
      originalIndex,
      category: detectCategoryTag(file.relativePath, file.name),
      folderPath: file.relativePath.includes('/')
        ? file.relativePath.split('/').slice(0, -1).join('/')
        : 'Root Folder',
    }));

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.file.name.toLowerCase().includes(q) ||
          item.file.relativePath.toLowerCase().includes(q)
      );
    }

    // Explorer Folder Filter
    if (viewMode === 'explorer' && selectedFolder !== 'ALL') {
      items = items.filter((item) => item.folderPath === selectedFolder);
    }

    // Category Filter
    if (viewMode === 'categories' && selectedCategory !== 'ALL') {
      items = items.filter((item) => item.category === selectedCategory);
    }

    // Sorting
    items.sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.file.name.localeCompare(b.file.name);
        case 'name-desc':
          return b.file.name.localeCompare(a.file.name);
        case 'folder-asc':
          return a.folderPath.localeCompare(b.folderPath) || a.file.name.localeCompare(b.file.name);
        case 'size-desc':
          return b.file.sizeBytes - a.file.sizeBytes;
        case 'size-asc':
          return a.file.sizeBytes - b.file.sizeBytes;
        default:
          return 0;
      }
    });

    return items;
  }, [isOpen, scannedFiles, searchQuery, selectedFolder, selectedCategory, sortOption, viewMode]);

  if (!isOpen) return null;

  // Pick random file from current filtered view
  const handleRandomFromCurrentView = () => {
    if (processedFiles.length === 0) return;
    const rand = Math.floor(Math.random() * processedFiles.length);
    const chosen = processedFiles[rand];
    onSelectFile(chosen.file, chosen.originalIndex);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-[#181a22] border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[88vh] max-h-[850px]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#12141c] border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <FolderSearch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white font-mono tracking-wide flex items-center gap-2">
                SCANNED MIDI ORGANISER
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {scannedFiles.length.toLocaleString()} files
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {savedFolderPaths.length > 0
                  ? `${savedFolderPaths.length} remembered folder${savedFolderPaths.length > 1 ? 's' : ''} · Organised by directory & category`
                  : 'Organised by folder directory, subpack hierarchy and musical categories'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onScanFolderClick}
              disabled={isScanning}
              className="hardware-button flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-400 rounded-xl font-mono uppercase tracking-wider transition shrink-0"
              title="Add more folders to your library (+)"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Folder</span>
            </button>
            {onRescanFolders && savedFolderPaths.length > 0 && (
              <button
                onClick={onRescanFolders}
                disabled={isScanning}
                className="hardware-button flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-emerald-300 hover:text-emerald-200 disabled:opacity-40 rounded-xl font-mono uppercase tracking-wider transition shrink-0"
                title="Re-check remembered folders for newly added MIDI files"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isScanning ? 'animate-spin' : ''}`} />
                <span>Rescan</span>
              </button>
            )}
            {onClearLibrary && scannedFiles.length > 0 && (
              <button
                onClick={onClearLibrary}
                className="px-2.5 py-1.5 text-[11px] text-neutral-400 hover:text-rose-300 bg-neutral-900/70 hover:bg-rose-950/40 border border-slate-700/80 rounded-xl font-mono uppercase tracking-wider transition shrink-0"
                title="Clear all remembered folders and scanned files from library"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher & Toolbar Bar */}
        <div className="p-3 bg-[#141620] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-[#0d0f17] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setViewMode('explorer');
                setVisibleCount(60);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition font-semibold ${
                viewMode === 'explorer'
                  ? 'bg-amber-500 text-black font-bold shadow-[0_2px_8px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Folder Directory ({folderList.length})</span>
            </button>

            <button
              onClick={() => {
                setViewMode('categories');
                setVisibleCount(60);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition font-semibold ${
                viewMode === 'categories'
                  ? 'bg-amber-500 text-black font-bold shadow-[0_2px_8px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Smart Categories</span>
            </button>

            <button
              onClick={() => {
                setViewMode('all');
                setVisibleCount(60);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition font-semibold ${
                viewMode === 'all'
                  ? 'bg-amber-500 text-black font-bold shadow-[0_2px_8px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flat List ({scannedFiles.length})</span>
            </button>
          </div>

          {/* Search, Sort & Random Controls */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d0f17] border border-slate-800 rounded-xl flex-1 focus-within:border-amber-500/50 transition">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Search file name, subfolder or tags..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(60);
                }}
                className="w-full bg-transparent text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0d0f17] border border-slate-800 rounded-xl px-2 py-1.5 text-xs font-mono text-slate-300 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="name-asc" className="bg-[#181a22]">Name (A-Z)</option>
                <option value="name-desc" className="bg-[#181a22]">Name (Z-A)</option>
                <option value="folder-asc" className="bg-[#181a22]">Folder Path</option>
                <option value="size-desc" className="bg-[#181a22]">Size (Largest)</option>
                <option value="size-asc" className="bg-[#181a22]">Size (Smallest)</option>
              </select>
            </div>

            {/* Random Pick in View */}
            <button
              onClick={handleRandomFromCurrentView}
              disabled={processedFiles.length === 0}
              className="hardware-button p-2 text-amber-400 hover:text-amber-300 rounded-xl transition disabled:opacity-40"
              title="Pick a random MIDI file from current view"
            >
              <Dices className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar for Explorer & Category modes */}
          {viewMode === 'explorer' && (
            <div className="w-64 sm:w-72 bg-[#12141c] border-r border-slate-800/80 overflow-y-auto p-2 flex flex-col gap-1 shrink-0">
              <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider flex items-center justify-between">
                <span>Folders ({folderList.length})</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onScanFolderClick}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition shadow-sm"
                    title="Add more folders to library (+)"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                  {selectedFolder !== 'ALL' && (
                    <button
                      onClick={() => setSelectedFolder('ALL')}
                      className="text-slate-400 hover:text-slate-200 text-[9px] hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedFolder('ALL');
                  setVisibleCount(60);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition text-left ${
                  selectedFolder === 'ALL'
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">All Folders</span>
                </div>
                <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                  {scannedFiles.length}
                </span>
              </button>

              <div className="my-1 border-t border-slate-800/60" />

              {folderList.map((f) => (
                <button
                  key={f.folderPath}
                  onClick={() => {
                    setSelectedFolder(f.folderPath);
                    setVisibleCount(60);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition text-left group ${
                    selectedFolder === f.folderPath
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                  }`}
                  title={f.folderPath}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">{f.folderName}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 font-mono shrink-0 ml-1">
                    {f.fileIndexes.length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {viewMode === 'categories' && (
            <div className="w-64 sm:w-72 bg-[#12141c] border-r border-slate-800/80 overflow-y-auto p-2 flex flex-col gap-1 shrink-0">
              <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                Categories Tagged
              </div>

              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setVisibleCount(60);
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition text-left ${
                  selectedCategory === 'ALL'
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">All Categories</span>
                </div>
                <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                  {scannedFiles.length}
                </span>
              </button>

              <div className="my-1 border-t border-slate-800/60" />

              {categoryList.map((cat) => {
                const count = categoryMap[cat]?.length || 0;
                const icon = CATEGORY_ICONS[cat] || '📁';
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setVisibleCount(60);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition text-left group ${
                      selectedCategory === cat
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-sm shrink-0">{icon}</span>
                      <span className="truncate">{cat}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-300 font-mono shrink-0 ml-1">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right File List Pane */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#181a24]">
            {/* Folder / Category Breadcrumb */}
            <div className="px-4 py-2 bg-[#141620]/80 border-b border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2 truncate">
                <span className="text-slate-500">View:</span>
                <span className="text-amber-400 font-semibold truncate">
                  {viewMode === 'explorer'
                    ? selectedFolder === 'ALL'
                      ? '📁 All Folders'
                      : `📁 ${selectedFolder}`
                    : viewMode === 'categories'
                    ? selectedCategory === 'ALL'
                      ? '🏷️ All Categories'
                      : `🏷️ ${selectedCategory}`
                    : '📋 All Files'}
                </span>
                <span className="text-slate-600">({processedFiles.length} items)</span>
              </div>

              {processedFiles.length > 0 && (
                <button
                  onClick={handleRandomFromCurrentView}
                  className="text-[10.5px] text-amber-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <Dices className="w-3 h-3" />
                  <span>Random in this view</span>
                </button>
              )}
            </div>

            {/* Scrollable File List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {scannedFiles.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono space-y-4 my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                    <FolderSearch className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-200 font-bold text-sm">No Scanned MIDI Files Loaded</p>
                    <p className="text-slate-400 text-xs max-w-md mx-auto">
                      Click <strong className="text-amber-400">"Scan Folder"</strong> above to scan your local computer's sample libraries and MIDI packs into MidiLens!
                    </p>
                  </div>
                  <button
                    onClick={onScanFolderClick}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs font-mono rounded-xl shadow-lg transition"
                  >
                    Select Folder to Scan
                  </button>
                </div>
              ) : processedFiles.length === 0 ? (
                <div className="p-10 text-center text-xs font-mono space-y-3">
                  <Info className="w-8 h-8 text-amber-400/60 mx-auto" />
                  <p className="text-slate-300 font-semibold">
                    No MIDI files matching "{searchQuery}" in this view.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedFolder('ALL');
                      setSelectedCategory('ALL');
                    }}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl transition"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <>
                  {processedFiles.slice(0, visibleCount).map((item) => {
                    const isActive = activeFileIndex === item.originalIndex;
                    return (
                      <button
                        key={item.originalIndex}
                        onClick={() => onSelectFile(item.file, item.originalIndex)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs font-mono transition group border ${
                          isActive
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold shadow-[0_2px_10px_rgba(245,158,11,0.2)]'
                            : 'bg-[#131520]/80 hover:bg-amber-500/10 hover:border-amber-500/30 border-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate min-w-0 flex-1">
                          <div
                            className={`p-2 rounded-lg shrink-0 transition ${
                              isActive
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-800/80 text-amber-400 group-hover:bg-amber-500/20'
                            }`}
                          >
                            <FileMusic className="w-4 h-4" />
                          </div>

                          <div className="truncate min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold truncate text-xs ${
                                  isActive
                                    ? 'text-amber-300'
                                    : 'text-slate-200 group-hover:text-amber-300'
                                }`}
                              >
                                {item.file.name}
                              </span>
                              {isActive && (
                                <span className="text-[9px] bg-amber-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded shrink-0">
                                  LOADED
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate mt-0.5">
                              <span className="truncate text-slate-400">{item.folderPath}</span>
                              <span>•</span>
                              <span className="text-amber-400/80 font-semibold">{item.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-3 text-[10px] text-slate-500 font-mono">
                          <span>{(item.file.sizeBytes / 1024).toFixed(1)} KB</span>
                          <div className="p-1 rounded bg-slate-800/50 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {processedFiles.length > visibleCount && (
                    <div className="p-3 text-center border-t border-slate-800/80 bg-[#131520]/40 rounded-xl mt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        Showing {visibleCount} of {processedFiles.length} items
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setVisibleCount((prev) => prev + 60)}
                          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono text-xs font-semibold rounded-xl border border-slate-700 transition"
                        >
                          Show +60 More
                        </button>
                        <button
                          onClick={() => setVisibleCount(processedFiles.length)}
                          className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-xs font-semibold rounded-xl border border-amber-500/40 transition"
                        >
                          Show All ({processedFiles.length})
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
