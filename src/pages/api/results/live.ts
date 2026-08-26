import type { APIRoute } from 'astro';
import { getElections, getCandidates, getResults } from '@lib/appwrite-server';

export const prerender = false;

interface LiveElection {
  id: string;
  name: string;
  fullName: string;
  date: string;
  type: string;
  electoralBody: string;
}

interface LiveCandidate {
  id: string;
  name: string;
  party: string;
  position: string;
}

interface LiveStateRow {
  id: string;
  state: string;
  region: string;
  registeredVoters: number;
  accreditedVoters: number;
  validVotes: number;
  rejectedVotes: number;
  candidateVotes: Record<string, number>;
  met25Threshold: string[];
  winner: string;
  governor: string;
  leaderCandidateId: string;
  leaderParty: string;
  leaderVotes: number;
  leaderShare: number;
}

interface LiveTotals {
  registeredVoters: number;
  accreditedVoters: number;
  validVotes: number;
  rejectedVotes: number;
  turnout: number;
  statesTotal: number;
  seatsDeclared: number;
  byCandidate: Record<string, number>;
  byParty: Record<string, number>;
  statesWon: Record<string, number>;
}

export interface LiveResults {
  ok: boolean;
  updatedAt: string;
  election: LiveElection | null;
  candidates: LiveCandidate[];
  states: LiveStateRow[];
  totals: LiveTotals | null;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

const safeCount = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

async function buildLiveResults(electionId?: string): Promise<LiveResults> {
  const updatedAt = new Date().toISOString();
  const none: LiveResults = {
    ok: true,
    updatedAt,
    election: null,
    candidates: [],
    states: [],
    totals: null,
  };

  const elections = await getElections();
  const election =
    (electionId ? elections.find((e) => e.$id === electionId) : undefined) ??
    elections.find((e) => e.status === 'active' && e.published !== false) ??
    elections[0];
  if (!election?.$id) return none;

  const [candidates, results] = await Promise.all([
    getCandidates(election.$id),
    getResults(election.$id),
  ]);

  const knownIds = new Set(
    candidates.map((c) => c.$id).filter((id): id is string => Boolean(id)),
  );
  const partyOf = new Map(
    candidates.map((c) => [c.$id ?? '', String(c.party ?? '').toLowerCase()]),
  );
  const candidateList: LiveCandidate[] = candidates.map((c) => ({
    id: c.$id ?? '',
    name: c.name,
    party: String(c.party ?? '').toLowerCase(),
    position: c.position,
  }));

  const byCandidate: Record<string, number> = {};
  const byParty: Record<string, number> = {};
  const statesWon: Record<string, number> = {};
  let registeredVoters = 0;
  let accreditedVoters = 0;
  let validVotes = 0;
  let rejectedVotes = 0;
  let seatsDeclared = 0;

  const states: LiveStateRow[] = results.map((r) => {
    const votes: Record<string, number> = {};
    for (const [id, raw] of Object.entries(r.candidateVotes ?? {})) {
      const n = Number(raw);
      if (knownIds.has(id) && Number.isFinite(n) && n >= 0) votes[id] = n;
    }

    let leaderCandidateId = '';
    let leaderVotes = 0;
    let leaderParty = '';
    for (const [id, n] of Object.entries(votes)) {
      byCandidate[id] = (byCandidate[id] ?? 0) + n;
      const party = partyOf.get(id) ?? '';
      byParty[party] = (byParty[party] ?? 0) + n;
      if (n > leaderVotes) {
        leaderVotes = n;
        leaderCandidateId = id;
        leaderParty = party;
      }
    }

    const registered = safeCount(r.registeredVoters);
    const accredited = safeCount(r.accreditedVoters);
    const valid = safeCount(r.validVotes);
    const rejected = safeCount(r.rejectedVotes);

    registeredVoters += registered;
    accreditedVoters += accredited;
    validVotes += valid;
    rejectedVotes += rejected;

    const winner = r.winner ?? '';
    if (winner) {
      seatsDeclared += 1;
      statesWon[winner] = (statesWon[winner] ?? 0) + 1;
    }

    return {
      id: r.$id ?? '',
      state: r.state,
      region: r.region,
      registeredVoters: registered,
      accreditedVoters: accredited,
      validVotes: valid,
      rejectedVotes: rejected,
      candidateVotes: votes,
      met25Threshold: Array.isArray(r.met25Threshold) ? r.met25Threshold : [],
      winner,
      governor: r.governor ?? '',
      leaderCandidateId,
      leaderParty,
      leaderVotes,
      leaderShare: valid > 0 ? round1((leaderVotes / valid) * 100) : 0,
    };
  });

  const totals: LiveTotals = {
    registeredVoters,
    accreditedVoters,
    validVotes,
    rejectedVotes,
    turnout: registeredVoters > 0 ? round1((accreditedVoters / registeredVoters) * 100) : 0,
    statesTotal: states.length,
    seatsDeclared,
    byCandidate,
    byParty,
    statesWon,
  };

  return {
    ok: true,
    updatedAt,
    election: {
      id: election.$id,
      name: election.name,
      fullName: election.fullName,
      date: election.date,
      type: election.type,
      electoralBody: election.electoralBody,
    },
    candidates: candidateList,
    states,
    totals,
  };
}

export const GET: APIRoute = async ({ url }) => {
  const requested = url.searchParams.get('electionId')?.trim().slice(0, 64);
  try {
    const payload = await buildLiveResults(requested || undefined);
    return json(payload);
  } catch (error) {
    console.error('[results/live] failed', error);
    return json({ ok: false, message: 'Ba a iya samun sakamako a yanzu.' }, 503);
  }
};
