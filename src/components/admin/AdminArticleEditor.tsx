import { useRef, useState } from 'react';
import RevisionHistoryDrawer from './editor/RevisionHistoryDrawer';
import EditorialNotes from './editor/EditorialNotes';
import InsertMenu, {
  applyInsert,
  filterCommands,
  slashQueryBefore,
  type InsertCommand,
} from './editor/InsertMenu';

const SLASH_LINE_HEIGHT = 20;

function slashTop(el: HTMLTextAreaElement, caret: number): number {
  const line = el.value.slice(0, caret).split('\n').length;
  return Math.min(Math.max(8 + (line - 1) * SLASH_LINE_HEIGHT - el.scrollTop, 4), 240);
}

const SNAPSHOT_FIELDS = [
  'headline',
  'kicker',
  'trail',
  'body',
  'image',
  'pillar',
  'section',
  'author',
  'slug',
  'isLive',
  'status',
  'publishAt',
  'isSensitive',
  'tags',
  'metaTitle',
  'metaDescription',
] as const;

function normField(value: unknown): string {
  return Array.isArray(value) ? value.join('\u0000') : String(value ?? '');
}

function formSignature(f: ArticleDraft): string {
  return SNAPSHOT_FIELDS.map((k) => normField(f[k] as unknown)).join('\u0001');
}

function changedFields(prev: ArticleDraft | null, next: ArticleDraft): string[] {
  if (!prev) return ['create'];
  const out: string[] = [];
  for (const key of SNAPSHOT_FIELDS) {
    if (normField(prev[key] as unknown) !== normField(next[key] as unknown)) out.push(key);
  }
  return out;
}

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
  isLive: boolean;
  status: string;
  publishAt?: string;
  isSensitive?: boolean;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

const PILLARS = ['news', 'sport', 'opinion', 'culture', 'lifestyle'];

const empty: ArticleDraft = {
  headline: '',
  kicker: '',
  trail: '',
  body: '',
  image: '',
  pillar: 'news',
  section: '',
  author: '',
  slug: '',
  isLive: false,
  status: 'draft',
};

export default function AdminArticleEditor({ initial }: { initial?: Partial<ArticleDraft> | null }) {
  const [form, setForm] = useState<ArticleDraft>({
    ...empty,
    ...initial,
    tags: initial?.tags ?? [],
    status: initial?.status ?? (initial?.isLive ? 'published' : 'draft'),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastSavedRef = useRef<ArticleDraft | null>(null);
  const snapshotBusyRef = useRef(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [slash, setSlash] = useState<{ open: boolean; query: string; index: number; top: number }>({
    open: false,
    query: '',
    index: 0,
    top: 8,
  });
  const slashCommands = filterCommands(slash.query);
  const slashSelected = slashCommands.length > 0 ? Math.min(slash.index, slashCommands.length - 1) : 0;

  const set = <K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function onBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    const el = e.currentTarget;
    const value = el.value;
    const caret = el.selectionStart ?? value.length;
    set('body', value);
    try {
      const query = slashQueryBefore(value, caret);
      if (query !== null) {
        setSlash({ open: true, query, index: 0, top: slashTop(el, caret) });
      } else {
        setSlash((s) => (s.open ? { ...s, open: false } : s));
      }
    } catch {
      setSlash((s) => ({ ...s, open: false }));
    }
  }

  function onBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (!slash.open || slashCommands.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSlash((s) => ({ ...s, index: (slashSelected + 1) % slashCommands.length }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSlash((s) => ({
        ...s,
        index: (slashSelected - 1 + slashCommands.length) % slashCommands.length,
      }));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applyPicked(slashCommands[slashSelected]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSlash((s) => ({ ...s, open: false }));
    }
  }

  function applyPicked(cmd: InsertCommand): void {
    try {
      const el = bodyRef.current;
      const caret = el?.selectionStart ?? form.body.length;
      const next = applyInsert(form.body, caret, slash.query.length, cmd);
      set('body', next.value);
      setSlash({ open: false, query: '', index: 0, top: slash.top });
      if (el) {
        requestAnimationFrame(() => {
          try {
            el.focus();
            el.setSelectionRange(next.caret, next.caret);
          } catch {
            // element detached — nothing to restore
          }
        });
      }
    } catch {
      setSlash((s) => ({ ...s, open: false }));
    }
  }

  async function maybeSnapshot(current: ArticleDraft): Promise<void> {
    const articleId = current.$id;
    if (!articleId || snapshotBusyRef.current) return;
    const prev = lastSavedRef.current;
    if (prev && formSignature(prev) === formSignature(current)) return;
    snapshotBusyRef.current = true;
    try {
      await fetch('/api/admin/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          title: current.headline,
          changedFields: changedFields(prev, current),
          snapshot: current,
          authorName: current.author || 'unknown',
        }),
      });
    } catch {
      // revisions are best-effort; a failed snapshot must never block saving
    } finally {
      lastSavedRef.current = { ...current };
      snapshotBusyRef.current = false;
    }
  }

  function restoreFrom(snapshot: Record<string, unknown>): void {
    try {
      const status = String(snapshot.status ?? '');
      setForm((f) => ({
        ...f,
        headline: String(snapshot.headline ?? f.headline),
        kicker: String(snapshot.kicker ?? ''),
        trail: String(snapshot.trail ?? ''),
        body: String(snapshot.body ?? ''),
        image: String(snapshot.image ?? ''),
        pillar: String(snapshot.pillar ?? f.pillar),
        section: String(snapshot.section ?? ''),
        author: String(snapshot.author ?? ''),
        slug: String(snapshot.slug ?? ''),
        isLive: Boolean(snapshot.isLive),
        status: ['draft', 'published', 'scheduled'].includes(status)
          ? status
          : f.status,
        publishAt: typeof snapshot.publishAt === 'string' && snapshot.publishAt ? snapshot.publishAt : undefined,
        isSensitive: Boolean(snapshot.isSensitive),
        tags: Array.isArray(snapshot.tags)
          ? snapshot.tags.map(String).filter(Boolean).slice(0, 40)
          : [],
        metaTitle:
          typeof snapshot.metaTitle === 'string' && snapshot.metaTitle ? snapshot.metaTitle : undefined,
        metaDescription:
          typeof snapshot.metaDescription === 'string' && snapshot.metaDescription
            ? snapshot.metaDescription
            : undefined,
      }));
      setInfo('An dawo da wannan sigar — danna "Save changes" don ajiya.');
      setError(null);
      setSaved(false);
    } catch {
      // ignore malformed snapshots; form state stays as-is
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    const payload = {
      ...form,
      slug: form.slug || undefined,
      image: form.image || undefined,
    };

    try {
      const url = form.$id ? `/api/admin/articles/${form.$id}` : '/api/admin/articles';
      const res = await fetch(url, {
        method: form.$id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'Save failed');

      if (data.id && !form.$id) {
        window.location.assign(`/admin/articles/${encodeURIComponent(data.id)}`);
        return;
      }
      setSaved(true);
      setBusy(false);
      void maybeSnapshot(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setBusy(false);
    }
  }

  const inputClass =
    'mt-1 w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40';
  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-yanci-primary/70';

  return (
    <form onSubmit={submit} className="mt-4 space-y-5">
      <div className="grid gap-5 sm:grid-cols-6">
        <label className="block sm:col-span-4">
          <span className={labelClass}>Headline *</span>
          <input
            value={form.headline}
            onChange={(e) => set('headline', e.target.value)}
            required
            maxLength={200}
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Kicker</span>
          <input value={form.kicker} onChange={(e) => set('kicker', e.target.value)} maxLength={120} className={inputClass} />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Pillar</span>
          <select value={form.pillar} onChange={(e) => set('pillar', e.target.value)} className={inputClass}>
            {PILLARS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Section</span>
          <input value={form.section} onChange={(e) => set('section', e.target.value)} maxLength={60} className={inputClass} />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Author</span>
          <input value={form.author} onChange={(e) => set('author', e.target.value)} maxLength={120} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Slug</span>
          <input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            placeholder="leave blank to auto-generate"
            maxLength={160}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-4">
          <span className={labelClass}>Image</span>
          <div className="flex gap-2">
            <input value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="https://…" className={inputClass} />
            <label className="shrink-0 cursor-pointer border border-yanci-primary/30 px-4 py-2 text-xs font-bold uppercase tracking-wide text-yanci-primary/70 transition-colors hover:bg-yanci-primary/10">
              Loda
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append('file', file);
                  const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok && data.url) set('image', data.url);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </label>

        <label className="block sm:col-span-4">
          <span className={labelClass}>Trail</span>
          <textarea
            value={form.trail}
            onChange={(e) => set('trail', e.target.value)}
            maxLength={500}
            rows={2}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-4">
          <span className={labelClass}>Body (HTML)</span>
          <div className="relative">
            <textarea
              ref={bodyRef}
              value={form.body}
              onChange={onBodyChange}
              onKeyDown={onBodyKeyDown}
              onBlur={() => setSlash((s) => (s.open ? { ...s, open: false } : s))}
              rows={18}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
            {slash.open && slashCommands.length > 0 && (
              <InsertMenu
                commands={slashCommands}
                selected={slashSelected}
                top={slash.top}
                onHover={(i) => setSlash((s) => ({ ...s, index: i }))}
                onPick={applyPicked}
              />
            )}
          </div>
          <p className="mt-1 text-[11px] text-yanci-primary/40">Rubuta "/" a jiki don shiga tsokaci.</p>
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Status</span>
          <select value={form.status} onChange={(e) => set('status', e.target.value as ArticleDraft['status'])} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Publish at</span>
          <input
            type="datetime-local"
            value={form.publishAt ?? ''}
            onChange={(e) => set('publishAt', e.target.value || undefined)}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-4">
          <span className={labelClass}>Tags (comma separated)</span>
          <input
            value={(form.tags ?? []).join(', ')}
            onChange={(e) =>
              set(
                'tags',
                e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              )
            }
            className={inputClass}
          />
        </label>

        <div className="flex flex-wrap items-center gap-6 sm:col-span-4">
          <label className="flex items-center gap-2 text-sm text-yanci-dark/80">
            <input
              type="checkbox"
              checked={Boolean(form.isLive)}
              onChange={(e) => {
                set('isLive', e.target.checked);
                if (e.target.checked && form.status === 'draft') set('status', 'published');
              }}
              className="size-4 accent-yanci-primary"
            />
            Live / visible on site
          </label>
          <label className="flex items-center gap-2 text-sm text-yanci-dark/80">
            <input
              type="checkbox"
              checked={Boolean(form.isSensitive)}
              onChange={(e) => set('isSensitive', e.target.checked)}
              className="size-4 accent-yanci-primary"
            />
            Sensitive content
          </label>
        </div>

        <div className="sm:col-span-6">
          <EditorialNotes key={form.$id ?? 'new'} scope={form.$id ?? 'new'} />
        </div>
      </div>

      {error && (
        <p className="border border-yanci-red/30 bg-yanci-red/10 px-3 py-2 text-sm text-yanci-red">{error}</p>
      )}
      {saved && (
        <p className="border border-yanci-teal/30 bg-yanci-teal/10 px-3 py-2 text-sm text-yanci-teal">
          Saved.
        </p>
      )}
      {info && (
        <p className="border border-yanci-teal/30 bg-yanci-teal/10 px-3 py-2 text-sm text-yanci-teal">{info}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="bg-yanci-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-yanci-paper transition-colors hover:bg-yanci-primary/90 disabled:opacity-50"
        >
          {busy ? 'Saving…' : form.$id ? 'Save changes' : 'Create article'}
        </button>
        <button
          type="button"
          onClick={() => {
            setInfo(null);
            setHistoryOpen(true);
          }}
          disabled={!form.$id}
          title="Tarihin gyare-gyre"
          className="border border-yanci-primary/25 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-yanci-primary transition-colors hover:bg-yanci-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tarihi
        </button>
        <a href="/admin/articles" className="px-3 py-2 text-sm font-medium text-yanci-primary/70 hover:text-yanci-primary">
          Cancel
        </a>
      </div>

      {historyOpen && form.$id && (
        <RevisionHistoryDrawer articleId={form.$id} onClose={() => setHistoryOpen(false)} onRestore={restoreFrom} />
      )}
    </form>
  );
}