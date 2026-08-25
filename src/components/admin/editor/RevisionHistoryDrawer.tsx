import { useCallback, useEffect, useState } from 'react';

export interface RevisionSummary {
  id: string;
  articleId: string;
  title: string;
  changedFields: string[];
  authorName: string;
  createdAt: string;
}

export interface RevisionDetail extends RevisionSummary {
  snapshot: Record<string, unknown> | null;
}

const CHIP_LABELS: Record<string, string> = {
  create: 'ajiye farko',
  isLive: 'live',
  isSensitive: 'mai zargi',
  publishAt: 'lokacin buga',
  metaTitle: 'meta title',
  metaDescription: 'meta description',
};

function chipLabel(key: string): string {
  return CHIP_LABELS[key] ?? key;
}

function timeAgo(iso: string): string {
  try {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (!Number.isFinite(mins) || mins < 0) return '';
    if (mins < 1) return 'yanzu';
    if (mins < 60) return `minti ${mins} da suka wuce`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `sa'o'i ${hrs} da suka wuce`;
    return `kwana ${Math.floor(hrs / 24)} da suka wuce`;
  } catch {
    return '';
  }
}

interface Props {
  articleId: string;
  onClose: () => void;
  onRestore: (snapshot: Record<string, unknown>) => void;
}

export default function RevisionHistoryDrawer({ articleId, onClose, onRestore }: Props) {
  const [revisions, setRevisions] = useState<RevisionSummary[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, RevisionDetail | null>>({});
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRevisions(null);
    setLoadFailed(false);
    setExpandedId(null);
    setDetails({});
    (async () => {
      try {
        const res = await fetch(`/api/admin/revisions?articleId=${encodeURIComponent(articleId)}`);
        const data = (await res.json()) as { ok?: boolean; revisions?: RevisionSummary[] };
        if (cancelled) return;
        if (res.ok && data.ok && Array.isArray(data.revisions)) {
          setRevisions(data.revisions);
        } else {
          setRevisions([]);
          setLoadFailed(true);
        }
      } catch {
        if (!cancelled) {
          setRevisions([]);
          setLoadFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = useCallback(
    async (rev: RevisionSummary) => {
      if (expandedId === rev.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(rev.id);
      if (details[rev.id] !== undefined) return;
      setDetails((d) => ({ ...d, [rev.id]: null }));
      try {
        const res = await fetch(`/api/admin/revisions/${encodeURIComponent(rev.id)}`);
        const data = (await res.json()) as { ok?: boolean; revision?: RevisionDetail };
        setDetails((d) => ({ ...d, [rev.id]: res.ok && data.ok && data.revision ? data.revision : null }));
      } catch {
        setDetails((d) => ({ ...d, [rev.id]: null }));
      }
    },
    [expandedId, details],
  );

  async function restore(rev: RevisionSummary) {
    const detail = details[rev.id];
    if (!detail?.snapshot || restoring) return;
    if (!window.confirm('Dawo da wannan sigar? Za a cika fom daga cikinta — ba za a ajiye ba sai ka danna Save.')) return;
    setRestoring(true);
    try {
      onRestore(detail.snapshot);
    } finally {
      setRestoring(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-yanci-dark/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tarihin gyare-gyre"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-yanci-primary/20 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-yanci-primary/15 px-4 py-3">
          <h3 className="font-serif text-lg font-bold text-yanci-primary">
            Tarihi
            {revisions && revisions.length > 0 && (
              <span className="ml-2 text-xs font-semibold text-yanci-primary/50">({revisions.length})</span>
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Rufe"
            className="px-2 py-1 text-sm font-bold text-yanci-primary/50 transition-colors hover:text-yanci-primary"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {revisions === null && (
            <p className="py-8 text-center text-sm text-yanci-primary/40">Ana loda…</p>
          )}

          {revisions !== null && loadFailed && (
            <p className="border border-yanci-red/30 bg-yanci-red/10 px-3 py-2 text-sm text-yanci-red">
              An kasa loda tarihi.
            </p>
          )}

          {revisions !== null && !loadFailed && revisions.length === 0 && (
            <p className="py-8 text-center text-sm text-yanci-primary/40">
              Babu tarihi tukuna. Ana ajiye sigar ta atomatik duk lokacin da ka ajiye labarin.
            </p>
          )}

          {(revisions ?? []).map((rev) => {
            const expanded = expandedId === rev.id;
            const detail = details[rev.id];
            return (
              <div key={rev.id} className="border border-yanci-primary/15">
                <button
                  type="button"
                  onClick={() => void toggle(rev)}
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-yanci-paper/60"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center bg-yanci-primary/10 text-xs font-bold text-yanci-primary">
                      {(rev.authorName || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-yanci-dark">
                        {rev.authorName || 'Unknown'}
                      </span>
                      <span className="block text-[11px] text-yanci-primary/40">{timeAgo(rev.createdAt)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-yanci-primary/40">
                    {expanded ? '▲' : '▼'}
                  </span>
                </button>

                {!expanded && rev.changedFields.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-3 pb-2.5">
                    {rev.changedFields.slice(0, 5).map((f) => (
                      <span
                        key={f}
                        className="border border-yanci-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yanci-primary/50"
                      >
                        {chipLabel(f)}
                      </span>
                    ))}
                    {rev.changedFields.length > 5 && (
                      <span className="px-1 text-[10px] font-semibold text-yanci-primary/40">
                        +{rev.changedFields.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {expanded && (
                  <div className="border-t border-yanci-primary/10 px-3 pb-3 pt-2.5">
                    {detail === undefined || detail === null ? (
                      <p className="text-xs text-yanci-primary/40">Ana loda sigar…</p>
                    ) : (
                      <>
                        {detail.snapshot ? (
                          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all border border-yanci-primary/10 bg-yanci-paper p-2 font-mono text-[10px] leading-relaxed text-yanci-dark/80">
                            {JSON.stringify(detail.snapshot, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-xs text-yanci-red/70">Ba a iya karant cikakken sigar ba.</p>
                        )}
                        {detail.snapshot && (
                          <button
                            type="button"
                            onClick={() => void restore(rev)}
                            disabled={restoring}
                            className="mt-2 text-xs font-bold uppercase tracking-wide text-yanci-accent transition-colors hover:text-yanci-accent/80 disabled:opacity-50"
                          >
                            ↺ dawo da wannan sigar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
