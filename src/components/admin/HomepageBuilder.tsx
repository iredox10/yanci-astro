import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface BuilderRow {
  key: string;
  label: string;
  blurb: string;
  position: number;
  enabled: boolean;
  live: boolean;
  docId: string | null;
}

interface LayoutPayload {
  key: string;
  position: number;
  enabled: boolean;
}

interface Props {
  initial: BuilderRow[];
  defaults: LayoutPayload[];
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function sequenced(rows: BuilderRow[]): BuilderRow[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((row, i) => ({ ...row, position: i }));
}

function payload(rows: BuilderRow[]): LayoutPayload[] {
  return rows.map(({ key, position, enabled }) => ({ key, position, enabled }));
}

export default function HomepageBuilder({ initial, defaults }: Props) {
  const [rows, setRows] = useState<BuilderRow[]>(() => sequenced(initial));
  const [status, setStatus] = useState<SaveState>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const flash = useCallback((next: SaveState) => {
    setStatus(next);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStatus('idle'), 2500);
  }, []);

  const persistAll = useCallback(
    async (list: LayoutPayload[]) => {
      setStatus('saving');
      try {
        const res = await fetch('/api/admin/homepage-layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ layout: list }),
        });
        if (!res.ok) throw new Error(String(res.status));
        flash('saved');
      } catch {
        flash('error');
      }
    },
    [flash],
  );

  const move = useCallback(
    (index: number, dir: 'up' | 'down') => {
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= rows.length) return;
      const next = [...rows];
      next[index] = { ...next[index], position: target };
      next[target] = { ...next[target], position: index };
      const ordered = sequenced(next);
      setRows(ordered);
      void persistAll(payload(ordered));
    },
    [rows, persistAll],
  );

  const toggle = useCallback(
    async (row: BuilderRow) => {
      const enabled = !row.enabled;
      const previous = rows;
      setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, enabled } : r)));
      if (row.docId) {
        setStatus('saving');
        try {
          const res = await fetch(`/api/admin/homepage-layout/${encodeURIComponent(row.docId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled }),
          });
          if (!res.ok) throw new Error(String(res.status));
          flash('saved');
        } catch {
          setRows(previous);
          flash('error');
        }
        return;
      }
      await persistAll(payload(previous.map((r) => (r.key === row.key ? { ...r, enabled } : r))));
    },
    [rows, persistAll, flash],
  );

  const reset = useCallback(async () => {
    if (!window.confirm('Mayar da duk sassu zuwa tsarin tsoho?')) return;
    setStatus('saving');
    try {
      const res = await fetch('/api/admin/homepage-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const byKey = new Map(defaults.map((d) => [d.key, d]));
      setRows((rs) =>
        sequenced(rs.map((r) => ({ ...r, position: byKey.get(r.key)?.position ?? r.position, enabled: byKey.get(r.key)?.enabled ?? r.enabled }))),
      );
      flash('saved');
    } catch {
      flash('error');
    }
  }, [defaults, flash]);

  const enabledCount = rows.filter((r) => r.enabled).length;
  const statusLabel =
    status === 'saving'
      ? 'Ana ajiyewa...'
      : status === 'saved'
        ? 'An ajiye'
        : status === 'error'
          ? 'Kuskure: ba a ajiye ba'
          : null;

  return (
    <section aria-label="Sassu shafin farko" className="border border-yanci-primary/15 bg-white/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-yanci-primary/15 bg-yanci-primary/5 px-5 py-3">
        <p className="text-xs font-bold uppercase tracking-widest text-yanci-primary/70">
          Oda da bayyana &middot; {enabledCount}/{rows.length} ana nuna
        </p>
        <div className="flex items-center gap-4">
          {statusLabel && (
            <span
              role="status"
              className={
                status === 'error'
                  ? 'text-xs font-bold text-yanci-red'
                  : status === 'saved'
                    ? 'text-xs font-bold text-emerald-700'
                    : 'text-xs font-medium text-yanci-primary/60'
              }
            >
              {statusLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => void reset()}
            disabled={status === 'saving'}
            className="border border-yanci-primary/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-yanci-primary transition-colors hover:bg-yanci-primary hover:text-yanci-paper disabled:opacity-50"
          >
            Mayar da tsoho
          </button>
        </div>
      </div>

      <ul className="divide-y divide-yanci-primary/10">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className={`flex items-center gap-3 px-5 py-4 sm:gap-4 ${row.enabled ? '' : 'bg-yanci-primary/[0.03] opacity-60'}`}
          >
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full font-serif text-sm font-bold ${
                  row.enabled ? 'bg-yanci-primary text-yanci-paper' : 'bg-yanci-primary/10 text-yanci-primary/50'
                }`}
              >
                {index + 1}
              </span>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(index, 'up')}
                  disabled={index === 0 || status === 'saving'}
                  aria-label={`Daga ${row.label} sama`}
                  className="p-0.5 text-yanci-primary/40 transition-colors hover:text-yanci-primary disabled:opacity-25"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M4.5 15.75 12 8.25l7.5 7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 'down')}
                  disabled={index === rows.length - 1 || status === 'saving'}
                  aria-label={`Daga ${row.label} kasa`}
                  className="p-0.5 text-yanci-primary/40 transition-colors hover:text-yanci-primary disabled:opacity-25"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className={`font-serif text-base font-bold ${row.enabled ? 'text-yanci-dark' : 'text-yanci-dark/50 line-through'}`}>
                  {row.label}
                </p>
                {row.live ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Yana nan a shafi
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Ba a nuna ba tukuna
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-yanci-primary/60">{row.blurb}</p>
              <p className="mt-0.5 font-mono text-[10px] text-yanci-primary/40">/{row.key}</p>
            </div>

            <button
              type="button"
              onClick={() => void toggle(row)}
              disabled={status === 'saving'}
              aria-pressed={row.enabled}
              aria-label={row.enabled ? `Boye ${row.label}` : `Bayyana ${row.label}`}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                row.enabled ? 'bg-emerald-600' : 'bg-yanci-primary/20'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  row.enabled ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-yanci-primary/15 bg-yanci-primary/5 px-5 py-4">
        <ul className="list-inside list-disc space-y-1 text-xs text-yanci-primary/70">
          <li>Danna kibiyoyi don canza oda; sauye-sauye ana ajiye su nan take.</li>
          <li>Mai canjin bayyana/boye yana nuna ko zama sashe ga masu karatu.</li>
          <li>Alamar "Yana nan a shafi" tana nuna sassun da ake bayarwa a shafin farko a yanzu.</li>
          <li>"Mayar da tsoho" na dawo da oda da bayyanar asali.</li>
        </ul>
      </div>
    </section>
  );
}
