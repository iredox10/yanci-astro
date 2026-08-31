import React, { useState } from 'react';
import { FaTag, FaXmark } from 'react-icons/fa6';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const TagInput = ({ value, onChange, placeholder }: Props) => {
  const [input, setInput] = useState('');
  const tags = value ? value.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag].join(', '));
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag).join(', '));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-[#052962]/20 focus-within:border-[#052962] transition-all">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 bg-[#052962]/8 text-[#052962] text-[11px] font-semibold px-2 py-0.5 rounded-md">
            <FaTag className="w-2.5 h-2.5 opacity-60" />
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-red-600 transition-colors">
              <FaXmark className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag(input);
            }
            if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1]);
          }}
          onBlur={() => input.trim() && addTag(input)}
          placeholder={tags.length ? '' : placeholder || 'Add tag and press Enter'}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder-gray-400"
        />
      </div>
      <p className="text-[10px] text-gray-400">
        {tags.length} tag{tags.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

export default TagInput;
