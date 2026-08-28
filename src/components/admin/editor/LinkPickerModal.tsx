import { FaLink, FaXmark, FaNewspaper } from 'react-icons/fa6';

interface ArticleLike {
  $id?: string;
  id?: string | number;
  headline?: string;
  section?: string;
  pillar?: string;
  author?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  suggestions: ArticleLike[];
  aiSuggestions: ArticleLike[];
  onSuggest: () => void;
  suggesting: boolean;
  onSelect: (a: ArticleLike) => void;
}

const LinkPickerModal = ({ open, onClose, search, onSearchChange, suggestions, aiSuggestions, onSuggest, suggesting, onSelect }: Props) => {
  if (!open) return null;
  const display = aiSuggestions.length > 0 ? aiSuggestions : suggestions;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <FaLink className="text-[#052962]" /> Insert Internal Link
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
            <FaXmark className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <button
            onClick={onSuggest}
            disabled={suggesting}
            className="w-full py-2 bg-[#052962]/5 text-[#052962] text-xs font-bold rounded-lg hover:bg-[#052962]/10 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            type="button"
          >
            {suggesting ? 'Analyzing...' : 'AI Suggest Links'}
          </button>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search articles..."
            className="w-full text-sm p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#052962]/20 focus:border-[#052962]"
            autoFocus
          />
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {display.map((a) => (
              <button
                key={String(a.$id ?? a.id)}
                onClick={() => onSelect(a)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm group"
                type="button"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <FaNewspaper className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 line-clamp-1">{a.headline}</p>
                  <p className="text-[10px] text-gray-400">
                    {a.section || a.pillar} · {a.author}
                  </p>
                </div>
                {aiSuggestions.length > 0 && <span className="ml-auto text-[9px] bg-[#052962]/10 text-[#052962] px-1.5 py-0.5 rounded font-bold">AI</span>}
              </button>
            ))}
            {display.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No articles found</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkPickerModal;
