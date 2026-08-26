import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LiveResults } from '../../pages/api/results/live';

interface Props {
  electionId?: string | null;
}

const POLL_MS = 45_000;

interface PartyMeta {
  name: string;
  color: string;
}

const PARTIES: Record<string, PartyMeta> = {
  apc: { name: 'APC', color: '#2f6db3' },
  pdp: { name: 'PDP', color: '#3a9e5f' },
  nnpp: { name: 'NNPP', color: '#b33a2f' },
  lpp: { name: 'LPP', color: '#7a4fb3' },
  lp: { name: 'LP', color: '#7a4fb3' },
  apga: { name: 'APGA', color: '#b38a2f' },
  independent: { name: 'Independent', color: '#6b7280' },
};

const FALLBACK_PARTY: PartyMeta = { name: '—', color: '#6b7280' };

const partyMeta = (party: string): PartyMeta =>
  PARTIES[party.trim().toLowerCase()] ??
  (party ? { name: party.toUpperCase(), color: FALLBACK_PARTY.color } : FALLBACK_PARTY);

interface PartyBar extends PartyMeta {
  party: string;
  votes: number;
  share: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

const nf = new Intl.NumberFormat('en-NG');
const formatNumber = (n: number): string => nf.format(Math.round(n));

function UpdatedAgo({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const parsed = now === null ? NaN : new Date(iso).getTime();
  const minutes =
    Number.isFinite(parsed) && parsed <= now! ? Math.floor((now! - parsed) / 60_000) : -1;
  const text =
    minutes < 0
      ? 'Ana sabuntawa…'
      : minutes < 1
        ? 'An sabunta kadan da yanzu'
        : minutes === 1
          ? 'An sabunta minti daya da ya wuce'
          : `An sabunta minti ${minutes} da ya wuce`;
  return (
    <span suppressHydrationWarning>
      {text}
    </span>
  );
}

const turnoutTone = (turnout: number): string =>
  turnout > 35
    ? 'bg-green-100 text-green-700'
    : turnout > 25
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';

const Tile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">{label}</div>
    <div className="font-serif text-2xl font-black text-yanci-dark">{value}</div>
  </div>
);

const ResultsBoard = ({ electionId }: Props) => {
  const [data, setData] = useState<LiveResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [region, setRegion] = useState('Duka');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const qs = electionId ? `?electionId=${encodeURIComponent(electionId)}` : '';
    try {
      const res = await fetch(`/api/results/live${qs}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const payload = (await res.json()) as LiveResults;
      setData(payload);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const candidateNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data?.candidates ?? []) if (c.id) map.set(c.id, c.name);
    return map;
  }, [data]);

  const regions = useMemo(() => {
    const found = new Set<string>();
    for (const s of data?.states ?? []) if (s.region) found.add(s.region);
    return ['Duka', ...[...found].sort()];
  }, [data]);

  const visibleStates = useMemo(() => {
    let rows = [...(data?.states ?? [])];
    if (region !== 'Duka') rows = rows.filter((s) => s.region === region);
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((s) => s.state.toLowerCase().includes(q));
    return rows.sort((a, b) => b.leaderVotes - a.leaderVotes);
  }, [data, region, query]);

  const partyBars = useMemo<PartyBar[]>(() => {
    const totals = data?.totals;
    const byParty = totals?.byParty ?? {};
    const counted =
      totals && totals.validVotes > 0
        ? totals.validVotes
        : Object.values(byParty).reduce((acc, votes) => acc + votes, 0);
    return Object.entries(byParty)
      .filter(([, votes]) => votes > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([party, votes]) => ({
        party,
        votes,
        share: counted > 0 ? round1((votes / counted) * 100) : 0,
        ...partyMeta(party),
      }));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-xl text-yanci-primary/40">Ana lodawa sakamako…</p>
      </div>
    );
  }

  if (!data || !data.election || !data.totals) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center shadow-sm">
        <p className="font-serif text-2xl font-black text-yanci-primary">Babu zabe a nan tukuna.</p>
        <p className="mt-2 text-sm text-yanci-primary/60">
          Idan an fara kidaya kuri'u, sakamako za su bayyana a nan kai tsaye.
        </p>
        <a
          href="/zabe"
          className="mt-6 inline-block rounded-lg bg-yanci-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1a454c]"
        >
          Komawa shafin zabe
        </a>
      </div>
    );
  }

  const { election, totals } = data;
  const maxPartyVotes = partyBars[0]?.votes ?? 0;

  return (
    <div className="space-y-8">
      {failed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>Ba a iya sabunta sakamako ba — ana sake gwadawa nan gaba.</span>
          <button onClick={() => void load()} className="font-bold underline">
            Sabunta yanzu
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          aria-live="polite"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yanci-primary/60"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
          <UpdatedAgo iso={data.updatedAt} />
        </span>
        <button
          onClick={() => void load()}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-yanci-primary transition-colors hover:border-yanci-primary"
        >
          Sabunta
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Tile label="Masu Rajista" value={formatNumber(totals.registeredVoters)} />
        <Tile label="Kuri'u" value={formatNumber(totals.validVotes)} />
        <Tile label="Halarta" value={`${totals.turnout.toFixed(1)}%`} />
        <Tile label="Jihohin da aka ruwaito" value={String(totals.statesTotal)} />
        <Tile label="Kujeru da aka bayyana" value={String(totals.seatsDeclared)} />
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 font-serif text-xl font-black text-yanci-primary">
          Jimillar Kuri'u ta Jam'iyya
        </h2>
        {partyBars.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Babu kuri'u da aka kidaya tukuna.</p>
        ) : (
          partyBars.map((bar) => (
            <div key={bar.party} className="mb-5 last:mb-0">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-bold text-yanci-dark">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bar.color }} />
                  {bar.name}
                </span>
                <span className="text-sm font-black tabular-nums text-yanci-dark">
                  {bar.share.toFixed(1)}% · {formatNumber(bar.votes)}
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${maxPartyVotes > 0 ? (bar.votes / maxPartyVotes) * 100 : 0}%`,
                    backgroundColor: bar.color,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="font-serif text-xl font-black text-yanci-primary">Sakamako bisa Jiha</h2>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nemi jiha…"
            aria-label="Nemi jiha"
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none transition-colors focus:border-yanci-primary md:w-64"
          />
        </div>

        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-gray-100 px-4 py-3">
          {regions.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              aria-pressed={region === r}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                region === r
                  ? 'bg-yanci-primary text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">
              Sakamakon zabe bisa jiha — jam'iyya da dan takara na jagora, kuri'u da halarta.
            </caption>
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">Jiha</th>
                <th scope="col" className="px-4 py-3 font-bold">Dan takarar jagora</th>
                <th scope="col" className="px-4 py-3 font-bold">Jam'iyya</th>
                <th scope="col" className="px-4 py-3 text-right font-bold">Kuri'u</th>
                <th scope="col" className="px-4 py-3 text-right font-bold">Rabo</th>
                <th scope="col" className="px-4 py-3 text-center font-bold">Halarta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleStates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    {(data?.states.length ?? 0) === 0
                      ? 'Sakamako ba a buga su ba tukuna — idan aka fara kidaya, za su bayyana a nan.'
                      : 'Babu jiha da ta dace da neman ka.'}
                  </td>
                </tr>
              )}
              {visibleStates.map((s) => {
                const meta = s.leaderParty ? partyMeta(s.leaderParty) : FALLBACK_PARTY;
                const leaderName =
                  candidateNames.get(s.leaderCandidateId) ??
                  ((s.winner ? candidateNames.get(s.winner) : '') || '—');
                const turnout =
                  s.registeredVoters > 0
                    ? round1((s.accreditedVoters / s.registeredVoters) * 100)
                    : 0;
                return (
                  <tr key={s.id || s.state} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="font-bold text-yanci-dark">{s.state}</div>
                      <div className="text-xs text-gray-400">{s.region}</div>
                    </td>
                    <td className="px-4 py-3">{leaderName}</td>
                    <td className="px-4 py-3">
                      {s.leaderParty ? (
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
                          style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                        >
                          {meta.name}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-yanci-dark/80">
                      {s.leaderVotes > 0 ? formatNumber(s.leaderVotes) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-yanci-dark/80">
                      {s.leaderShare.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${turnoutTone(turnout)}`}
                      >
                        {turnout.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">
          Tushen bayanai: {election.electoralBody} · An sabunta kai tsaye daga cibiyar kidaya.
        </p>
      </section>
    </div>
  );
};

export default ResultsBoard;
