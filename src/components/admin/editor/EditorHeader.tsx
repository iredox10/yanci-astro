import {
  FaArrowLeft,
  FaFloppyDisk,
  FaSpinner,
  FaEye,
  FaNewspaper,
  FaTable,
  FaWandMagicSparkles,
  FaExpand,
  FaCompress,
  FaGear,
} from 'react-icons/fa6';
import StatusBadge from './StatusBadge';

interface Props {
  title?: string;
  status: string;
  isDirty: boolean;
  lastSaved: Date | null;
  wordCount: number;
  uploading: boolean;
  isFullscreen: boolean;
  previewMode: string;
  aiLoading: boolean;
  onBack: () => void;
  onSave: () => void;
  onToggleFullscreen: () => void;
  onToggleSidebar: () => void;
  onAiSuggestions: () => void;
  setPreviewMode: (m: string) => void;
}

const EditorHeader = ({
  title,
  status,
  isDirty,
  lastSaved,
  wordCount,
  uploading,
  isFullscreen,
  previewMode,
  aiLoading,
  onBack,
  onSave,
  onToggleFullscreen,
  onToggleSidebar,
  onAiSuggestions,
  setPreviewMode,
}: Props) => {
  const modes = [
    { mode: 'write', label: 'Write', icon: FaNewspaper },
    { mode: 'preview', label: 'Preview', icon: FaEye },
    { mode: 'split', label: 'Split', icon: FaTable },
  ];

  const saveLabel = status === 'published' ? 'Publish' : 'Save';
  const canSave = isDirty || status === 'published';

  return (
    <header
      className={`shrink-0 bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between z-50 transition-all duration-300 ${isFullscreen ? 'h-0 py-0 border-none overflow-hidden opacity-0' : 'h-14'}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 shrink-0"
          title="Back to articles"
          type="button"
        >
          <FaArrowLeft className="w-4 h-4" />
        </button>
        <div className="h-6 w-px bg-gray-200 hidden sm:block shrink-0" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[160px] sm:max-w-[240px] md:max-w-[360px] lg:max-w-[500px]">
              {title || 'Untitled Article'}
            </h1>
            <StatusBadge status={status} className="shrink-0" />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 whitespace-nowrap">
            {lastSaved ? (
              <span className="text-green-600">Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ) : (
              <span>Not saved</span>
            )}
            {isDirty && <span className="text-amber-500 font-semibold">• Unsaved changes</span>}
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">
              {wordCount.toLocaleString()} words · {Math.max(1, Math.ceil(wordCount / 200))} min read
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <button
          onClick={onAiSuggestions}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold ${aiLoading ? 'text-[#c59d5f] animate-pulse' : 'text-gray-500 hover:bg-gray-100 hover:text-[#052962]'}`}
          title="AI Suggestions"
          type="button"
        >
          <FaWandMagicSparkles className="w-4 h-4" />
          <span className="hidden lg:inline">{aiLoading ? 'Thinking...' : 'AI'}</span>
        </button>

        <button
          onClick={onToggleFullscreen}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors hidden xl:flex"
          title={isFullscreen ? 'Exit focus mode' : 'Focus mode'}
          type="button"
        >
          {isFullscreen ? <FaCompress className="w-4 h-4" /> : <FaExpand className="w-4 h-4" />}
        </button>

        <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-0.5">
          {modes.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${previewMode === mode ? 'bg-white text-[#052962] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              type="button"
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        <button
          onClick={onToggleSidebar}
          className="xl:hidden p-2 rounded-lg transition-colors text-gray-500 hover:bg-gray-100"
          title="Settings"
          type="button"
        >
          <FaGear className="w-4 h-4" />
        </button>

        <button
          onClick={onSave}
          disabled={uploading || !canSave}
          className={`ml-1 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${canSave ? 'bg-[#052962] text-white hover:bg-[#052962]/90 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          type="button"
        >
          {uploading ? <FaSpinner className="animate-spin" /> : <FaFloppyDisk />}
          <span className="hidden sm:inline">{saveLabel}</span>
        </button>
      </div>
    </header>
  );
};

export default EditorHeader;
