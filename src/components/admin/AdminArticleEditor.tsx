import { useState } from 'react';

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

  const set = <K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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
          <textarea
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
            rows={18}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
          />
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
      </div>

      {error && (
        <p className="border border-yanci-red/30 bg-yanci-red/10 px-3 py-2 text-sm text-yanci-red">{error}</p>
      )}
      {saved && (
        <p className="border border-yanci-teal/30 bg-yanci-teal/10 px-3 py-2 text-sm text-yanci-teal">
          Saved.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="bg-yanci-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-yanci-paper transition-colors hover:bg-yanci-primary/90 disabled:opacity-50"
        >
          {busy ? 'Saving…' : form.$id ? 'Save changes' : 'Create article'}
        </button>
        <a href="/admin/articles" className="px-3 py-2 text-sm font-medium text-yanci-primary/70 hover:text-yanci-primary">
          Cancel
        </a>
      </div>
    </form>
  );
}