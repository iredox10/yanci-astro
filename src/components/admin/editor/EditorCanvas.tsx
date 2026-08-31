import React, { useEffect, useRef } from 'react';
import { FaCloudArrowUp, FaTrash, FaTriangleExclamation, FaUserGroup } from 'react-icons/fa6';
import BubbleToolbar from './BubbleToolbar';
import SlashCommandMenu from './SlashCommandMenu';

interface Props {
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setIsDirty: (v: boolean) => void;
  wordCount: number;
  isFullscreen: boolean;
  previewMode: string;
  headlineTooLong: boolean;
  headlineLen: number;
  quillRef: React.RefObject<any>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, field: string) => void;
  uploading: boolean;
  onInsertComponent: (type: string, atIndex?: number) => void;
  onOpenLinkPicker: () => void;
  onExtractPullQuote: () => void;
  onSimplifyText: () => void;
  showComponentMenu: boolean;
  setShowComponentMenu: (v: boolean) => void;
}

const EditorCanvas = ({
  formData,
  setFormData,
  setIsDirty,
  isFullscreen,
  previewMode,
  headlineTooLong,
  headlineLen,
  quillRef,
  onFileUpload,
  uploading,
  onInsertComponent,
  onOpenLinkPicker,
  onExtractPullQuote,
  onSimplifyText,
}: Props) => {
  const fallbackBodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // Keep quillRef pointing to textarea for bubble/slash menus fallback
    if (!(quillRef.current as any)?.getEditor) {
      (quillRef as any).current = fallbackBodyRef.current;
    }
  });

  useEffect(() => {
    const textareas = document.querySelectorAll('textarea[data-autosize="true"]');
    textareas.forEach((t) => {
      const el = t as HTMLTextAreaElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }, [formData.headline, formData.subheading, formData.trail, previewMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev: Record<string, any>) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setIsDirty(true);
  };

  return (
    <main
      className={`overflow-y-auto bg-white relative transition-all ${isFullscreen ? 'max-w-[740px] mx-auto w-full pt-16 px-4 md:px-0' : ''} ${previewMode === 'preview' ? 'hidden' : 'flex-1'}`}
    >
      <div className={`${isFullscreen ? '' : 'max-w-[740px] mx-auto'} px-4 md:px-8 lg:px-12 py-8 md:py-12 space-y-8 md:space-y-10`}>
        <div className={`flex justify-end transition-opacity duration-300 ${isFullscreen ? 'opacity-0 h-0 overflow-hidden' : ''}`}>
          <select
            name="format"
            value={formData.format || 'news'}
            onChange={handleChange}
            className="text-[11px] font-bold uppercase tracking-wider border border-gray-200 rounded-full px-3 py-1 bg-white text-gray-600 outline-none focus:border-[#052962] focus:ring-1 focus:ring-[#052962]/20 cursor-pointer"
          >
            <option value="news">News</option>
            <option value="feature">Feature</option>
            <option value="opinion">Opinion</option>
            <option value="analysis">Analysis</option>
            <option value="interview">Interview</option>
            <option value="explainer">Explainer</option>
            <option value="review">Review</option>
            <option value="breaking">Breaking</option>
          </select>
        </div>

        <div className="space-y-3">
          {formData.image ? (
            <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img src={formData.image} alt="Featured" className="w-full h-52 md:h-72 object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <label className="px-4 py-2 bg-white text-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 text-sm font-bold flex items-center gap-2 transition-colors">
                  <FaCloudArrowUp /> Change
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'image')} />
                </label>
                <button
                  onClick={() => setFormData((p: Record<string, any>) => ({ ...p, image: '', imageCaption: '', imageCredit: '', imageAlt: '' }))}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold flex items-center gap-2 transition-colors"
                  type="button"
                >
                  <FaTrash /> Remove
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="text-white text-xs font-semibold truncate">{formData.imageCaption || 'No caption set'}</p>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-40 md:h-52 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition-all text-gray-400 group">
              {uploading ? (
                <span className="animate-pulse text-sm font-semibold">Uploading...</span>
              ) : (
                <>
                  <FaCloudArrowUp className="text-3xl mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-gray-500">Click to upload featured image</span>
                  <span className="text-[10px] text-gray-400 mt-1">or paste URL in the Media panel</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'image')} />
            </label>
          )}
        </div>

        {formData.isSensitive && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-semibold">
            <FaTriangleExclamation className="w-4 h-4 shrink-0" />
            This article contains sensitive content and has been flagged.
          </div>
        )}

        <input
          type="text"
          name="kicker"
          value={formData.kicker || ''}
          onChange={handleChange}
          className="w-full text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#c70000] border-none focus:ring-0 p-0 placeholder-gray-300 bg-transparent outline-none"
          placeholder="KICKER / CATEGORY"
        />

        <textarea
          name="subheading"
          value={formData.subheading || ''}
          onChange={handleChange}
          rows={1}
          data-autosize="true"
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = t.scrollHeight + 'px';
          }}
          className="w-full text-lg md:text-xl font-serif text-gray-500 border-none focus:ring-0 p-0 placeholder-gray-200 resize-none overflow-hidden bg-transparent outline-none"
          placeholder="Subheading / deck (optional)..."
        />

        <div className="relative">
          <textarea
            name="headline"
            value={formData.headline || ''}
            onChange={handleChange}
            rows={1}
            data-autosize="true"
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = t.scrollHeight + 'px';
            }}
            className={`w-full text-3xl md:text-5xl lg:text-6xl font-serif font-black text-[#121212] border-none focus:ring-0 p-0 resize-none overflow-hidden placeholder-gray-200 leading-[1.1] bg-transparent outline-none ${headlineTooLong ? 'text-red-600' : ''}`}
            placeholder="Article headline"
          />
          <div
            className={`flex justify-end mt-2 text-[10px] font-bold transition-colors ${headlineTooLong ? 'text-red-500' : headlineLen > 60 ? 'text-amber-500' : 'text-gray-300'}`}
          >
            {headlineLen}/80
            {headlineTooLong && <span className="ml-1">— headline is too long</span>}
          </div>
        </div>

        <textarea
          name="trail"
          value={formData.trail || ''}
          onChange={handleChange}
          rows={1}
          data-autosize="true"
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = t.scrollHeight + 'px';
          }}
          className="w-full text-base md:text-lg font-serif text-gray-600 border-none focus:ring-0 p-0 resize-none overflow-hidden border-l-2 border-gray-200 pl-4 placeholder-gray-200 bg-transparent leading-relaxed outline-none"
          placeholder="Short summary / trail text..."
        />

        <div className="flex items-start gap-4 py-5 border-y border-gray-100">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#052962] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {formData.author?.[0] || 'Y'}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <input
                type="text"
                name="author"
                value={formData.author || ''}
                onChange={handleChange}
                className="w-full text-sm font-bold text-gray-800 border-none focus:ring-0 p-0 placeholder-gray-300 bg-transparent outline-none"
                placeholder="Author name"
              />
              <div className="flex items-center gap-1.5">
                <FaUserGroup className="w-3 h-3 text-gray-300" />
                <input
                  type="text"
                  name="coAuthor"
                  value={formData.coAuthor || ''}
                  onChange={handleChange}
                  className="flex-1 text-xs text-gray-400 border-none focus:ring-0 p-0 placeholder-gray-200 bg-transparent outline-none"
                  placeholder="Co-author (optional)"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="composer-editor pb-24 relative">
          {/* Rich body: keep same class structure as yanci React; use textarea for Astro */}
          <textarea
            ref={fallbackBodyRef}
            value={formData.body || ''}
            onChange={(e) => {
              setFormData((prev: Record<string, any>) => ({ ...prev, body: e.target.value }));
              setIsDirty(true);
            }}
            placeholder="Start writing your article... Type / for commands"
            className="w-full min-h-[500px] p-0 text-[1.0625rem] md:text-[1.125rem] leading-[1.75] text-[#171717] font-serif bg-transparent outline-none resize-none placeholder:text-gray-300"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          />
          {/* Keep hidden quill container styles for preview rendering parity */}
          <div
            className="hidden prose max-w-none"
            dangerouslySetInnerHTML={{ __html: formData.body || '' }}
          />
          <BubbleToolbar quillRef={quillRef} onFormat={() => setIsDirty(true)} onPullQuote={onExtractPullQuote} onSimplify={onSimplifyText} />
          <SlashCommandMenu quillRef={quillRef} onInsertComponent={(type, atIndex) => { onInsertComponent(type, atIndex); setIsDirty(true); }} onOpenLinkPicker={onOpenLinkPicker} />
        </div>
      </div>
    </main>
  );
};

export default EditorCanvas;
