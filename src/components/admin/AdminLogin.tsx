import { useState } from 'react';
import { FaEnvelope, FaKey } from 'react-icons/fa6';

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
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'An sami matsala. Gwada sake.');
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An sami matsala. Gwada sake.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
          <FaEnvelope className="mr-1 inline h-3 w-3 text-[#c59d5f]" /> Imel
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="admin@yanci.ng"
          required
          autoComplete="username"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#c59d5f]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
          <FaKey className="mr-1 inline h-3 w-3 text-[#c59d5f]" /> Kalmar Sirri
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#c59d5f]"
        />
      </div>

      <div className="flex justify-end">
        <a
          href="/admin/forgot-password"
          className="text-xs font-medium text-[#c59d5f] transition-colors hover:text-[#b0884a]"
        >
          Manta kalmar sirri?
        </a>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !email || !password}
        className="w-full rounded-xl bg-[#0f3036] py-3.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-[#1a4e56] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Ana shiga...' : 'Shiga Tsarin'}
      </button>
    </form>
  );
}
