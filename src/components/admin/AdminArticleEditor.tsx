import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FaExpand, FaCompress } from 'react-icons/fa6';
import EditorHeader from './editor/EditorHeader';
import EditorCanvas from './editor/EditorCanvas';
import EditorSidebar from './editor/EditorSidebar';
import ArticlePreview from './editor/ArticlePreview';
import BlockInserter from './editor/BlockInserter';
import AiToolsModal from './editor/AiToolsModal';
import PublishConfirmModal from './editor/PublishConfirmModal';
import LinkPickerModal from './editor/LinkPickerModal';
import { PANELS_WITH_HISTORY } from './editor/constants';

const EMPTY_FORM: Record<string, any> = {
  headline: '',
  kicker: '',
  subheading: '',
  trail: '',
  body: '',
  image: '',
  imageCaption: '',
  imageCredit: '',
  imageAlt: '',
  imageFocalX: 50,
  imageFocalY: 50,
  videoUrl: '',
  keyFigures: '',
  series: '',
  pillar: 'news',
  section: 'headlines',
  format: 'news',
  type: 'standard',
  author: '',
  coAuthor: '',
  isLive: false,
  isSensitive: false,
  status: 'draft',
  publishAt: '',
  slug: '',
  metaTitle: '',
  metaDescription: '',
  ogTitle: '',
  ogDescription: '',
  tags: '',
  relatedArticles: '',
  corrections: [],
  pullQuotes: [],
  editorialNotes: [],
};

export interface ArticleDraft {
  $id?: string;
  headline: string;
  kicker: string;
  trail: string;
  body: string;
  image: string;
  pillar: string;
  section: string;
  author: string;
  slug: string;
  isLive?: boolean;
  status: string;
  publishAt?: string;
  isSensitive?: boolean;
  tags?: string[] | string;
  metaTitle?: string;
  metaDescription?: string;
  imageFocalX?: number;
  imageFocalY?: number;
  imageAlt?: string;
  is_breaking?: boolean;
  breaking_until?: string;
  breaking_duration?: number | null;
  review_status?: 'pending' | 'approved' | 'rejected';
  focal_point?: { x: number; y: number } | string;
  // extended
  kicker2?: string;
  subheading?: string;
  imageCaption?: string;
  imageCredit?: string;
  videoUrl?: string;
  keyFigures?: string;
  series?: string;
  format?: string;
  type?: string;
  coAuthor?: string;
  ogTitle?: string;
  ogDescription?: string;
  relatedArticles?: string;
  corrections?: any[];
  pullQuotes?: any[];
  editorialNotes?: any[];
}

interface Props {
  initial?: ArticleDraft | Record<string, any> | null;
}

export default function AdminArticleEditor({ initial }: Props) {
  const isEditing = !!initial?.$id;
  const id = initial?.$id as string | undefined;

  const [uploading, setUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showComponentMenu, setShowComponentMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [aiLinkSuggestions, setAiLinkSuggestions] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [previewMode, setPreviewMode] = useState('write');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [showAiTools, setShowAiTools] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    headlines: any[];
    tags: string[];
    trail: string;
    seo: any;
    social: any;
    pullQuotes: any[];
    imageCaption: string;
  }>({ headlines: [], tags: [], trail: '', seo: null, social: null, pullQuotes: [], imageCaption: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [pullQuotes, setPullQuotes] = useState<any[]>(initial?.pullQuotes || []);
  const [editorialNotes, setEditorialNotes] = useState<any[]>(initial?.editorialNotes || []);

  const [formData, setFormData] = useState<Record<string, any>>(() => ({
    ...EMPTY_FORM,
    ...(initial || {}),
    tags: Array.isArray(initial?.tags) ? (initial!.tags as string[]).join(', ') : (initial?.tags as string) || '',
    imageFocalX: (initial as any)?.imageFocalX ?? 50,
    imageFocalY: (initial as any)?.imageFocalY ?? 50,
    status: (initial as any)?.status ?? 'draft',
    // ensure corrections etc are arrays
    corrections: (initial as any)?.corrections || [],
    pullQuotes: (initial as any)?.pullQuotes || [],
    editorialNotes: (initial as any)?.editorialNotes || [],
  }));

  const saveTimeoutRef = useRef<number | null>(null);
  const quillRef = useRef<any>(null);

  const headlineLen = (formData.headline || '').length;
  const headlineTooLong = headlineLen > 80;

  // Mock user / articles for sidebar
  const [user] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);

  useEffect(() => {
    // Load articles for related picker / link picker
    fetch('/api/admin/articles?limit=100')
      .then((r) => r.json())
      .catch(() => ({}))
      .then((data: any) => {
        if (Array.isArray(data.articles)) setArticles(data.articles);
        else if (Array.isArray(data.documents)) setArticles(data.documents);
      })
      .catch(() => {});
  }, []);

  const articleHealth = useMemo(() => {
    const checks = [
      { ok: !!(formData.headline || '').trim(), label: 'Headline' },
      { ok: !!(formData.trail || '').trim(), label: 'Summary' },
      { ok: !!formData.image, label: 'Featured image' },
      { ok: !!(formData.tags || '').trim(), label: 'Tags' },
      { ok: (formData.metaTitle || formData.headline || '').length <= 60, label: 'Meta title ≤ 60' },
      { ok: (formData.metaDescription || formData.trail || '').length <= 160, label: 'Meta desc ≤ 160' },
    ];
    const passed = checks.filter((c) => c.ok).length;
    return { checks, passed, total: checks.length, score: Math.round((passed / checks.length) * 100) };
  }, [formData.headline, formData.trail, formData.image, formData.tags, formData.metaTitle, formData.metaDescription]);

  const linkSuggestions = useMemo(() => {
    if (!linkSearch) return articles.filter((a: any) => (a.status || 'published') === 'published').slice(0, 8);
    const q = linkSearch.toLowerCase();
    return articles
      .filter(
        (a: any) =>
          (a.status || 'published') === 'published' &&
          ((a.headline || '').toLowerCase().includes(q) || (a.tags || '').toString().toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [linkSearch, articles]);

  useEffect(() => {
    const text = (formData.body || '').replace(/<[^>]*>/g, ' ');
    setWordCount(text.trim().split(/\s+/).filter((w: string) => w.length > 0).length);
  }, [formData.body]);

  useEffect(() => {
    if (formData.headline && !formData.slug) {
      const auto = formData.headline
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80);
      if (auto) setFormData((p: Record<string, any>) => ({ ...p, slug: auto }));
    }
  }, [formData.headline]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  // Keep initial sync if editing and initial changes
  useEffect(() => {
    if (initial && isEditing) {
      setFormData((prev: Record<string, any>) => ({
        ...EMPTY_FORM,
        ...initial,
        tags: Array.isArray(initial.tags) ? (initial.tags as string[]).join(', ') : (initial.tags as string) || '',
        imageFocalX: (initial as any).imageFocalX ?? 50,
        imageFocalY: (initial as any).imageFocalY ?? 50,
      }));
      setPullQuotes((initial as any).pullQuotes || []);
      setEditorialNotes((initial as any).editorialNotes || []);
    }
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = (e.target.files as FileList)?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.message || 'Upload failed');
      setFormData((prev: Record<string, any>) => ({ ...prev, [field]: data.url }));
      setIsDirty(true);
    } catch (error) {
      alert('File upload failed.');
      console.error(error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const computeDiff = (oldArticle: Record<string, any>, newArticle: Record<string, any>) => {
    const diff: Record<string, string[]> = { added: [], removed: [], changed: [] };
    const fields = ['headline', 'kicker', 'trail', 'body', 'status', 'tags', 'section', 'pillar'];
    for (const field of fields) {
      const oldVal = oldArticle[field];
      const newVal = newArticle[field];
      if (oldVal !== newVal) {
        if (oldVal == null || oldVal === '') diff.added.push(field);
        else if (newVal == null || newVal === '') diff.removed.push(field);
        else diff.changed.push(field);
      }
    }
    return diff;
  };

  const handleSave = useCallback(async () => {
    try {
      let dataToSave: Record<string, any> = { ...formData };
      // Normalize tags to array for API
      if (typeof dataToSave.tags === 'string') {
        dataToSave.tags = (dataToSave.tags as string)
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);
      }
      if (dataToSave.status === 'scheduled' && dataToSave.publishAt) {
        const publishTime = new Date(dataToSave.publishAt).getTime();
        if (Date.now() >= publishTime) dataToSave.status = 'published';
      }

      if (isEditing && id) {
        try {
          const currentArticle = articles.find((a: any) => a.$id === id || a.id === id) || initial;
          if (currentArticle) {
            const diff = computeDiff(currentArticle as Record<string, any>, dataToSave);
            if (Object.keys(diff).length > 0) {
              await fetch('/api/admin/revisions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  articleId: id,
                  title: dataToSave.headline,
                  changedFields: [...diff.added, ...diff.changed, ...diff.removed],
                  snapshot: currentArticle,
                  authorName: (user as any)?.name || dataToSave.author || 'unknown',
                }),
              }).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('Failed to save revision:', e);
        }

        const res = await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || out.ok === false) throw new Error(out.message || 'Update failed');
      } else {
        const res = await fetch('/api/admin/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.message || 'Create failed');
        const newId = out.id || out.$id;
        if (newId) window.location.assign(`/admin/articles/${encodeURIComponent(newId)}`);
        return;
      }
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save article:', error);
      alert((error as Error).message || 'Failed to save');
    }
  }, [isEditing, id, formData, articles, initial, user]);

  useEffect(() => {
    if (isDirty) {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => {
        void handleSave();
      }, 10000);
    }
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [formData, isDirty, handleSave]);

  const onClickSave = () => {
    if (formData.status === 'published' && !isEditing) {
      setShowPublishConfirm(true);
    } else {
      void handleSave();
    }
  };

  const generateAiSuggestions = useCallback(async () => {
    setAiError('');
    if (!formData.body && !formData.headline) {
      setAiError('Write some content first to get AI suggestions.');
      setShowAiTools(true);
      return;
    }
    setAiLoading(true);
    setShowAiTools(true);

    try {
      // Use Astro AI proxy endpoints sequentially
      const bodyText = formData.body || formData.headline || '';
      const fetchJson = async (url: string, payload: any) => {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.ok === false) throw new Error(j.message || 'AI error');
        return j;
      };

      const [headlinesRes, tagsRes, trailRes, seoRes, socialRes, pullRes] = await Promise.allSettled([
        fetchJson('/api/ai/headline', { text: `${formData.headline}\n${bodyText}`, format: formData.format }).catch(() => null),
        fetchJson('/api/ai/tags', { text: bodyText }).catch(() => null),
        formData.trail
          ? Promise.resolve(null)
          : fetchJson('/api/ai/summarize', { text: bodyText }).catch(() => null),
        fetchJson('/api/ai/seo', { headline: formData.headline, body: bodyText, trail: formData.trail }).catch(() => null),
        fetchJson('/api/ai/social', { text: `${formData.headline}\n${formData.trail}\n${bodyText}` }).catch(() => null),
        fetchJson('/api/ai/pull-quotes', { text: bodyText }).catch(() => null),
      ]);

      const get = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? r.value : null);

      const h = get(headlinesRes);
      const t = get(tagsRes);
      const tr = get(trailRes);
      const s = get(seoRes);
      const so = get(socialRes);
      const pq = get(pullRes);

      setAiSuggestions({
        headlines: h?.headlines ? h.headlines.map((x: any) => (typeof x === 'string' ? { headline: x, style: 'Option' } : x)) : [],
        tags: Array.isArray(t?.tags) ? t.tags : [],
        trail: tr?.summary || tr?.trail || '',
        seo: s ? { metaTitle: s.metaTitle || s.title, metaDescription: s.metaDescription || s.description, ogTitle: s.ogTitle || s.metaTitle, ogDescription: s.ogDescription || s.metaDescription } : null,
        social: so?.posts || so?.social || null,
        pullQuotes: Array.isArray(pq?.quotes) ? pq.quotes.map((q: any) => (typeof q === 'string' ? { quote: q } : q)) : [],
        imageCaption: '',
      });

      const hasAny = !!(h?.headlines?.length || t?.tags?.length || tr?.summary || s || so);
      if (!hasAny) setAiError('AI returned no suggestions. Try adding more content.');
    } catch (e: any) {
      setAiError('AI generation failed: ' + (e.message || 'Unknown error'));
    } finally {
      setAiLoading(false);
    }
  }, [formData.body, formData.headline, formData.trail, formData.format]);

  const applyAiTag = (tag: string) => {
    const existing: string[] = String(formData.tags || '')
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
    if (!existing.includes(tag)) {
      setFormData((p: Record<string, any>) => ({ ...p, tags: [...existing, tag].join(', ') }));
      setIsDirty(true);
    }
  };

  const applyAllAiTags = () => {
    const existing: string[] = String(formData.tags || '')
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
    const newTags = aiSuggestions.tags.filter((t) => !existing.includes(t));
    if (newTags.length > 0) {
      setFormData((p: Record<string, any>) => ({ ...p, tags: [...existing, ...newTags].join(', ') }));
      setIsDirty(true);
    }
  };

  const applyAiSeo = () => {
    if (!aiSuggestions.seo) return;
    setFormData((p: Record<string, any>) => ({
      ...p,
      metaTitle: aiSuggestions.seo.metaTitle || p.metaTitle,
      metaDescription: aiSuggestions.seo.metaDescription || p.metaDescription,
      ogTitle: aiSuggestions.seo.ogTitle || p.ogTitle,
      ogDescription: aiSuggestions.seo.ogDescription || p.ogDescription,
    }));
    setIsDirty(true);
  };

  const extractPullQuote = () => {
    // Textarea fallback: prompt for selection
    const el = quillRef.current as unknown as HTMLTextAreaElement | null;
    if (el && el.tagName === 'TEXTAREA') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = el.value.slice(start, end).trim();
      if (!text || text.length < 10) {
        alert('Select at least 10 characters to create a pull quote.');
        return;
      }
      const newQuote = { id: Date.now().toString(), text, position: start, createdAt: new Date().toISOString() };
      const updated = [...pullQuotes, newQuote];
      setPullQuotes(updated);
      setFormData((p: Record<string, any>) => ({ ...p, pullQuotes: updated }));
      setIsDirty(true);
      return;
    }
    const quill = (quillRef.current as any)?.getEditor?.();
    if (!quill) return;
    const range = quill.getSelection();
    if (!range || range.length < 10) {
      alert('Select at least 10 characters to create a pull quote.');
      return;
    }
    const text = quill.getText(range.index, range.length).trim();
    const newQuote = { id: Date.now().toString(), text, position: range.index, createdAt: new Date().toISOString() };
    const updated = [...pullQuotes, newQuote];
    setPullQuotes(updated);
    setFormData((p: Record<string, any>) => ({ ...p, pullQuotes: updated }));
    setIsDirty(true);
    quill.insertText(range.index + range.length, ' ', { 'pull-quote-marker': newQuote.id } as any);
  };

  const removePullQuote = (id: string) => {
    const updated = pullQuotes.filter((q) => q.id !== id);
    setPullQuotes(updated);
    setFormData((p: Record<string, any>) => ({ ...p, pullQuotes: updated }));
    setIsDirty(true);
  };

  const addEditorialNote = (text: string) => {
    if (!text.trim()) return;
    const note = { id: Date.now().toString(), text: text.trim(), author: user?.name || 'Unknown', createdAt: new Date().toISOString(), resolved: false };
    const updated = [...editorialNotes, note];
    setEditorialNotes(updated);
    setFormData((p: Record<string, any>) => ({ ...p, editorialNotes: updated }));
    setIsDirty(true);
  };

  const resolveNote = (id: string) => {
    const updated = editorialNotes.map((n) => (n.id === id ? { ...n, resolved: true } : n));
    setEditorialNotes(updated);
    setFormData((p: Record<string, any>) => ({ ...p, editorialNotes: updated }));
    setIsDirty(true);
  };

  const deleteNote = (id: string) => {
    const updated = editorialNotes.filter((n) => n.id !== id);
    setEditorialNotes(updated);
    setFormData((p: Record<string, any>) => ({ ...p, editorialNotes: updated }));
    setIsDirty(true);
  };

  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [grammarResult, setGrammarResult] = useState<any>(null);
  const [translating, setTranslating] = useState(false);
  const [altTextGenerating, setAltTextGenerating] = useState(false);
  const [headlineScores, setHeadlineScores] = useState<any[]>([]);
  const [scoringHeadlines, setScoringHeadlines] = useState(false);
  const [discoverAnalysis, setDiscoverAnalysis] = useState<any>(null);
  const [analyzingDiscover, setAnalyzingDiscover] = useState(false);
  const [repurposedContent, setRepurposedContent] = useState<any>(null);
  const [repurposing, setRepurposing] = useState(false);
  const [suggestingLinks, setSuggestingLinks] = useState(false);

  const runGrammarCheck = async () => {
    if (!formData.body) return;
    setCheckingGrammar(true);
    try {
      const res = await fetch('/api/ai/grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: formData.body }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Grammar check failed');
      setGrammarResult(data);
    } catch (e: any) {
      alert('Grammar check failed: ' + e.message);
    } finally {
      setCheckingGrammar(false);
    }
  };

  const simplifySelectedText = async () => {
    const el = quillRef.current as unknown as HTMLTextAreaElement | null;
    if (el && el.tagName === 'TEXTAREA') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (end - start < 10) {
        alert('Select at least 10 characters to simplify.');
        return;
      }
      setTranslating(true);
      try {
        const text = el.value.slice(start, end).trim();
        const res = await fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, targetLang: 'simple' }) });
        const data = await res.json().catch(() => ({}));
        const simplified = data.translation || data.simplified || text;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);
        const next = before + simplified + after;
        (el as any).value = next;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        setFormData((p: Record<string, any>) => ({ ...p, body: next }));
        setIsDirty(true);
      } catch (e: any) {
        alert('Simplify failed: ' + e.message);
      } finally {
        setTranslating(false);
      }
      return;
    }
    const quill = (quillRef.current as any)?.getEditor?.();
    if (!quill) return;
    const range = quill.getSelection();
    if (!range || range.length < 10) {
      alert('Select at least 10 characters to simplify.');
      return;
    }
    setTranslating(true);
    try {
      const text = quill.getText(range.index, range.length).trim();
      const res = await fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, targetLang: 'simple' }) });
      const data = await res.json().catch(() => ({}));
      const simplified = data.translation || data.simplified || text;
      quill.deleteText(range.index, range.length);
      quill.insertText(range.index, simplified);
      setIsDirty(true);
    } catch (e: any) {
      alert('Simplify failed: ' + e.message);
    } finally {
      setTranslating(false);
    }
  };

  const translateHeadline = async (lang: string) => {
    if (!formData.headline) return;
    setTranslating(true);
    try {
      const res = await fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: formData.headline, targetLang: lang }) });
      const data = await res.json().catch(() => ({}));
      const translated = data.translation || '';
      if (translated) {
        setFormData((p: Record<string, any>) => ({ ...p, headline: translated }));
        setIsDirty(true);
      }
    } catch (e: any) {
      alert('Translation failed: ' + e.message);
    } finally {
      setTranslating(false);
    }
  };

  const generateAltText = async () => {
    if (!formData.image) return;
    setAltTextGenerating(true);
    try {
      const res = await fetch('/api/ai/alt-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: formData.image, headline: formData.headline, body: formData.body }) });
      const data = await res.json().catch(() => ({}));
      const altText = data.altText || data.alt || '';
      if (altText) {
        setFormData((p: Record<string, any>) => ({ ...p, imageAlt: altText }));
        setIsDirty(true);
      }
    } catch (e: any) {
      alert('Alt text generation failed: ' + e.message);
    } finally {
      setAltTextGenerating(false);
    }
  };

  const runHeadlineScoring = async () => {
    if (!formData.body) return;
    setScoringHeadlines(true);
    try {
      const allHeadlines = [formData.headline, ...aiSuggestions.headlines.map((h: any) => h.headline)].filter(Boolean);
      const res = await fetch('/api/ai/score-headlines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ headlines: allHeadlines, body: formData.body }) });
      const data = await res.json().catch(() => ({}));
      const scores = Array.isArray(data.scores) ? data.scores : [];
      setHeadlineScores(scores.sort((a: any, b: any) => b.score - a.score));
    } catch (e: any) {
      alert('Headline scoring failed: ' + e.message);
    } finally {
      setScoringHeadlines(false);
    }
  };

  const runDiscoverAnalysis = async () => {
    if (!formData.body) return;
    setAnalyzingDiscover(true);
    try {
      const res = await fetch('/api/ai/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ headline: formData.headline, body: formData.body, image: formData.image, tags: formData.tags }) });
      const data = await res.json().catch(() => ({}));
      setDiscoverAnalysis(data);
    } catch (e: any) {
      alert('Discover analysis failed: ' + e.message);
    } finally {
      setAnalyzingDiscover(false);
    }
  };

  const runContentRepurpose = async () => {
    if (!formData.body) return;
    setRepurposing(true);
    try {
      const res = await fetch('/api/ai/repurpose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ headline: formData.headline, body: formData.body, trail: formData.trail, tags: formData.tags }) });
      const data = await res.json().catch(() => ({}));
      setRepurposedContent(data);
    } catch (e: any) {
      alert('Content repurposing failed: ' + e.message);
    } finally {
      setRepurposing(false);
    }
  };

  const insertInternalLink = (article: any) => {
    const el = quillRef.current as unknown as HTMLTextAreaElement | null;
    if (el && el.tagName === 'TEXTAREA') {
      const rangeStart = el.selectionStart ?? 0;
      const linkHtml = `<a href="/article/${article.$id || article.id}">${article.headline}</a>`;
      const before = el.value.slice(0, rangeStart);
      const after = el.value.slice(rangeStart);
      const next = before + linkHtml + after;
      (el as any).value = next;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      setFormData((p: Record<string, any>) => ({ ...p, body: next }));
      setIsDirty(true);
      setShowLinkPicker(false);
      setLinkSearch('');
      setAiLinkSuggestions([]);
      return;
    }
    const quill = (quillRef.current as any)?.getEditor?.();
    if (!quill) return;
    const range = quill.getSelection(true);
    const linkHtml = `<a href="/article/${article.$id || article.id}">${article.headline}</a>`;
    quill.clipboard.dangerouslyPasteHTML(range.index, linkHtml);
    setIsDirty(true);
    setShowLinkPicker(false);
    setLinkSearch('');
    setAiLinkSuggestions([]);
  };

  const runAiLinkSuggestions = async () => {
    if (!formData.body) return;
    setSuggestingLinks(true);
    try {
      const res = await fetch('/api/ai/suggest-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ headline: formData.headline, body: formData.body, articles: articles.slice(0, 50) }) });
      const data = await res.json().catch(() => ({}));
      const ids: string[] = Array.isArray(data.ids) ? data.ids : Array.isArray(data.suggestions) ? data.suggestions : [];
      const suggested = ids.map((id: string) => articles.find((a: any) => a.$id === id)).filter(Boolean);
      if (suggested.length > 0) {
        setLinkSearch('');
        setAiLinkSuggestions(suggested);
      }
    } catch (e: any) {
      alert('AI link suggestions failed: ' + e.message);
    } finally {
      setSuggestingLinks(false);
    }
  };

  const insertComponent = (type: string, atIndex?: number) => {
    const el = quillRef.current as unknown as HTMLTextAreaElement | null;
    const isTextarea = el && el.tagName === 'TEXTAREA';
    const quill = !isTextarea ? (quillRef.current as any)?.getEditor?.() : null;
    const getInsertAt = () => {
      if (isTextarea) return (el as HTMLTextAreaElement).selectionStart ?? (formData.body || '').length;
      if (quill) {
        const range = quill.getSelection(true);
        return atIndex ?? range.index;
      }
      return 0;
    };
    const insertAt = getInsertAt();
    let placeholder = '';

    switch (type) {
      case 'map': {
        const mapUrl = window.prompt('Enter Google Maps Embed URL:');
        if (mapUrl) placeholder = `<div class="yanci-atom-map" data-url="${mapUrl}">[MAP COMPONENT]</div>`;
        break;
      }
      case 'quote':
        placeholder = `<blockquote><p>"Add your quote here."</p><footer>— Author Name</footer></blockquote>`;
        break;
      case 'highlight':
        placeholder = `<div class="yanci-atom-highlight" style="background:#fbf8f3; border-left:4px solid #c59d5f; padding:1.5rem; margin:2rem 0;"><strong>KEY POINT:</strong><br/>Add important information here...</div>`;
        break;
      case 'review': {
        const reviewTitle = window.prompt('Review Item Name:');
        const rating = window.prompt('Rating (1-5):', '5');
        if (reviewTitle) placeholder = `<div class="yanci-atom-review" data-title="${reviewTitle}" data-rating="${rating}">[REVIEW: ${reviewTitle} - ${rating}/5]</div>`;
        break;
      }
      case 'profile': {
        const name = window.prompt('Name:');
        const role = window.prompt('Role/Title:');
        const image = window.prompt('Image URL (optional):');
        const desc = window.prompt('Description:');
        if (name) {
          const safeDesc = desc ? desc.replace(/"/g, '&quot;') : '';
          placeholder = `<div class="yanci-atom-profile" data-name="${name}" data-role="${role || ''}" data-image="${image || ''}" data-desc="${safeDesc}">[PROFILE: ${name}]</div>`;
        }
        break;
      }
      case 'image': {
        const imgUrl = window.prompt('Image URL:');
        const caption = window.prompt('Caption:');
        const credit = window.prompt('Credit:');
        if (imgUrl) {
          const safeCaption = caption ? caption.replace(/"/g, '&quot;') : '';
          placeholder = `<div class="yanci-atom-image" data-src="${imgUrl}" data-caption="${safeCaption}" data-credit="${credit || ''}">[IMAGE: ${caption || 'Untitled'}]</div>`;
        }
        break;
      }
      case 'youtube': {
        const ytUrl = window.prompt('YouTube URL:');
        if (ytUrl) {
          const match = ytUrl.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
          if (match?.[1]) {
            placeholder = `<div class="yanci-atom-embed" data-type="youtube" data-id="${match[1]}" style="background:#000;color:#fff;padding:2rem;text-align:center;margin:1.5rem 0;border-radius:0.5rem;">[YOUTUBE: ${match[1]}]</div>`;
          }
        }
        break;
      }
      case 'twitter': {
        const tweetUrl = window.prompt('Tweet URL:');
        if (tweetUrl) placeholder = `<div class="yanci-atom-embed" data-type="twitter" data-url="${tweetUrl}" style="background:#f0f0f0;padding:1.5rem;text-align:center;margin:1.5rem 0;border-radius:0.5rem;border:1px solid #ddd;">[TWEET: ${tweetUrl}]</div>`;
        break;
      }
      case 'tiktok': {
        const ttUrl = window.prompt('TikTok URL:');
        if (ttUrl) placeholder = `<div class="yanci-atom-embed" data-type="tiktok" data-url="${ttUrl}" style="background:#000;color:#fff;padding:1.5rem;text-align:center;margin:1.5rem 0;border-radius:0.5rem;">[TIKTOK: ${ttUrl}]</div>`;
        break;
      }
      case 'instagram': {
        const igUrl = window.prompt('Instagram URL:');
        if (igUrl) placeholder = `<div class="yanci-atom-embed" data-type="instagram" data-url="${igUrl}" style="background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;padding:1.5rem;text-align:center;margin:1.5rem 0;border-radius:0.5rem;">[INSTAGRAM: ${igUrl}]</div>`;
        break;
      }
      case 'table': {
        const rows = parseInt(window.prompt('Number of rows:', '3') || '3') || 3;
        const cols = parseInt(window.prompt('Number of columns:', '3') || '3') || 3;
        let tableHtml = '<table style="width:100%;border-collapse:collapse;margin:1.5rem 0;"><thead><tr>';
        for (let c = 0; c < cols; c++) tableHtml += `<th style="border:1px solid #ddd;padding:0.75rem;background:#f9f9f9;font-weight:bold;">Header ${c + 1}</th>`;
        tableHtml += '</tr></thead><tbody>';
        for (let r = 0; r < rows - 1; r++) {
          tableHtml += '<tr>';
          for (let c = 0; c < cols; c++) tableHtml += `<td style="border:1px solid #ddd;padding:0.75rem;">Cell</td>`;
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        placeholder = tableHtml;
        break;
      }
      case 'code': {
        const code = window.prompt('Paste your code:');
        if (code) {
          const lang = window.prompt('Language (optional):', 'javascript') || '';
          const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          placeholder = `<pre style="background:#1e1e1e;color:#d4d4d4;padding:1.5rem;border-radius:0.5rem;overflow-x:auto;font-family:monospace;font-size:0.875rem;margin:1.5rem 0;"><code class="language-${lang}">${escaped}</code></pre>`;
        }
        break;
      }
      case 'internal-link': {
        setShowLinkPicker(true);
        return;
      }
      case 'body-image': {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
            const data = await res.json().catch(() => ({}));
            const fileUrl = data.url;
            if (!fileUrl) throw new Error('Upload failed');
            const caption = window.prompt('Image caption (optional):', '') || '';
            const credit = window.prompt('Image credit (optional):', '') || '';
            const imgHtml = `<figure style="margin:1.5rem 0;"><img src="${fileUrl}" alt="${caption}" style="width:100%;height:auto;border-radius:0.5rem;" /><figcaption style="margin-top:0.5rem;font-size:0.75rem;color:#666;font-family:sans-serif;">${caption}${credit ? ` <span style="color:#999;">| Photo: ${credit}</span>` : ''}</figcaption></figure>`;
            if (isTextarea) {
              const before = (el as HTMLTextAreaElement).value.slice(0, insertAt);
              const after = (el as HTMLTextAreaElement).value.slice(insertAt);
              const next = before + imgHtml + after;
              (el as HTMLTextAreaElement).value = next;
              (el as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
              setFormData((p: Record<string, any>) => ({ ...p, body: next }));
              setIsDirty(true);
            } else if (quill) {
              quill.clipboard.dangerouslyPasteHTML(insertAt, imgHtml);
              setIsDirty(true);
            }
          } catch (error: any) {
            alert('Image upload failed: ' + error.message);
          } finally {
            setUploading(false);
          }
        };
        input.click();
        return;
      }
      default:
        break;
    }

    if (placeholder) {
      if (isTextarea) {
        const before = (el as HTMLTextAreaElement).value.slice(0, insertAt);
        const after = (el as HTMLTextAreaElement).value.slice(insertAt);
        const next = before + placeholder + after;
        (el as HTMLTextAreaElement).value = next;
        (el as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
        setFormData((p: Record<string, any>) => ({ ...p, body: next }));
        setIsDirty(true);
      } else if (quill) {
        quill.clipboard.dangerouslyPasteHTML(insertAt, placeholder);
        setIsDirty(true);
      }
    }
    setShowComponentMenu(false);
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden relative transition-colors duration-300 ${isFullscreen ? 'bg-[#fafafa]' : 'bg-white'}`}>
      <EditorHeader
        title={formData.headline}
        status={formData.status}
        isDirty={isDirty}
        lastSaved={lastSaved}
        wordCount={wordCount}
        uploading={uploading}
        isFullscreen={isFullscreen}
        previewMode={previewMode}
        aiLoading={aiLoading}
        onBack={() => (window.location.href = '/admin/articles')}
        onSave={onClickSave}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onAiSuggestions={generateAiSuggestions}
        setPreviewMode={setPreviewMode}
      />

      {isFullscreen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white/90 backdrop-blur border border-gray-200 rounded-full px-4 py-1.5 shadow-sm text-xs font-bold text-gray-500">
          <span className="flex items-center gap-1.5">
            <FaExpand className="w-3 h-3" /> Focus Mode
          </span>
          <span className="text-gray-300">|</span>
          <button onClick={() => setIsFullscreen(false)} className="hover:text-[#052962] transition-colors flex items-center gap-1" type="button">
            <FaCompress className="w-3 h-3" /> Exit <kbd className="font-mono text-[10px] bg-gray-100 px-1 rounded">Esc</kbd>
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <EditorCanvas
          formData={formData}
          setFormData={setFormData}
          setIsDirty={setIsDirty}
          wordCount={wordCount}
          isFullscreen={isFullscreen}
          previewMode={previewMode}
          headlineTooLong={headlineTooLong}
          headlineLen={headlineLen}
          quillRef={quillRef}
          onFileUpload={handleFileUpload}
          uploading={uploading}
          onInsertComponent={insertComponent}
          onOpenLinkPicker={() => setShowLinkPicker(true)}
          onExtractPullQuote={extractPullQuote}
          onSimplifyText={simplifySelectedText}
          showComponentMenu={showComponentMenu}
          setShowComponentMenu={setShowComponentMenu}
        />

        {(previewMode === 'preview' || previewMode === 'split') && (
          <ArticlePreview formData={formData} wordCount={wordCount} pullQuotes={pullQuotes} previewDevice={previewDevice} setPreviewDevice={setPreviewDevice} />
        )}

        {showSidebar && <div className="fixed inset-0 bg-black/20 z-40 xl:hidden" onClick={() => setShowSidebar(false)} />}

        <div
          className={`fixed inset-y-0 right-0 z-40 xl:relative xl:z-auto transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'} ${isFullscreen ? 'hidden xl:hidden' : ''} ${previewMode !== 'write' ? 'hidden xl:hidden' : ''}`}
          style={{ maxWidth: '100vw' }}
        >
          <EditorSidebar
            formData={formData}
            setFormData={setFormData}
            setIsDirty={setIsDirty}
            isEditing={isEditing}
            id={id}
            user={user}
            articles={articles}
            articleHealth={articleHealth}
            wordCount={wordCount}
            pullQuotes={pullQuotes}
            onRemovePullQuote={removePullQuote}
            editorialNotes={editorialNotes}
            onAddNote={addEditorialNote}
            onResolveNote={resolveNote}
            onDeleteNote={deleteNote}
            onOpenLinkPicker={() => setShowLinkPicker(true)}
            onFileUpload={handleFileUpload}
            grammarResult={grammarResult}
            checkingGrammar={checkingGrammar}
            onRunGrammar={runGrammarCheck}
            translating={translating}
            onTranslate={translateHeadline}
            altTextGenerating={altTextGenerating}
            onGenerateAltText={generateAltText}
            headlineScores={headlineScores}
            scoringHeadlines={scoringHeadlines}
            onScoreHeadlines={runHeadlineScoring}
            discoverAnalysis={discoverAnalysis}
            analyzingDiscover={analyzingDiscover}
            onAnalyzeDiscover={runDiscoverAnalysis}
            repurposedContent={repurposedContent}
            repurposing={repurposing}
            onRepurpose={runContentRepurpose}
            aiLoading={aiLoading}
            onGenerateAi={generateAiSuggestions}
          />
        </div>
      </div>

      <BlockInserter onInsert={insertComponent} isFullscreen={isFullscreen} />

      <LinkPickerModal
        open={showLinkPicker}
        onClose={() => {
          setShowLinkPicker(false);
          setLinkSearch('');
          setAiLinkSuggestions([]);
        }}
        search={linkSearch}
        onSearchChange={(v) => {
          setLinkSearch(v);
          setAiLinkSuggestions([]);
        }}
        suggestions={linkSuggestions}
        aiSuggestions={aiLinkSuggestions}
        onSuggest={runAiLinkSuggestions}
        suggesting={suggestingLinks}
        onSelect={insertInternalLink}
      />

      <PublishConfirmModal
        open={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={() => {
          setShowPublishConfirm(false);
          void handleSave();
        }}
        formData={formData}
      />

      <AiToolsModal
        open={showAiTools}
        onClose={() => {
          setShowAiTools(false);
          setAiError('');
        }}
        aiLoading={aiLoading}
        aiError={aiError}
        aiSuggestions={aiSuggestions}
        formData={formData}
        onRegenerate={generateAiSuggestions}
        onApplyHeadline={(h) => {
          setFormData((p: Record<string, any>) => ({ ...p, headline: h }));
          setIsDirty(true);
        }}
        onApplyTrail={() => {
          if (aiSuggestions.trail) {
            setFormData((p: Record<string, any>) => ({ ...p, trail: aiSuggestions.trail }));
            setIsDirty(true);
          }
        }}
        onApplyAllTags={applyAllAiTags}
        onApplyTag={applyAiTag}
        onApplySeo={applyAiSeo}
      />

      <style>{`
        @keyframes bubbleFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .composer-editor textarea { border: none !important; font-family: 'Source Serif 4', Georgia, serif; }
        .composer-editor .ql-container.ql-snow { border: none !important; font-family: 'Source Serif 4', Georgia, serif; }
        .composer-editor .ql-editor { padding: 0 !important; font-size: 1.0625rem; line-height: 1.75; color: #171717; min-height: 500px; }
        @media (min-width: 768px) { .composer-editor .ql-editor { font-size: 1.125rem; } }
        .composer-editor .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid #f0f0f0 !important;
          position: sticky; top: 0; z-index: 40;
          background: white; margin-bottom: 1.5rem;
          padding: 6px 0 !important;
          overflow-x: auto; white-space: nowrap; display: flex; flex-wrap: wrap;
        }
        .composer-editor .ql-editor.ql-blank::before { left: 0 !important; font-style: italic; color: #d1d5db; }
        .composer-editor .ql-editor h1 { font-family: 'Playfair Display', serif; font-weight: 900; }
        .composer-editor .ql-editor h2 { font-family: 'Playfair Display', serif; font-weight: 800; margin-top: 2rem !important; margin-bottom: 1rem !important; }
        .composer-editor .ql-editor h3 { font-family: 'Playfair Display', serif; font-weight: 700; margin-top: 1.5rem !important; margin-bottom: 0.75rem !important; }
        .composer-editor .ql-editor p { margin-bottom: 1.25rem !important; }
        .composer-editor .ql-editor blockquote { border-left: 4px solid #c59d5f; padding-left: 1rem; margin: 1.5rem 0; color: #4b5563; font-style: italic; }
        .composer-editor .ql-editor pre.ql-syntax { background: #1e1e1e; color: #d4d4d4; padding: 1.5rem; border-radius: 0.5rem; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; margin: 1.5rem 0; }
        .composer-editor .ql-editor table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
        .composer-editor .ql-editor table td, .composer-editor .ql-editor table th { border: 1px solid #ddd; padding: 0.75rem; }
        .composer-editor .ql-editor table th { background: #f9f9f9; font-weight: bold; }
        .yanci-atom-map { background: #f0f9ff; border: 2px dashed #0ea5e9; color: #0369a1; padding: 1.5rem; text-align: center; font-weight: bold; margin: 1.5rem 0; border-radius: 0.5rem; font-size: 0.875rem; }
        .yanci-atom-embed { padding: 1.5rem; text-align: center; margin: 1.5rem 0; border-radius: 0.5rem; font-weight: bold; font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
