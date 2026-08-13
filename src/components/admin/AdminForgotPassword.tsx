import { useState } from 'react';

export default function AdminForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'Failed to send');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mt-1 text-sm text-yanci-primary/60">
        Ka rubuta adireshin imel ɗin asusunka; za a aika maka hanyar sake saitin kalmar shiga.
      </p>
      {sent ? (
        <p className="mt-6 border border-yanci-primary/25 bg-yanci-primary/10 px-3 py-2 text-sm text-yanci-primary">
          Idan akwai wannan asusu, an aika hanyar sake saitin kalmar shiga. Ka duba imel ɗinka.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-yanci-primary/70">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="mt-1 w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
            />
          </label>
          {error && (
            <p className="border border-yanci-red/30 bg-yanci-red/10 px-3 py-2 text-sm text-yanci-red">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-yanci-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-yanci-paper transition-colors hover:bg-yanci-primary/90 disabled:opacity-50"
          >
            {busy ? 'Ana aikawa…' : 'Aika hanyar sake saiti'}
          </button>
          <a
            href="/admin/login"
            className="block text-center text-sm text-yanci-primary/60 hover:text-yanci-primary"
          >
            ← Koma shiga
          </a>
        </form>
      )}
    </>
  );
}