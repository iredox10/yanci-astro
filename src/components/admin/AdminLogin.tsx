import { useState } from 'react';

interface Props {
  next?: string;
}

export default function AdminLogin({ next = '/admin/dashboard' }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'Sign in failed');
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setBusy(false);
    }
  }

  return (
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
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-yanci-primary/70">
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
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
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
