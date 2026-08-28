import { FaXmark, FaWandMagicSparkles, FaSpinner, FaTriangleExclamation, FaNewspaper, FaCircleInfo, FaTag, FaMagnifyingGlass, FaShareNodes, FaQuoteLeft, FaImage, FaCheck } from 'react-icons/fa6';

interface Props {
  open: boolean;
  onClose: () => void;
  aiLoading: boolean;
  aiError: string;
  aiSuggestions: {
    headlines: Array<{ headline: string; style?: string }>;
    tags: string[];
    trail: string;
    seo: { metaTitle?: string; metaDescription?: string; ogTitle?: string; ogDescription?: string } | null;
    social: { twitter?: string; facebook?: string; whatsapp?: string } | null;
    pullQuotes: Array<{ quote: string; reason?: string }>;
    imageCaption: string;
  };
  formData: Record<string, any>;
  onRegenerate: () => void;
  onApplyHeadline: (h: string) => void;
  onApplyTrail: () => void;
  onApplyAllTags: () => void;
  onApplyTag: (tag: string) => void;
  onApplySeo: () => void;
}

const AiToolsModal = ({ open, onClose, aiLoading, aiError, aiSuggestions, formData, onRegenerate, onApplyHeadline, onApplyTrail, onApplyAllTags, onApplyTag, onApplySeo }: Props) => {
  if (!open) return null;

  const socialItems = [
    { platform: 'Twitter / X', value: aiSuggestions.social?.twitter, icon: '🐦' },
    { platform: 'Facebook', value: aiSuggestions.social?.facebook, icon: '📘' },
    { platform: 'WhatsApp', value: aiSuggestions.social?.whatsapp, icon: '💬' },
  ];

  const hasAny =
    (aiSuggestions.headlines?.length ?? 0) > 0 ||
    (aiSuggestions.tags?.length ?? 0) > 0 ||
    !!aiSuggestions.trail ||
    !!aiSuggestions.seo ||
    !!aiSuggestions.social ||
    (aiSuggestions.pullQuotes?.length ?? 0) > 0 ||
    !!aiSuggestions.imageCaption;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#052962]">
          <div className="flex items-center gap-2">
            <FaWandMagicSparkles className="text-[#c59d5f] w-5 h-5" />
            <div>
              <h3 className="font-bold text-white text-sm">AI Assistant</h3>
              <p className="text-[10px] text-white/60">Powered by Google Gemini</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-[#c59d5f] text-white text-xs font-bold rounded-lg hover:bg-[#b0884a] disabled:opacity-50 transition-colors flex items-center gap-1.5"
              type="button"
            >
              {aiLoading ? <FaSpinner className="animate-spin" /> : <FaWandMagicSparkles />}
              Regenerate
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors" type="button">
              <FaXmark className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {aiLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FaSpinner className="animate-spin text-3xl text-[#c59d5f] mb-4" />
              <p className="text-sm font-bold text-gray-700">AI is analyzing your article...</p>
              <p className="text-xs text-gray-400 mt-1">Generating headlines, tags, SEO, social posts & more</p>
            </div>
          ) : aiError ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <FaTriangleExclamation className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm font-bold text-gray-700 text-center">{aiError}</p>
              <button onClick={onRegenerate} className="mt-4 px-4 py-2 bg-[#052962] text-white text-xs font-bold rounded-lg hover:bg-[#052962]/90 transition-colors" type="button">
                Try Again
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {aiSuggestions.headlines?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5 mb-2">
                    <FaNewspaper className="w-3 h-3" /> Headline Variations
                  </p>
                  <div className="grid gap-2">
                    {aiSuggestions.headlines.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => onApplyHeadline(h.headline)}
                        className="text-left p-3 bg-gray-50 rounded-xl hover:bg-[#052962]/5 transition-colors group border border-gray-100"
                        type="button"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-[9px] font-bold uppercase text-[#052962] bg-[#052962]/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{h.style || 'Option'}</span>
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-[#052962] leading-snug">{h.headline}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {aiSuggestions.trail && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-2 tracking-wider flex items-center gap-1.5">
                    <FaCircleInfo className="w-3 h-3" /> Suggested Summary
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-sm text-gray-700 italic leading-relaxed">{aiSuggestions.trail}</p>
                    <button onClick={onApplyTrail} className="mt-2 text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1" type="button">
                      <FaCheck className="w-2.5 h-2.5" /> Apply this summary
                    </button>
                  </div>
                </div>
              )}

              {aiSuggestions.tags?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <FaTag className="w-3 h-3" /> Suggested Tags
                    </p>
                    <button onClick={onApplyAllTags} className="text-[10px] font-bold text-[#052962] hover:text-[#c59d5f] transition-colors" type="button">
                      + Add All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {aiSuggestions.tags.map((tag, i) => {
                      const existing: string[] = String(formData.tags ?? '')
                        .split(',')
                        .map((t: string) => t.trim())
                        .filter(Boolean);
                      const isAdded = existing.includes(tag);
                      return (
                        <button
                          key={i}
                          onClick={() => !isAdded && onApplyTag(tag)}
                          disabled={isAdded}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${isAdded ? 'bg-green-100 text-green-700 cursor-default' : 'bg-gray-100 text-gray-600 hover:bg-[#052962] hover:text-white'}`}
                          type="button"
                        >
                          {isAdded ? '✓ ' : '+ '}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {aiSuggestions.seo && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <FaMagnifyingGlass className="w-3 h-3" /> SEO Metadata
                    </p>
                    <button onClick={onApplySeo} className="text-[10px] font-bold text-[#052962] hover:text-[#c59d5f] transition-colors" type="button">
                      Apply All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Meta Title', value: aiSuggestions.seo.metaTitle, max: 60 },
                      { label: 'Meta Description', value: aiSuggestions.seo.metaDescription, max: 160 },
                      { label: 'OG Title', value: aiSuggestions.seo.ogTitle, max: 200 },
                      { label: 'OG Description', value: aiSuggestions.seo.ogDescription, max: 300 },
                    ].map((item) => (
                      <div key={item.label} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-gray-400">{item.label}</p>
                          <p className={`text-[10px] font-bold ${(item.value || '').length > item.max ? 'text-red-500' : 'text-green-600'}`}>
                            {(item.value || '').length}/{item.max}
                          </p>
                        </div>
                        <p className="text-xs text-gray-700">{item.value || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiSuggestions.social && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-2 tracking-wider flex items-center gap-1.5">
                    <FaShareNodes className="w-3 h-3" /> Social Media Posts
                  </p>
                  <div className="space-y-2">
                    {socialItems
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.platform} className="p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-gray-700">
                              {item.icon} {item.platform}
                            </p>
                            <button
                              onClick={() => navigator.clipboard.writeText(item.value!)}
                              className="text-[10px] text-gray-400 hover:text-[#052962] opacity-0 group-hover:opacity-100 transition-all"
                              type="button"
                            >
                              Copy
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{item.value}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {aiSuggestions.pullQuotes?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-2 tracking-wider flex items-center gap-1.5">
                    <FaQuoteLeft className="w-3 h-3" /> Pull Quotes
                  </p>
                  <div className="space-y-2">
                    {aiSuggestions.pullQuotes.map((q, i) => (
                      <div key={i} className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                        <p className="text-sm font-serif italic text-gray-800 leading-relaxed">&ldquo;{q.quote}&rdquo;</p>
                        <p className="text-[10px] text-purple-500 mt-1">{q.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiSuggestions.imageCaption && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-2 tracking-wider flex items-center gap-1.5">
                    <FaImage className="w-3 h-3" /> Suggested Image Caption
                  </p>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-sm text-gray-700">{aiSuggestions.imageCaption}</p>
                  </div>
                </div>
              )}

              {!hasAny && (
                <div className="text-center py-12">
                  <FaWandMagicSparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No AI suggestions generated. Try adding more content or click Regenerate.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiToolsModal;
