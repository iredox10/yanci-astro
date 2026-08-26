import { useEffect, useRef, useState } from 'react';

const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-yanci-primary/70';
const INPUT_CLASS =
  'mt-1 w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40';

function storageKey(scope: string): string {
  return `yanci-editor-notes:${scope}`;
}

/**
 * Draft-only editorial notes. The article schema has no notes field, so notes
 * live in this browser's localStorage keyed by article id and never reach the
 * server.
 */
export default function EditorialNotes({ scope }: { scope: string }) {
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      setNote(window.localStorage.getItem(storageKey(scope)) ?? '');
    } catch {
      setNote('');
    }
    setLoaded(true);
  }, [scope]);

  useEffect(() => {
    if (!loaded) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey(scope), note);
      } catch {
        // private mode / storage full — draft note simply won't persist
      }
    }, 400);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [note, loaded, scope]);

  return (
    <div>
      <span className={LABEL_CLASS}>Bayanin edita</span>{' '}
      <span className="ml-1 inline-block border border-yanci-accent/40 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-yanci-accent">
        Draft kawai — ana ajiye a wannan burauzar
      </span>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="Rubuta bayani ga abokin edita…"
        className={INPUT_CLASS}
      />
    </div>
  );
}
