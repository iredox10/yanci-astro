import { useState } from 'react';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Kalmar sirri ba ta daidaita');
      return;
    }
    if (password.length < 8) {
      setError('Kalmar sirri dole ta kasance haruffa 8 ko fiye');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'Rajista ta kasa');
      window.location.assign('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rajista ta kasa');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-yanci-primary/70">
          Suna
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          autoComplete="name"
          className="mt-1 w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-yanci-primary/70">
          Imel
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="mt-1 w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-yanci-primary/70">
          Kalmar sirri
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={256}
          autoComplete="new-password"
          placeholder="Akalla haruffa 8"
          className="mt-1 w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm placeholder:text-yanci-primary/40 focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-yanci-primary/70">
          Tabbatar da kalmar sirri
        </span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
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
        {busy ? 'Ana rajista…' : 'Yi rajista'}
      </button>
      <p className="pt-2 text-center text-sm text-yanci-primary/60">
        Kana da asusu?{' '}
        <a href="/login" className="font-semibold text-yanci-primary hover:text-yanci-accent">
          Shiga
        </a>
      </p>
    </form>
  );
}
