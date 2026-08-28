import { useState } from 'react';
import { FaCircleDot, FaPlus, FaXmark } from 'react-icons/fa6';

interface ArticleLike {
  id?: string | number;
  $id?: string;
  headline?: string;
}

interface Props {
  articles: ArticleLike[];
  value: string;
  onChange: (v: string) => void;
}

const RelatedPicker = ({ articles, value, onChange }: Props) => {
  const [search, setSearch] = useState('');
  const ids = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const toggle = (id: string | number | undefined) => {
    const sid = String(id);
    if (ids.includes(sid)) {
      onChange(ids.filter((i) => i !== sid).join(', '));
    } else if (ids.length < 3) {
      onChange([...ids, sid].join(', '));
    }
  };

  const pinned = articles.filter((a) => ids.includes(String(a.id ?? a.$id)));
  const filtered = articles
    .filter((a) => !ids.includes(String(a.id ?? a.$id)))
    .filter((a) => !search || (a.headline || '').toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="space-y-3">
      {pinned.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Selected</p>
          {pinned.map((a) => (
            <div key={String(a.id ?? a.$id)} className="flex items-center gap-2 bg-[#052962]/5 rounded-lg px-3 py-2 text-xs">
              <FaCircleDot className="text-[#052962] w-2.5 h-2.5 shrink-0" />
              <span className="flex-1 line-clamp-1 font-medium text-gray-800">{a.headline}</span>
              <button type="button" onClick={() => toggle(a.id ?? a.$id)} className="text-gray-400 hover:text-red-600 transition-colors">
                <FaXmark className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {ids.length < 3 && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full text-sm p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#052962]/20 focus:border-[#052962] bg-white"
          />
          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {filtered.map((a) => (
              <button
                key={String(a.id ?? a.$id)}
                type="button"
                onClick={() => toggle(a.id ?? a.$id)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-xs group"
              >
                <FaPlus className="text-gray-300 group-hover:text-[#052962] w-3 h-3 shrink-0 transition-colors" />
                <span className="line-clamp-1 text-gray-700">{a.headline}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-center text-[11px] text-gray-400 py-3">No articles found</p>}
          </div>
        </>
      )}
      <p className="text-[10px] text-gray-400">{ids.length}/3 selected</p>
    </div>
  );
};

export default RelatedPicker;
