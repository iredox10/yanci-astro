import { useState } from 'react';

export default function AdminCollectionDeleteButton({
  collection,
  id,
  label = 'Delete',
}: {
  collection: string;
  id: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doDelete() {
    if (!window.confirm(`Delete this ${collection.replace(/-/g, ' ')} permanently? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/${collection}/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Delete failed');
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setBusy(false);
    }
  }

  return (
    <span>
      <button
        type="button"
        onClick={doDelete}
        disabled={busy}
        className="text-xs font-medium text-yanci-red transition-colors hover:text-yanci-red/70 disabled:opacity-50"
      >
        {busy ? 'Deleting…' : label}
      </button>
      {error && <span className="ml-2 text-xs text-yanci-red">{error}</span>}
    </span>
  );
}
