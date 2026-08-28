import { useState, useRef, useEffect } from 'react';
import { FaPlus, FaImage, FaMapLocationDot, FaQuoteLeft, FaCircleInfo, FaTable, FaCode, FaYoutube, FaXTwitter, FaTiktok, FaInstagram, FaLink } from 'react-icons/fa6';

interface Props {
  onInsert: (type: string) => void;
  isFullscreen?: boolean;
}

const BlockInserter = ({ onInsert, isFullscreen }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const groups = [
    {
      label: 'Rich Content',
      items: [
        { type: 'body-image', icon: FaImage, label: 'Image', color: 'text-blue-600' },
        { type: 'map', icon: FaMapLocationDot, label: 'Map', color: 'text-blue-600' },
        { type: 'quote', icon: FaQuoteLeft, label: 'Quote', color: 'text-[#c59d5f]' },
        { type: 'highlight', icon: FaCircleInfo, label: 'Highlight', color: 'text-amber-600' },
        { type: 'table', icon: FaTable, label: 'Table', color: 'text-gray-700' },
        { type: 'code', icon: FaCode, label: 'Code', color: 'text-green-600' },
      ],
    },
    {
      label: 'Media Embeds',
      items: [
        { type: 'youtube', icon: FaYoutube, label: 'YouTube', color: 'text-red-600' },
        { type: 'twitter', icon: FaXTwitter, label: 'Twitter / X', color: 'text-gray-800' },
        { type: 'tiktok', icon: FaTiktok, label: 'TikTok', color: 'text-pink-600' },
        { type: 'instagram', icon: FaInstagram, label: 'Instagram', color: 'text-purple-600' },
      ],
    },
    {
      label: 'Links',
      items: [{ type: 'internal-link', icon: FaLink, label: 'Internal Link', color: 'text-blue-600' }],
    },
  ];

  return (
    <div ref={ref} className={`fixed bottom-6 right-6 z-40 transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none' : ''}`}>
      {open && (
        <div className="absolute bottom-full right-0 mb-3 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 min-w-[220px] max-h-[70vh] overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <p className="text-[9px] font-bold uppercase text-gray-400 px-3 py-1.5 tracking-wider">{group.label}</p>
              {group.items.map((item) => (
                <button
                  key={item.type}
                  onClick={() => {
                    onInsert(item.type);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors text-left"
                  type="button"
                >
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all ${open ? 'bg-[#c70000] rotate-45 text-white' : 'bg-[#052962] text-white hover:scale-105'}`}
        title="Insert block"
        type="button"
      >
        <FaPlus className="text-lg" />
      </button>
    </div>
  );
};

export default BlockInserter;
