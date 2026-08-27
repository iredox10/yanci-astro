import { useState, useEffect } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState('/account');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect && redirect.startsWith('/')) {
        setRedirectTarget(redirect);
      }
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Imel ko kalmar sirri ba daidai ba ne');
      }

      window.location.assign(redirectTarget);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An sami matsala wajen sadarwa da sabar',
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-yanci-primary/70">
          Imel
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          required
          autoComplete="email"
          placeholder="sunanka@misali.com"
          className="mt-1 w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm placeholder:text-yanci-primary/30 focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
        />
      </label>

      <label className="block">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-yanci-primary/70">
            Kalmar sirri
          </span>
          <a
            href="/admin/forgot-password"
            className="text-xs text-yanci-accent hover:underline hover:text-[#b0884a]"
          >
            Manta kalmar sirri?
          </a>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-1 w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm placeholder:text-yanci-primary/30 focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
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
        {busy ? 'Ana shiga…' : 'Shiga ciki'}
      </button>

      <p className="pt-2 text-center text-sm text-yanci-primary/60">
        Ba ka da asusu?{' '}
        <a
          href={`/register${redirectTarget !== '/account' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
          className="font-semibold text-yanci-primary hover:text-yanci-accent"
        >
          Yi rajista
        </a>
      </p>
    </form>
  );
}
