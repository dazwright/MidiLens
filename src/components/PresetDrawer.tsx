import React, { useState, useEffect } from 'react';
import {
  MidiLensPreset,
  PresetSettings,
  FACTORY_PRESETS,
  loadUserPresets,
  saveUserPresets,
  loadFavoriteIds,
  saveFavoriteIds,
  createNewUserPreset,
  exportPresetsToJson,
  importPresetsFromJson,
} from '../presetManager';
import { getNoteName } from '../keyDetection';
import { SCALE_DEFINITIONS } from '../scaleUtils';
import {
  Search,
  Star,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  X,
  Sliders,
  Sparkles,
  Lock,
  Unlock,
  Radio,
  Bookmark,
} from 'lucide-react';

interface PresetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activePresetId: string;
  currentSettings: PresetSettings;
  onSelectPreset: (preset: MidiLensPreset) => void;
  onPresetSaved: (newPreset: MidiLensPreset) => void;
}

export const PresetDrawer: React.FC<PresetDrawerProps> = ({
  isOpen,
  onClose,
  activePresetId,
  currentSettings,
  onSelectPreset,
  onPresetSaved,
}) => {
  const [userPresets, setUserPresets] = useState<MidiLensPreset[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<'All' | 'Factory' | 'User' | 'Favorites'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState<'User' | 'Genre' | 'Groove'>('User');
  const [saveDescription, setSaveDescription] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setUserPresets(loadUserPresets());
    setFavoriteIds(loadFavoriteIds());
  }, []);

  if (!isOpen) return null;

  const allPresets = [...FACTORY_PRESETS, ...userPresets];

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = new Set(favoriteIds);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    setFavoriteIds(updated);
    saveFavoriteIds(updated);
  };

  const handleDeleteUserPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this custom preset?')) {
      const updated = userPresets.filter((p) => p.id !== id);
      setUserPresets(updated);
      saveUserPresets(updated);

      if (favoriteIds.has(id)) {
        const favs = new Set(favoriteIds);
        favs.delete(id);
        setFavoriteIds(favs);
        saveFavoriteIds(favs);
      }

      showToast('Preset deleted.');
    }
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;

    const newPreset = createNewUserPreset(saveName, saveCategory, saveDescription, currentSettings);
    const updated = [newPreset, ...userPresets];
    setUserPresets(updated);
    saveUserPresets(updated);

    onPresetSaved(newPreset);
    setShowSaveModal(false);
    setSaveName('');
    setSaveDescription('');
    showToast(`Preset "${newPreset.name}" saved!`);
  };

  const handleExportJson = () => {
    const jsonStr = exportPresetsToJson(userPresets.length > 0 ? userPresets : FACTORY_PRESETS);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MidiLens_Presets_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Presets exported to JSON file.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const imported = importPresetsFromJson(text);
        if (imported.length > 0) {
          const updated = [...imported, ...userPresets];
          setUserPresets(updated);
          saveUserPresets(updated);
          showToast(`Successfully imported ${imported.length} preset(s)!`);
        }
      } catch (err) {
        alert('Could not parse preset file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const filteredPresets = allPresets.filter((p) => {
    if (activeTab === 'Factory' && !p.isFactory) return false;
    if (activeTab === 'User' && p.isFactory) return false;
    if (activeTab === 'Favorites' && !favoriteIds.has(p.id)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.settings.scaleType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#1b1e2a] border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-slate-100 font-sans">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-50 bg-sky-500 text-slate-950 font-bold font-mono text-xs px-3 py-2 rounded-xl shadow-lg animate-in slide-in-from-top duration-150 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141722] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-slate-950">
              <Bookmark className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                MidiLens Preset Manager
              </h3>
              <p className="text-xs text-slate-400">
                Save & load scales, quantization strength, timing swing, and humanize parameters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Current Settings</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-[#171a24] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-[#0f1118] p-1 rounded-xl border border-slate-800 font-mono text-xs">
            {(['All', 'Factory', 'User', 'Favorites'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  activeTab === tab
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs bg-[#0f1118] px-3 py-1.5 rounded-xl border border-slate-800">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Search presets, scale, mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleExportJson}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
              title="Export presets to JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <label className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition cursor-pointer" title="Import presets JSON">
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
            </label>
          </div>
        </div>

        {/* Presets List Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPresets.length === 0 ? (
            <div className="col-span-2 p-12 text-center text-xs font-mono text-slate-500">
              No presets matching "{searchQuery}"
            </div>
          ) : (
            filteredPresets.map((preset) => {
              const isActive = preset.id === activePresetId;
              const isFav = favoriteIds.has(preset.id);
              const scaleName = SCALE_DEFINITIONS[preset.settings.scaleType]?.name || preset.settings.scaleType;
              const rootName = getNoteName(preset.settings.scaleRoot);

              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    onSelectPreset(preset);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition flex flex-col justify-between group ${
                    isActive
                      ? 'bg-sky-500/15 border-sky-500/50 shadow-md shadow-sky-500/10'
                      : 'bg-[#141722]/80 border-slate-800 hover:border-slate-700 hover:bg-[#191c29]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-slate-100 font-mono group-hover:text-sky-300 transition">
                          {preset.name}
                        </span>
                        {isActive && (
                          <span className="text-[9px] font-mono font-bold bg-sky-500 text-slate-950 px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{preset.description}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => toggleFavorite(preset.id, e)}
                        className={`p-1.5 rounded-lg transition ${
                          isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-600 hover:text-slate-300'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {!preset.isFactory && (
                        <button
                          onClick={(e) => handleDeleteUserPreset(preset.id, e)}
                          className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg transition"
                          title="Delete custom preset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Settings Breakdown Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-sky-300 border border-slate-700/60 font-bold">
                      {rootName} {scaleName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-amber-300 border border-slate-700/60 font-bold">
                      Grid: {preset.settings.quantizeGrid}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-purple-300 border border-slate-700/60">
                      Jitter: &plusmn;{preset.settings.humanizeVelRange}
                    </span>
                    {preset.settings.transpose !== 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        {preset.settings.transpose > 0 ? `+${preset.settings.transpose}` : preset.settings.transpose} st
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Save Preset Form Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#1b1e2a] border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl p-6 text-slate-100 font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white font-mono uppercase">Save Custom MidiLens Preset</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Preset Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Chill Minor Groove 8th"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f1118] border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Category:</label>
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value as 'User' | 'Genre' | 'Groove')}
                  className="w-full px-3 py-2 bg-[#0f1118] border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="User">User</option>
                  <option value="Genre">Genre</option>
                  <option value="Groove">Groove</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description:</label>
                <textarea
                  rows={2}
                  placeholder="Short note about scale, swing, or intended track type..."
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f1118] border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
