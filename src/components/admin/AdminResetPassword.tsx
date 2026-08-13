import { useState } from 'react';

interface Props {
  token: string;
}

export default function AdminResetPassword({ token }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (password.length < 8) {
      setError('Kalmar shiga ta fi gajarta (a kalla haruffa 8)');
      setBusy(false);
      return;
    }
    if (password !== confirm) {
      setError('Kalmomin shiga biyu ba daidai ba ne');
      setBusy(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'Reset failed');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 space-y-4">
        <p className="border border-yanci-primary/25 bg-yanci-primary/10 px-3 py-2 text-sm text-yanci-primary">
          An canza kalmar shiga. Yanzu za ka iya shiga da sabuwar kalmar.
        </p>
        <a
          href="/admin/login"
          className="block bg-yanci-primary px-4 py-2.5 text-center text-sm font-bold uppercase tracking-wide text-yanci-paper transition-colors hover:bg-yanci-primary/90"
        >
          Shiga
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-yanci-primary/70">
          Sabuwar kalmar shiga
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-yanci-primary/70">
          Sake rubuta kalmar shiga
        </span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
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
        {busy ? 'Ana aiki…' : 'Canza kalmar shiga'}
      </button>
    </form>
  );
}