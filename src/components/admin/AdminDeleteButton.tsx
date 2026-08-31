import React, { useState } from 'react';

export default function AdminDeleteButton({ articleId }: { articleId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doDelete() {
    if (!window.confirm('Delete this article permanently? This cannot be undone.')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/articles/${articleId}`, { method: 'DELETE' });
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
        {busy ? 'Deleting…' : 'Delete'}
      </button>
      {error && <span className="ml-2 text-xs text-yanci-red">{error}</span>}
    </span>
  );
}