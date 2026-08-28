import { useState } from 'react';
import { FaLock, FaKey, FaCircleCheck } from 'react-icons/fa6';

interface Props {
  token: string;
}

export default function AdminResetPassword({ token }: Props) {
  const invalid = !token;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Kalmar sirri dole ta ƙalla 8 haruffa.');
      return;
    }

    if (password !== confirm) {
      setError('Kalmomin sirri ba su daidaita ba.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'An sami matsala. Gwada sake.');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An sami matsala. Gwada sake.');
      setLoading(false);
    }
  };

  if (invalid) {
    return (
      <div className="min-h-screen bg-[#0f3036] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-4">
              <FaLock className="text-red-500 text-2xl" />
            </div>
            <h1 className="text-xl font-black text-gray-800 mb-2">Hanyar Ba Ta Aiki</h1>
            <p className="text-gray-500 text-sm mb-6">
              Wannan hanyar sake saitin kalmar sirri ba ta aiki ko kuma ta ƙare. Don Allah ka sake neman sabuwar hanyar sake saiti.
            </p>
            <a
              href="/admin/forgot-password"
              className="inline-block bg-[#0f3036] text-white py-3 px-6 rounded-xl font-bold hover:bg-[#1a4e56] transition-colors text-sm"
            >
              Sake Nema
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0f3036] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
              <FaCircleCheck className="text-green-400 text-2xl" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">An Sake Saita</h1>
            <p className="text-white/50 text-sm mt-1">Kalmar sirrinka ta canja</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              An sake saita kalmar sirrinka cikin nasara. Za ka iya shiga da sabuwar kalmar sirri yanzu.
            </p>
            <a
              href="/admin/login"
              className="inline-block bg-[#0f3036] text-white py-3 px-6 rounded-xl font-bold hover:bg-[#1a4e56] transition-colors text-sm tracking-wide"
            >
              Shiga Tsarin
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f3036] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <FaLock className="text-[#c59d5f] text-2xl" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Sake Saitin Kalmar Sirri</h1>
          <p className="text-white/50 text-sm mt-1">Shigar da sabuwar kalmar sirri</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                <FaKey className="inline w-3 h-3 mr-1 text-[#c59d5f]" />
                Sabuwar Kalmar Sirri
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Akalla haruffa 8"
                required
                minLength={8}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c59d5f] focus:border-transparent bg-gray-50 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                <FaKey className="inline w-3 h-3 mr-1 text-[#c59d5f]" />
                Tabbatar da Kalmar Sirri
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError('');
                }}
                placeholder="Sake rubuta kalmar sirri"
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c59d5f] focus:border-transparent bg-gray-50 transition"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full bg-[#0f3036] text-white py-3.5 rounded-xl font-bold hover:bg-[#1a4e56] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
            >
              {loading ? 'Ana sake saiti...' : 'Sake Saita Kalmar Sirri'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
