import React, { useState } from 'react';

const ROLES = ['contributor', 'author', 'editor', 'managing_editor', 'super_admin'];

export default function InviteForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ token: string; expiresAt: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fd.get('email'),
          name: fd.get('name'),
          role: fd.get('role'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Invite failed');
      setResult(data);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-yanci-primary/15 bg-white/60 p-5">
      <h2 className="mb-4 font-serif text-lg font-bold text-yanci-primary">Send invitation</h2>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-yanci-primary/70">Name</span>
          <input
            name="name"
            type="text"
            required
            placeholder="Sulaiman Bello"
            className="w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-yanci-primary/70">Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder="sulaiman@yanci.ng"
            className="w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-yanci-primary/70">Role</span>
          <select
            name="role"
            className="w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
          >
            {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r.replace(/_/g, ' ')}</option>)}
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full bg-yanci-primary px-5 py-2 text-sm font-bold uppercase tracking-wide text-yanci-paper hover:bg-yanci-primary/90 disabled:opacity-50"
      >
        {busy ? 'Creating…' : 'Create invitation'}
      </button>
      {error && <p className="mt-3 text-xs text-yanci-red">{error}</p>}
      {result && (
        <div className="mt-3 rounded-sm bg-emerald-50 p-3 text-xs">
          <p className="font-bold text-emerald-700">Invitation created!</p>
          <p className="mt-1 text-emerald-700/80">Share this link (valid until {new Date(result.expiresAt).toLocaleDateString('en-GB')}):</p>
          <p className="mt-1 break-all rounded-sm bg-white px-2 py-1 font-mono text-emerald-800">
            {window.location.origin}/invite/{result.token}
          </p>
        </div>
      )}
    </form>
  );
}
