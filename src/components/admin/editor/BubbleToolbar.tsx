import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaBold, FaItalic, FaHeading, FaQuoteLeft, FaLink, FaWandMagicSparkles, FaFeather } from 'react-icons/fa6';

const FORMATS = [
  { id: 'bold', icon: FaBold, action: 'bold', title: 'Bold' },
  { id: 'italic', icon: FaItalic, action: 'italic', title: 'Italic' },
  { id: 'h2', icon: FaHeading, action: 'header', value: 2, title: 'Heading 2' },
  { id: 'h3', icon: FaHeading, action: 'header', value: 3, title: 'Heading 3', small: true },
  { id: 'blockquote', icon: FaQuoteLeft, action: 'blockquote', title: 'Quote' },
];

interface Props {
  quillRef: React.RefObject<any>;
  onFormat?: () => void;
  onPullQuote?: () => void;
  onSimplify?: () => void;
}

const BubbleToolbar = ({ quillRef, onFormat, onPullQuote, onSimplify }: Props) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const updateToolbar = useCallback(() => {
    const quill = quillRef.current?.getEditor?.();
    // Fallback for textarea-based editor: use window selection
    if (!quill) {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setVisible(false);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || rect.width === 0) {
        setVisible(false);
        return;
      }
      setPosition({ top: rect.top + window.scrollY - 52, left: rect.left + rect.width / 2 });
      setVisible(true);
      return;
    }

    const selection = quill.getSelection();
    if (!selection || selection.length === 0) {
      setVisible(false);
      return;
    }

    const bounds = quill.getBounds(selection.index, selection.length);
    const container = quill.root;
    const containerRect = container.getBoundingClientRect();

    const top = containerRect.top + bounds.top - 52;
    const left = containerRect.left + bounds.left + bounds.width / 2;

    const formatData = quill.getFormat(selection.index, selection.length);
    const active: Record<string, boolean> = {};
    FORMATS.forEach((f: any) => {
      active[f.action + (f.value ?? '')] = formatData[f.action] === (f.value ?? true);
    });

    setActiveFormats(active);
    setPosition({ top, left });
    setVisible(true);
  }, [quillRef]);

  useEffect(() => {
    const quill = quillRef.current?.getEditor?.();
    if (quill) {
      quill.on('selection-change', updateToolbar);
      return () => quill.off('selection-change', updateToolbar);
    }
    // For textarea fallback, listen to mouseup/keyup
    const handler = () => setTimeout(updateToolbar, 30);
    document.addEventListener('mouseup', handler);
    document.addEventListener('keyup', handler);
    return () => {
      document.removeEventListener('mouseup', handler);
      document.removeEventListener('keyup', handler);
    };
  }, [quillRef, updateToolbar]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        // Keep visible if selection still exists? For now hide on outside click
      }
    };
    const handleScroll = () => setVisible(false);
    document.addEventListener('mousedown', handleClickOutside as any);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as any);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const handleFormat = (action: string, value?: number) => {
    const quill = quillRef.current?.getEditor?.();
    if (quill) {
      const range = quill.getSelection();
      if (!range) return;
      if (action === 'header') {
        const current = quill.getFormat(range.index, range.length);
        quill.format('header', current.header === value ? false : value);
      } else if (action === 'blockquote') {
        const current = quill.getFormat(range.index, range.length);
        quill.format('blockquote', !current.blockquote);
      } else {
        const current = quill.getFormat(range.index, range.length);
        quill.format(action, !current[action]);
      }
      if (onFormat) onFormat();
      setTimeout(updateToolbar, 10);
      return;
    }
    // Textarea fallback: wrap selection
    const textarea = quillRef.current as unknown as HTMLTextAreaElement | null;
    if (textarea && textarea.tagName === 'TEXTAREA') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value.slice(start, end);
      if (!text) return;
      let wrapped = text;
      if (action === 'bold') wrapped = `<strong>${text}</strong>`;
      else if (action === 'italic') wrapped = `<em>${text}</em>`;
      else if (action === 'header' && value === 2) wrapped = `<h2>${text}</h2>`;
      else if (action === 'header' && value === 3) wrapped = `<h3>${text}</h3>`;
      else if (action === 'blockquote') wrapped = `<blockquote>${text}</blockquote>`;
      const before = textarea.value.slice(0, start);
      const after = textarea.value.slice(end);
      textarea.value = before + wrapped + after;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (onFormat) onFormat();
    }
  };

  const handleLink = () => {
    const quill = quillRef.current?.getEditor?.();
    if (quill) {
      const range = quill.getSelection();
      if (!range) return;
      const url = window.prompt('Enter URL:');
      if (url) {
        quill.format('link', url);
        if (onFormat) onFormat();
      }
      setTimeout(updateToolbar, 10);
      return;
    }
    const textarea = quillRef.current as unknown as HTMLTextAreaElement | null;
    if (textarea) {
      const url = window.prompt('Enter URL:');
      if (!url) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value.slice(start, end) || url;
      const before = textarea.value.slice(0, start);
      const after = textarea.value.slice(end);
      textarea.value = before + `<a href="${url}">${text}</a>` + after;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (onFormat) onFormat();
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 bg-[#1a1a1a] text-white rounded-lg shadow-2xl px-1.5 py-1.5 flex items-center gap-0.5"
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)', animation: 'bubbleFadeIn 0.15s ease-out' }}
    >
      {FORMATS.map((f: any) => {
        const Icon = f.icon;
        const isActive = activeFormats[f.action + (f.value ?? '')];
        return (
          <button
            key={f.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleFormat(f.action, f.value);
            }}
            title={f.title}
            className={`w-8 h-8 rounded flex items-center justify-center text-xs transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
          >
            <Icon className={`${f.small ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
          </button>
        );
      })}
      <div className="w-px h-4 bg-white/10 mx-1" />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          handleLink();
        }}
        title="Add Link"
        className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        <FaLink className="w-3 h-3" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          if (onPullQuote) onPullQuote();
        }}
        title="Mark as Pull Quote"
        className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        <FaFeather className="w-3 h-3" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          if (onSimplify) onSimplify();
        }}
        title="Simplify Selected Text"
        className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        <FaWandMagicSparkles className="w-3 h-3" />
      </button>
    </div>
  );
};

export default BubbleToolbar;
