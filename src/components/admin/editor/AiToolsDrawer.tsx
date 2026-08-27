import React, { useEffect, useState } from 'react';
import {
  FaWandMagicSparkles,
  FaXmark,
  FaSpinner,
  FaNewspaper,
  FaAlignLeft,
  FaTag,
  FaSpellCheck,
  FaLanguage,
  FaQuoteLeft,
  FaShareNodes,
  FaCheck,
  FaArrowRotateRight,
  FaCopy,
} from 'react-icons/fa6';

export interface AiToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  articleHeadline?: string;
  headline?: string;
  articleTrail?: string;
  trail?: string;
  articleBody?: string;
  body?: string;
  articleTags?: string[];
  tags?: string[];
  image?: string;
  onApplyHeadline?: (headline: string) => void;
  onApplyTrail?: (trail: string) => void;
  onApplyTags?: (tags: string[]) => void;
  onApplyTag?: (tag: string) => void;
  onApplyBody?: (body: string) => void;
  onInsertBody?: (text: string) => void;
  onApplyKicker?: (kicker: string) => void;
  onApplyAltText?: (alt: string) => void;
}

type TabType = 'all' | 'headlines' | 'summary' | 'tags' | 'grammar' | 'translate' | 'social';

interface HeadlineItem {
  headline: string;
  style?: string;
}

interface GrammarSuggestion {
  original: string;
  suggestion: string;
  reason: string;
}

interface SocialPost {
  platform: string;
  text: string;
  icon: string;
}

export default function AiToolsDrawer({
  isOpen,
  onClose,
  articleHeadline,
  headline,
  articleTrail,
  trail,
  articleBody,
  body,
  articleTags,
  tags,
  image,
  onApplyHeadline,
  onApplyTrail,
  onApplyTags,
  onApplyTag,
  onApplyBody,
  onInsertBody,
  onApplyKicker,
  onApplyAltText,
}: AiToolsDrawerProps) {
  const currentHeadline = articleHeadline ?? headline ?? '';
  const currentTrail = articleTrail ?? trail ?? '';
  const currentBody = articleBody ?? body ?? '';
  const currentTags: string[] = Array.isArray(articleTags) ? articleTags : Array.isArray(tags) ? tags : [];
  const handleApplyBody = onApplyBody ?? onInsertBody;
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // AI results state
  const [headlines, setHeadlines] = useState<HeadlineItem[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [grammarSuggestions, setGrammarSuggestions] = useState<GrammarSuggestion[]>([]);
  const [correctedText, setCorrectedText] = useState<string | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<'ha' | 'en'>('ha');
  const [pullQuotes, setPullQuotes] = useState<string[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const contentText = (currentBody.replace(/<[^>]*>/g, ' ').trim() || currentHeadline || currentTrail).trim();

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Generate Headlines
  async function generateHeadlines() {
    if (!contentText) {
      setError('Da farko shigar da rubutu ko kanun labarai a edita.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/headline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contentText }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'An kasa samun kanun labarai');
      const list = Array.isArray(data.headlines) ? data.headlines : [];
      setHeadlines(
        list.map((h: string | { headline: string; style?: string }, i: number) => {
          if (typeof h === 'string') {
            const styles = ['Madaidaici', 'Mai jan hankali', 'Taƙaitacce'];
            return { headline: h, style: styles[i] || 'Zaɓi' };
          }
          return h;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An kasa samun kanun labarai');
    } finally {
      setLoading(false);
    }
  }

  // 2. Generate Summary
  async function generateSummary() {
    if (!contentText) {
      setError('Da farko shigar da rubutu a edita.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contentText }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'An kasa samun taƙaitaccen bayani');
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An kasa samun taƙaitaccen bayani');
    } finally {
      setLoading(false);
    }
  }

  // 3. Generate Tags
  async function generateTags() {
    if (!contentText) {
      setError('Da farko shigar da rubutu a edita.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contentText }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'An kasa samun tags');
      setSuggestedTags(Array.isArray(data.tags) ? data.tags : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An kasa samun tags');
    } finally {
      setLoading(false);
    }
  }

  // 4. Grammar & Proofreading
  async function checkGrammar() {
    if (!contentText) {
      setError('Da farko shigar da rubutu a edita.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contentText, lang: 'ha' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'An kasa duba nahawu');
      setGrammarSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setCorrectedText(data.correctedText || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An kasa duba nahawu');
    } finally {
      setLoading(false);
    }
  }

  // 5. Translation
  async function translateArticle() {
    if (!contentText) {
      setError('Da farko shigar da rubutu a edita.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contentText, targetLang }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'An kasa fassara');
      setTranslation(data.translation || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An kasa fassara');
    } finally {
      setLoading(false);
    }
  }

  // 6. Pull Quotes & Social
  async function generateQuotesAndSocial() {
    if (!contentText) {
      setError('Da farko shigar da rubutu a edita.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Pull quotes
      const resQuotes = await fetch('/api/ai/pull-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contentText }),
      }).catch(() => null);

      if (resQuotes && resQuotes.ok) {
        const dQuotes = await resQuotes.json().catch(() => ({}));
        if (Array.isArray(dQuotes.quotes)) {
          setPullQuotes(dQuotes.quotes);
        }
      }

      // Social Posts
      const resSocial = await fetch('/api/ai/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contentText }),
      }).catch(() => null);

      if (resSocial && resSocial.ok) {
        const dSocial = await resSocial.json().catch(() => ({}));
        if (dSocial.posts && typeof dSocial.posts === 'object') {
          const p = dSocial.posts;
          const posts: SocialPost[] = [];
          if (p.x || p.twitter) posts.push({ platform: 'X / Twitter', text: p.x || p.twitter, icon: '𝕏' });
          if (p.facebook) posts.push({ platform: 'Facebook', text: p.facebook, icon: 'f' });
          if (p.whatsapp) posts.push({ platform: 'WhatsApp', text: p.whatsapp, icon: '💬' });
          setSocialPosts(posts);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An kasa ciro tsokaci da sakonnin sada zumunta');
    } finally {
      setLoading(false);
    }
  }

  // Run Quick Assist / All-in-One
  async function runAll() {
    if (!contentText) {
      setError('Da farko shigar da rubutu a edita.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await Promise.allSettled([
        generateHeadlines(),
        generateSummary(),
        generateTags(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'Babban Taimako', icon: <FaWandMagicSparkles className="size-3.5" /> },
    { id: 'headlines', label: 'Kanun Labarai', icon: <FaNewspaper className="size-3.5" /> },
    { id: 'summary', label: 'Taƙaitawa', icon: <FaAlignLeft className="size-3.5" /> },
    { id: 'tags', label: 'Tags', icon: <FaTag className="size-3.5" /> },
    { id: 'grammar', label: 'Nahawu', icon: <FaSpellCheck className="size-3.5" /> },
    { id: 'translate', label: 'Fassara', icon: <FaLanguage className="size-3.5" /> },
    { id: 'social', label: 'Sada Zumunta', icon: <FaShareNodes className="size-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-yanci-dark/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Mataimakin AI (AI Editorial Assistant)"
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-yanci-primary/20 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-yanci-primary/15 bg-yanci-primary px-5 py-4 text-yanci-paper">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded bg-yanci-accent/20 text-yanci-accent">
              <FaWandMagicSparkles className="size-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold leading-tight">Mataimakin AI</h2>
              <p className="text-[11px] text-yanci-paper/70">AI Editorial Assistant • Google Gemini</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Rufe"
            className="flex size-8 items-center justify-center rounded text-yanci-paper/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <FaXmark className="size-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-yanci-primary/15 bg-yanci-paper px-2 py-1.5 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setError(null);
              }}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-yanci-accent bg-white text-yanci-primary shadow-xs'
                  : 'text-yanci-primary/60 hover:text-yanci-primary hover:bg-white/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Action / Trigger Banner */}
        <div className="flex items-center justify-between border-b border-yanci-primary/10 bg-yanci-paper/40 px-5 py-2.5">
          <span className="text-xs text-yanci-primary/70">
            {contentText ? `${contentText.slice(0, 45)}… (${contentText.length} haruffa)` : 'Babu rubutu tukuna'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'all') void runAll();
              else if (activeTab === 'headlines') void generateHeadlines();
              else if (activeTab === 'summary') void generateSummary();
              else if (activeTab === 'tags') void generateTags();
              else if (activeTab === 'grammar') void checkGrammar();
              else if (activeTab === 'translate') void translateArticle();
              else if (activeTab === 'social') void generateQuotesAndSocial();
            }}
            disabled={loading || !contentText}
            className="flex items-center gap-1.5 rounded bg-yanci-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-yanci-primary transition-all hover:bg-yanci-accent/90 disabled:opacity-50"
          >
            {loading ? <FaSpinner className="size-3 animate-spin" /> : <FaArrowRotateRight className="size-3" />}
            <span>{loading ? 'Ana aiki…' : 'Sake Tantancewa'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {error && (
            <div className="rounded border border-yanci-red/30 bg-yanci-red/10 p-3 text-xs text-yanci-red">
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {!contentText && (
            <div className="rounded border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-800">
              <FaWandMagicSparkles className="mx-auto mb-2 size-6 text-amber-600" />
              <p className="font-bold">Babu rubutu a cikin edita</p>
              <p className="mt-1 text-amber-700/80">
                Shigar da kanun labarai ko jikin labari a cikin edita kafin amfani da mataimakin AI.
              </p>
            </div>
          )}

          {/* TAB: ALL / QUICK ASSIST */}
          {activeTab === 'all' && (
            <div className="space-y-6">
              {/* Quick Actions Intro */}
              {headlines.length === 0 && !summary && suggestedTags.length === 0 && (
                <div className="rounded border border-yanci-primary/15 bg-yanci-paper/60 p-5 text-center">
                  <FaWandMagicSparkles className="mx-auto mb-3 size-8 text-yanci-accent" />
                  <h3 className="font-serif text-sm font-bold text-yanci-primary">Tantance Labari Gaba Ɗaya</h3>
                  <p className="mt-1 text-xs text-yanci-primary/70">
                    Danna maɓallin da ke ƙasa don samar da kanun labarai, taƙaitaccen bayani, da tags lokaci guda.
                  </p>
                  <button
                    type="button"
                    onClick={() => void runAll()}
                    disabled={loading || !contentText}
                    className="mt-4 inline-flex items-center gap-2 rounded bg-yanci-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-yanci-paper shadow transition-colors hover:bg-yanci-primary/90 disabled:opacity-50"
                  >
                    {loading ? <FaSpinner className="size-3.5 animate-spin" /> : <FaWandMagicSparkles className="size-3.5" />}
                    <span>Fara Tantance Labari</span>
                  </button>
                </div>
              )}

              {/* Headlines Section */}
              {headlines.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yanci-primary">
                      <FaNewspaper className="size-3.5 text-yanci-accent" />
                      <span>Shawarwarin Kanun Labarai</span>
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {headlines.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 rounded border border-yanci-primary/15 bg-white p-3 shadow-2xs transition-colors hover:border-yanci-accent/50"
                      >
                        <div className="min-w-0 flex-1">
                          {item.style && (
                            <span className="mb-1 inline-block rounded bg-yanci-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-yanci-primary">
                              {item.style}
                            </span>
                          )}
                          <p className="font-serif text-sm font-bold leading-snug text-yanci-dark">{item.headline}</p>
                        </div>
                        {onApplyHeadline && (
                          <button
                            type="button"
                            onClick={() => onApplyHeadline(item.headline)}
                            className="flex shrink-0 items-center gap-1 rounded border border-yanci-primary/20 bg-yanci-paper px-2.5 py-1 text-[11px] font-bold text-yanci-primary hover:bg-yanci-primary hover:text-white"
                          >
                            <FaCheck className="size-2.5" /> Aiwatar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary / Trail Section */}
              {summary && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yanci-primary">
                    <FaAlignLeft className="size-3.5 text-yanci-accent" />
                    <span>Taƙaitaccen Bayani (Trail)</span>
                  </h4>
                  <div className="rounded border border-yanci-primary/15 bg-white p-3.5 shadow-2xs">
                    <p className="text-xs leading-relaxed text-yanci-dark/80">{summary}</p>
                    {onApplyTrail && (
                      <button
                        type="button"
                        onClick={() => onApplyTrail(summary)}
                        className="mt-3 flex items-center gap-1 rounded bg-yanci-teal px-3 py-1 text-xs font-bold uppercase tracking-wider text-white hover:bg-yanci-teal/90"
                      >
                        <FaCheck className="size-3" /> Aiwatar a Matsayin Trail
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Suggested Tags Section */}
              {suggestedTags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yanci-primary">
                      <FaTag className="size-3.5 text-yanci-accent" />
                      <span>Shawarwarin Tags</span>
                    </h4>
                    {onApplyTags && (
                      <button
                        type="button"
                        onClick={() => {
                          const combined = Array.from(new Set([...currentTags, ...suggestedTags]));
                          onApplyTags(combined);
                        }}
                        className="text-[11px] font-bold text-yanci-accent hover:underline"
                      >
                        + Ƙara Duka ({suggestedTags.length})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTags.map((tag) => {
                      const isAdded = currentTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isAdded) return;
                            if (onApplyTag) onApplyTag(tag);
                            else if (onApplyTags) onApplyTags([...currentTags, tag]);
                          }}
                          disabled={isAdded}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                            isAdded
                              ? 'bg-emerald-100 text-emerald-800 opacity-70'
                              : 'bg-yanci-primary/10 text-yanci-primary hover:bg-yanci-primary hover:text-white'
                          }`}
                        >
                          {isAdded ? `✓ ${tag}` : `+ ${tag}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: HEADLINES */}
          {activeTab === 'headlines' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-yanci-primary/70">
                  Kanun Labarai da aka Samar
                </span>
                <button
                  type="button"
                  onClick={() => void generateHeadlines()}
                  disabled={loading}
                  className="text-xs font-bold text-yanci-accent hover:underline"
                >
                  Sake Nema
                </button>
              </div>

              {headlines.length === 0 && !loading && (
                <div className="py-8 text-center">
                  <p className="text-xs text-yanci-primary/60">Babu kanun labarai tukuna. Danna "Sake Nema".</p>
                </div>
              )}

              <div className="space-y-2.5">
                {headlines.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded border border-yanci-primary/15 bg-white p-3.5 shadow-2xs transition-colors hover:border-yanci-accent/60"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="rounded bg-yanci-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-yanci-primary">
                        {item.style || `Zaɓi #${idx + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.headline, `h-${idx}`)}
                        className="text-[10px] text-yanci-primary/60 hover:text-yanci-primary"
                      >
                        {copiedKey === `h-${idx}` ? 'An kwafa!' : <FaCopy className="size-3" />}
                      </button>
                    </div>
                    <p className="font-serif text-sm font-bold text-yanci-dark">{item.headline}</p>
                    <div className="mt-3 flex items-center gap-2">
                      {onApplyHeadline && (
                        <button
                          type="button"
                          onClick={() => onApplyHeadline(item.headline)}
                          className="flex items-center gap-1 rounded bg-yanci-primary px-3 py-1 text-xs font-bold uppercase text-white hover:bg-yanci-primary/90"
                        >
                          <FaCheck className="size-2.5" /> Aiwatar da Kanun Labari
                        </button>
                      )}
                      {onApplyKicker && (
                        <button
                          type="button"
                          onClick={() => onApplyKicker(item.headline)}
                          className="rounded border border-yanci-primary/20 bg-yanci-paper px-2.5 py-1 text-xs font-semibold text-yanci-primary hover:bg-yanci-primary/10"
                        >
                          Saka a Kicker
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-yanci-primary/70">
                  Taƙaitaccen Bayani (Article Summary)
                </span>
                <button
                  type="button"
                  onClick={() => void generateSummary()}
                  disabled={loading}
                  className="text-xs font-bold text-yanci-accent hover:underline"
                >
                  Sake Nema
                </button>
              </div>

              {summary ? (
                <div className="space-y-3 rounded border border-yanci-primary/15 bg-white p-4 shadow-2xs">
                  <p className="text-sm leading-relaxed text-yanci-dark">{summary}</p>
                  <div className="flex items-center gap-2 pt-2">
                    {onApplyTrail && (
                      <button
                        type="button"
                        onClick={() => onApplyTrail(summary)}
                        className="flex items-center gap-1.5 rounded bg-yanci-teal px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-yanci-teal/90"
                      >
                        <FaCheck className="size-3" /> Aiwatar a Matsayin Trail
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(summary, 'summary')}
                      className="rounded border border-yanci-primary/20 px-3 py-1.5 text-xs font-semibold text-yanci-primary hover:bg-yanci-paper"
                    >
                      {copiedKey === 'summary' ? 'An kwafa!' : 'Kwafi'}
                    </button>
                  </div>
                </div>
              ) : (
                !loading && (
                  <div className="py-8 text-center">
                    <p className="text-xs text-yanci-primary/60">Babu taƙaitawa tukuna. Danna "Sake Nema".</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB: TAGS */}
          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-yanci-primary/70">
                  Shawarwarin Batutuwa (Tags)
                </span>
                <button
                  type="button"
                  onClick={() => void generateTags()}
                  disabled={loading}
                  className="text-xs font-bold text-yanci-accent hover:underline"
                >
                  Sake Nema
                </button>
              </div>

              {suggestedTags.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((tag) => {
                      const isAdded = currentTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isAdded) return;
                            if (onApplyTag) onApplyTag(tag);
                            else if (onApplyTags) onApplyTags([...currentTags, tag]);
                          }}
                          disabled={isAdded}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                            isAdded
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-yanci-primary/10 text-yanci-primary hover:bg-yanci-primary hover:text-white'
                          }`}
                        >
                          {isAdded ? <FaCheck className="size-3" /> : '+'}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>

                  {onApplyTags && (
                    <button
                      type="button"
                      onClick={() => {
                        const combined = Array.from(new Set([...currentTags, ...suggestedTags]));
                        onApplyTags(combined);
                      }}
                      className="mt-3 flex items-center gap-1 rounded bg-yanci-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-yanci-primary/90"
                    >
                      <FaCheck className="size-3" /> Ƙara Duka a Edita
                    </button>
                  )}
                </div>
              ) : (
                !loading && (
                  <div className="py-8 text-center">
                    <p className="text-xs text-yanci-primary/60">Babu tags tukuna. Danna "Sake Nema".</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB: GRAMMAR & PROOFREADING */}
          {activeTab === 'grammar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-yanci-primary/70">
                  Duba Nahawu da Ka'idojin Rubutu
                </span>
                <button
                  type="button"
                  onClick={() => void checkGrammar()}
                  disabled={loading}
                  className="text-xs font-bold text-yanci-accent hover:underline"
                >
                  Sake Dubawa
                </button>
              </div>

              {grammarSuggestions.length > 0 && (
                <div className="space-y-2.5">
                  {grammarSuggestions.map((item, idx) => (
                    <div key={idx} className="rounded border border-yanci-primary/15 bg-white p-3 shadow-2xs">
                      <div className="mb-1 text-xs text-yanci-red line-through">{item.original}</div>
                      <div className="text-xs font-bold text-emerald-700">{item.suggestion}</div>
                      <p className="mt-1 text-[11px] text-yanci-primary/60">{item.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {correctedText && (
                <div className="rounded border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <h5 className="mb-1 text-xs font-bold uppercase text-emerald-800">Cikakken Gyararren Rubutu</h5>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-sans text-xs text-yanci-dark">
                    {correctedText}
                  </pre>
                  {handleApplyBody && (
                    <button
                      type="button"
                      onClick={() => handleApplyBody(correctedText)}
                      className="mt-3 flex items-center gap-1 rounded bg-emerald-700 px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-emerald-800"
                    >
                      <FaCheck className="size-3" /> Aiwatar da Gyaran a Jikin Labarin
                    </button>
                  )}
                </div>
              )}

              {grammarSuggestions.length === 0 && !correctedText && !loading && (
                <div className="py-8 text-center">
                  <p className="text-xs text-yanci-primary/60">Danna "Sake Dubawa" don binciken kuskuren rubutu da nahawu.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: TRANSLATION */}
          {activeTab === 'translate' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-yanci-primary/70">
                  Fassarar Labari (Translation)
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value as 'ha' | 'en')}
                    className="border border-yanci-primary/20 bg-white px-2 py-1 text-xs font-bold"
                  >
                    <option value="ha">Zuwa Hausa</option>
                    <option value="en">Zuwa English</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void translateArticle()}
                    disabled={loading}
                    className="text-xs font-bold text-yanci-accent hover:underline"
                  >
                    Fassara
                  </button>
                </div>
              </div>

              {translation ? (
                <div className="space-y-3 rounded border border-yanci-primary/15 bg-white p-4 shadow-2xs">
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-yanci-dark">
                    {translation}
                  </pre>
                  <div className="flex items-center gap-2 pt-2">
                    {handleApplyBody && (
                      <button
                        type="button"
                        onClick={() => handleApplyBody(translation)}
                        className="flex items-center gap-1.5 rounded bg-yanci-primary px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-yanci-primary/90"
                      >
                        <FaCheck className="size-3" /> Saka a Jikin Labarin
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(translation, 'translation')}
                      className="rounded border border-yanci-primary/20 px-3 py-1.5 text-xs font-semibold text-yanci-primary hover:bg-yanci-paper"
                    >
                      {copiedKey === 'translation' ? 'An kwafa!' : 'Kwafi'}
                    </button>
                  </div>
                </div>
              ) : (
                !loading && (
                  <div className="py-8 text-center">
                    <p className="text-xs text-yanci-primary/60">Zaɓi yaren da kake so sannan danna "Fassara".</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB: SOCIAL & QUOTES */}
          {activeTab === 'social' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-yanci-primary/70">
                  Tsokaci & Sada Zumunta
                </span>
                <button
                  type="button"
                  onClick={() => void generateQuotesAndSocial()}
                  disabled={loading}
                  className="text-xs font-bold text-yanci-accent hover:underline"
                >
                  Sake Nema
                </button>
              </div>

              {/* Social Posts */}
              {socialPosts.length > 0 && (
                <div className="space-y-2.5">
                  <h5 className="text-xs font-bold uppercase text-yanci-primary">Sakonnin Sada Zumunta</h5>
                  {socialPosts.map((post, idx) => (
                    <div key={idx} className="rounded border border-yanci-primary/15 bg-white p-3 shadow-2xs">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-yanci-primary">
                          {post.icon} {post.platform}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(post.text, `social-${idx}`)}
                          className="text-[10px] font-semibold text-yanci-primary/60 hover:text-yanci-primary"
                        >
                          {copiedKey === `social-${idx}` ? 'An kwafa!' : 'Kwafi'}
                        </button>
                      </div>
                      <p className="text-xs text-yanci-dark/80">{post.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Pull Quotes */}
              {pullQuotes.length > 0 && (
                <div className="space-y-2.5">
                  <h5 className="text-xs font-bold uppercase text-yanci-primary">Muhimman Maganganu (Pull Quotes)</h5>
                  {pullQuotes.map((quote, idx) => (
                    <div key={idx} className="rounded border border-purple-200 bg-purple-50/60 p-3">
                      <p className="font-serif text-xs italic text-purple-950">&ldquo;{quote}&rdquo;</p>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`<blockquote>${quote}</blockquote>`, `quote-${idx}`)}
                          className="text-[10px] font-bold text-purple-800 hover:underline"
                        >
                          {copiedKey === `quote-${idx}` ? 'An kwafa!' : 'Kwafi a Matsayin Blockquote'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {socialPosts.length === 0 && pullQuotes.length === 0 && !loading && (
                <div className="py-8 text-center">
                  <p className="text-xs text-yanci-primary/60">Danna "Sake Nema" don ciro sakonnin sada zumunta da quotes.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
