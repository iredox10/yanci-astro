import React, { useCallback, useEffect, useState } from 'react';

interface SectionOption {
  slug: string;
  label: string;
}

interface OutboxItem {
  id: string;
  title: string;
  body: string;
  url: string;
  audience: string;
  queuedAt: string | null;
  sentCount: number;
}

interface SendResult {
  subscribers: number;
  queueDepth: number;
}

interface Props {
  sections: SectionOption[];
  subscribers: number;
}

const TITLE_MAX = 80;
const BODY_MAX = 200;

function formatWhen(iso: string | null): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationComposer({ sections, subscribers }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [audience, setAudience] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [history, setHistory] = useState<OutboxItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/push/history');
      if (!res.ok) return;
      const data: { ok?: boolean; items?: OutboxItem[] } = await res.json().catch(() => ({}));
      if (data.items) setHistory(data.items);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          url: url.trim() || '/',
          audience,
        }),
      });
      const data: { ok?: boolean; message?: string; subscribers?: number; queueDepth?: number } =
        await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'An kasa aikawa');
      setResult({
        subscribers: data.subscribers ?? subscribers,
        queueDepth: data.queueDepth ?? 1,
      });
      setTitle('');
      setBody('');
      setUrl('');
      setAudience('all');
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An kasa aikawa');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40';
  const labelClass =
    'mb-1 block text-xs font-bold uppercase tracking-wide text-yanci-primary/70';

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <form onSubmit={submit} className="border border-yanci-primary/15 bg-white/60 p-5">
        <h2 className="font-serif text-lg font-bold text-yanci-primary">Rubuta sanarwa</h2>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className={labelClass}>Take</span>
            <input
              type="text"
              required
              maxLength={TITLE_MAX}
              value={title}
              onInput={(e) => setTitle(e.currentTarget.value)}
              placeholder="Kai tsaye: ..."
              className={inputClass}
            />
            <span className="mt-1 block text-right text-xs text-yanci-primary/50">
              {title.length}/{TITLE_MAX}
            </span>
          </label>
          <label className="block">
            <span className={labelClass}>Sa&#281;onni</span>
            <textarea
              required
              rows={3}
              maxLength={BODY_MAX}
              value={body}
              onInput={(e) => setBody(e.currentTarget.value)}
              placeholder="Taƙaice labarin a &#351;arara..."
              className={inputClass}
            />
            <span className="mt-1 block text-right text-xs text-yanci-primary/50">
              {body.length}/{BODY_MAX}
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Hanya (na za&#331;i)</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Sashe</span>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className={inputClass}
              >
                <option value="all">Duka</option>
                {sections.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={busy || !title.trim() || !body.trim()}
          className="mt-5 w-full bg-yanci-primary px-5 py-2 text-sm font-bold uppercase tracking-wide text-yanci-paper hover:bg-yanci-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Ana tsara aikawa...' : `Aika ga masu karba (${subscribers})`}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-xs text-yanci-red">
            {error}
          </p>
        )}
        {result && (
          <div className="mt-3 rounded-sm bg-emerald-50 p-3 text-xs text-emerald-800">
            <p className="font-bold text-emerald-700">An shigar da sanarwa cikin jerin aikawa.</p>
            <p className="mt-1 text-emerald-700/80">
              Masu karba: {result.subscribers} &middot; Matsayi a jeri: {result.queueDepth}
            </p>
          </div>
        )}
      </form>

      <section aria-label="Tarihin sanarwa" className="border border-yanci-primary/15 bg-white/60 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-yanci-primary">Tarihin kwanan nan</h2>
          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={historyLoading}
            className="border border-yanci-primary/30 px-2.5 py-1 text-xs font-medium text-yanci-primary hover:bg-yanci-primary/10 disabled:opacity-50"
          >
            {historyLoading ? 'Ana sabuntawa...' : 'Sabunta'}
          </button>
        </div>
        {!historyLoading && history.length === 0 && (
          <p className="mt-6 text-sm text-yanci-primary/50">
            Babu sanarwa da aka tsara tukuna.
          </p>
        )}
        <ul className="mt-4 divide-y divide-yanci-primary/10">
          {history.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <p className="truncate text-sm font-bold text-yanci-dark">{item.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-yanci-dark/60">{item.body}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-yanci-primary/60">
                <span>{formatWhen(item.queuedAt)}</span>
                <span className="rounded-full bg-yanci-primary/10 px-2 py-0.5 font-medium capitalize">
                  {item.audience === 'all' ? 'Duka' : item.audience}
                </span>
                <span
                  className={
                    item.sentCount > 0
                      ? 'rounded-full bg-emerald-100 px-2 py-0.5 font-bold uppercase text-emerald-700'
                      : 'rounded-full bg-amber-100 px-2 py-0.5 font-bold uppercase text-amber-700'
                  }
                >
                  {item.sentCount > 0 ? `An tura ${item.sentCount}` : 'Jiran aikawa'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
