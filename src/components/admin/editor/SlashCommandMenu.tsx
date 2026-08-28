import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FaImage, FaTable, FaYoutube, FaXTwitter, FaMapLocationDot, FaCircleInfo, FaLink, FaNewspaper } from 'react-icons/fa6';

const SLASH_COMMANDS = [
  { id: 'h2', label: 'Heading 2', icon: FaNewspaper, desc: 'Large section heading', action: 'format', format: { header: 2 } },
  { id: 'h3', label: 'Heading 3', icon: FaNewspaper, desc: 'Sub-section heading', action: 'format', format: { header: 3 } },
  { id: 'quote', label: 'Quote', icon: FaCircleInfo, desc: 'Pull quote block', action: 'format', format: { blockquote: true } },
  { id: 'body-image', label: 'Insert Image', icon: FaImage, desc: 'Upload or paste image', action: 'component', type: 'body-image' },
  { id: 'table', label: 'Table', icon: FaTable, desc: 'Data table', action: 'component', type: 'table' },
  { id: 'youtube', label: 'YouTube', icon: FaYoutube, desc: 'Embed video', action: 'component', type: 'youtube' },
  { id: 'twitter', label: 'Tweet / X', icon: FaXTwitter, desc: 'Embed tweet', action: 'component', type: 'twitter' },
  { id: 'map', label: 'Map', icon: FaMapLocationDot, desc: 'Google Maps embed', action: 'component', type: 'map' },
  { id: 'highlight', label: 'Highlight Box', icon: FaCircleInfo, desc: 'Important callout', action: 'component', type: 'highlight' },
  { id: 'internal-link', label: 'Internal Link', icon: FaLink, desc: 'Link to article', action: 'component', type: 'internal-link' },
];

interface Props {
  quillRef: React.RefObject<any>;
  onInsertComponent: (type: string, atIndex?: number) => void;
  onOpenLinkPicker: () => void;
}

const SlashCommandMenu = ({ quillRef, onInsertComponent, onOpenLinkPicker }: Props) => {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<{ index: number; length: number } | null>(null);

  const filtered = useMemo(() => {
    if (!query) return SLASH_COMMANDS;
    const q = query.toLowerCase();
    return SLASH_COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    const el = quillRef.current as unknown as HTMLTextAreaElement | null;
    // If it's a textarea fallback, listen to input
    if (el && el.tagName === 'TEXTAREA') {
      const handler = () => {
        const value: string = (el as HTMLTextAreaElement).value;
        const caret: number = (el as HTMLTextAreaElement).selectionStart ?? 0;
        const text = value.slice(0, caret);
        const lastSlash = text.lastIndexOf('/');
        if (lastSlash === -1) {
          setVisible(false);
          return;
        }
        const afterSlash = text.slice(lastSlash + 1);
        const beforeSlash = text.slice(0, lastSlash);
        if (beforeSlash.length > 0 && !/\s$/.test(beforeSlash)) {
          setVisible(false);
          return;
        }
        if (afterSlash.includes(' ') || afterSlash.includes('\n')) {
          setVisible(false);
          return;
        }
        rangeRef.current = { index: lastSlash, length: afterSlash.length + 1 };
        setQuery(afterSlash);
        // approximate position below textarea caret - just show near bottom
        const rect = el.getBoundingClientRect();
        setPosition({ top: rect.top + 80, left: rect.left + 16 });
        setVisible(true);
        setSelectedIndex(0);
      };
      el.addEventListener('input', handler);
      el.addEventListener('keyup', handler);
      return () => {
        el.removeEventListener('input', handler);
        el.removeEventListener('keyup', handler);
      };
    }

    // Quill path
    const quill = (quillRef.current as any)?.getEditor?.();
    if (!quill) return;
    const handleTextChange = (_delta: unknown, _oldDelta: unknown, source: string) => {
      if (source !== 'user') return;
      const sel = quill.getSelection();
      if (!sel) return;
      const text = quill.getText(0, sel.index);
      const lastSlash = text.lastIndexOf('/');
      if (lastSlash === -1) {
        setVisible(false);
        return;
      }
      const afterSlash = text.slice(lastSlash + 1);
      const beforeSlash = text.slice(0, lastSlash);
      if (beforeSlash.length > 0 && !/\s$/.test(beforeSlash)) {
        setVisible(false);
        return;
      }
      const range = { index: lastSlash, length: afterSlash.length + 1 };
      rangeRef.current = range;
      setQuery(afterSlash);
      const bounds = quill.getBounds(sel.index, 0);
      const container = quill.root;
      const containerRect = container.getBoundingClientRect();
      setPosition({
        top: containerRect.top + bounds.top + bounds.height + 6,
        left: containerRect.left + bounds.left,
      });
      setVisible(true);
      setSelectedIndex(0);
    };
    quill.on('text-change', handleTextChange);
    return () => quill.off('text-change', handleTextChange);
  }, [quillRef]);

  const executeCommand = useCallback(
    (cmd: (typeof SLASH_COMMANDS)[number]) => {
      // Textarea path
      const el = quillRef.current as unknown as HTMLTextAreaElement | null;
      if (el && el.tagName === 'TEXTAREA') {
        const range = rangeRef.current;
        const value = el.value;
        const caretPos = el.selectionStart ?? 0;
        const start = range ? range.index : caretPos - query.length - 1;
        const end = range ? range.index + range.length : caretPos;
        const before = value.slice(0, Math.max(0, start));
        const after = value.slice(end);
        let insert = '';
        if (cmd.action === 'format') {
          if (cmd.format && (cmd.format as any).header === 2) insert = '\n<h2>Heading 2</h2>\n';
          else if (cmd.format && (cmd.format as any).header === 3) insert = '\n<h3>Heading 3</h3>\n';
          else if ((cmd.format as any)?.blockquote) insert = '\n<blockquote>Quote</blockquote>\n';
        } else if (cmd.action === 'component') {
          if ((cmd as any).type === 'internal-link') {
            if (onOpenLinkPicker) onOpenLinkPicker();
            setVisible(false);
            setQuery('');
            return;
          } else if (onInsertComponent) {
            onInsertComponent((cmd as any).type, start);
            setVisible(false);
            setQuery('');
            return;
          }
        }
        const next = before + insert + after;
        (el as any).value = next;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
        const newPos = before.length + insert.length;
        try {
          el.setSelectionRange(newPos, newPos);
        } catch {}
        setVisible(false);
        setQuery('');
        return;
      }

      const quill = (quillRef.current as any)?.getEditor?.();
      if (!quill || !cmd) {
        setVisible(false);
        return;
      }
      const range = rangeRef.current;
      if (range) {
        quill.deleteText(range.index, range.length);
      }
      const sel = quill.getSelection();
      const insertAt = sel ? sel.index : range ? range.index : 0;
      if (cmd.action === 'format') {
        Object.entries((cmd as any).format).forEach(([key, value]) => {
          quill.format(key, value);
        });
      } else if (cmd.action === 'component') {
        if ((cmd as any).type === 'internal-link') {
          quill.setSelection(insertAt, 0);
          if (onOpenLinkPicker) onOpenLinkPicker();
        } else if (onInsertComponent) {
          onInsertComponent((cmd as any).type, insertAt);
        }
      }
      setVisible(false);
      setQuery('');
    },
    [quillRef, onInsertComponent, onOpenLinkPicker, query],
  );

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeCommand(filtered[selectedIndex] as any);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setVisible(false);
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [visible, filtered, selectedIndex, executeCommand]);

  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-1.5 min-w-[260px] max-w-[320px] max-h-[340px] overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((cmd: any, i) => {
        const Icon = cmd.icon;
        return (
          <button
            key={cmd.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand(cmd);
            }}
            onMouseEnter={() => setSelectedIndex(i)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${i === selectedIndex ? 'bg-[#052962] text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${i === selectedIndex ? 'bg-white/20' : 'bg-gray-100'}`}>
              <Icon className={`w-4 h-4 ${i === selectedIndex ? 'text-white' : 'text-gray-500'}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${i === selectedIndex ? 'text-white' : 'text-gray-900'}`}>{cmd.label}</p>
              <p className={`text-[10px] ${i === selectedIndex ? 'text-white/70' : 'text-gray-400'}`}>{cmd.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SlashCommandMenu;
