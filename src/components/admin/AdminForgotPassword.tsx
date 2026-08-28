import { useState } from 'react';
import { FaLock, FaEnvelope, FaCircleCheck } from 'react-icons/fa6';

export default function AdminForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'An sami matsala. Gwada sake.');
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An sami matsala. Gwada sake.');
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0f3036] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
              <FaCircleCheck className="text-green-400 text-2xl" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">An Aiko Imel</h1>
            <p className="text-white/50 text-sm mt-1">Duba akwatin imel ɗinka don ci gaba</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Mun aiko maka hanyar sake saitin kalmar sirri zuwa <strong className="text-[#0f3036]">{email}</strong>.
              Idan ba ka ga saƙon ba, duba akwatin spam ɗinka.
            </p>
            <a
              href="/admin/login"
              className="inline-block bg-[#0f3036] text-white py-3 px-6 rounded-xl font-bold hover:bg-[#1a4e56] transition-colors text-sm tracking-wide"
            >
              Koma Shiga
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
          <h1 className="text-2xl font-black text-white tracking-tight">Manta Kalmar Sirri?</h1>
          <p className="text-white/50 text-sm mt-1">Shigar da imel ɗinka, za mu aiko maka da hanyar sake saiti</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                <FaEnvelope className="inline w-3 h-3 mr-1 text-[#c59d5f]" />
                Imel
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="admin@yanci.ng"
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
              disabled={loading || !email}
              className="w-full bg-[#0f3036] text-white py-3.5 rounded-xl font-bold hover:bg-[#1a4e56] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
            >
              {loading ? 'Ana aikawa...' : 'Aiko Hanyar Sake Saiti'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/admin/login" className="text-xs text-gray-400 hover:text-[#0f3036] transition-colors">
              &larr; Koma Shiga
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
