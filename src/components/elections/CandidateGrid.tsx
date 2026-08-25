import { useMemo, useState } from 'react';

export interface CandidateView {
  id: string;
  name: string;
  partyName: string;
  partyColor: string;
  state: string;
  bio: string;
  experience: string;
  education: string;
  runningMate: string;
  image: string;
  priorities: string[];
}

interface Props {
  candidates: CandidateView[];
}

type Filters = { party: string; state: string };

const MAX_COMPARE = 3;
const FALLBACK_COLOR = '#6b7280';

const PinIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
    <path d="M215.7 499.2C267 435 384 279.4 384 192 384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2 12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z" />
  </svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <svg className="mt-0.5 h-3 w-3 shrink-0" viewBox="0 0 448 512" fill="currentColor" style={{ color }} aria-hidden="true">
    <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
  </svg>
);

const Avatar = ({ candidate, size }: { candidate: CandidateView; size: 'sm' | 'lg' }) => {
  const cls = size === 'lg'
    ? 'h-14 w-14 text-lg'
    : 'h-10 w-10 text-sm';
  return (
    <span
      className={`flex ${cls} shrink-0 items-center justify-center overflow-hidden rounded-full font-serif font-black text-white`}
      style={{ backgroundColor: candidate.partyColor || FALLBACK_COLOR }}
    >
      {candidate.image ? (
        <img src={candidate.image} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        candidate.name.slice(0, 1)
      )}
    </span>
  );
};

const CandidateCard = ({
  candidate,
  selected,
  atCapacity,
  onSelect,
}: {
  candidate: CandidateView;
  selected: boolean;
  atCapacity: boolean;
  onSelect: () => void;
}) => {
  const color = candidate.partyColor || FALLBACK_COLOR;
  return (
    <article
      id={`takara-${candidate.id}`}
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-lg ${
        selected ? 'border-yanci-primary ring-2 ring-yanci-primary/30' : 'border-gray-100'
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative shrink-0 sm:w-44">
          {candidate.image ? (
            <img src={candidate.image} alt={candidate.name} loading="lazy" className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-yanci-primary/5">
              <span className="font-serif text-5xl font-black text-yanci-primary/30">{candidate.name.slice(0, 1)}</span>
            </div>
          )}
          <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ backgroundColor: color }} />
        </div>

        <div className="flex-1 p-5">
          <span
            className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-bold"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {candidate.partyName}
          </span>
          <h2 className="font-serif text-xl font-black leading-tight text-yanci-dark">{candidate.name}</h2>
          {candidate.runningMate && (
            <p className="mt-1 text-sm text-gray-500">
              Mataimaki: <span className="font-bold text-gray-700">{candidate.runningMate}</span>
            </p>
          )}

          <div className="mt-3 space-y-1.5 text-sm text-gray-600">
            {candidate.state && (
              <p className="flex items-center gap-2">
                <PinIcon />
                <span>{candidate.state}</span>
              </p>
            )}
          </div>

          {candidate.bio && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-500">{candidate.bio}</p>}

          {candidate.priorities.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Manufofi</h3>
              <ul className="space-y-1.5">
                {candidate.priorities.slice(0, 2).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-snug text-gray-700">
                    <CheckIcon color={color} />
                    <span className="line-clamp-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={onSelect}
            disabled={!selected && atCapacity}
            aria-pressed={selected}
            className={`mt-4 w-full rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              selected
                ? 'bg-yanci-primary text-white hover:bg-[#1a454c]'
                : 'border border-yanci-primary/25 text-yanci-primary hover:border-yanci-primary hover:bg-yanci-primary/5'
            }`}
          >
            {selected ? 'An zaɓi — Cire' : 'Zaɓi Don Kwatanta'}
          </button>
        </div>
      </div>
    </article>
  );
};

const ComparisonTable = ({
  selected,
  onClear,
}: {
  selected: CandidateView[];
  onClear: () => void;
}) => (
  <section aria-label="Kwatanta 'yan takara" className="scroll-mt-6" id="kwatanta">
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 className="font-serif text-2xl font-black text-yanci-dark">Kwatanta 'Yan Takara</h2>
      <button
        type="button"
        onClick={onClear}
        className="rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        Share Zabi
      </button>
    </div>
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th scope="col" className="w-36 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                Bayani
              </th>
              {selected.map((c) => (
                <th key={c.id} scope="col" className="min-w-44 px-4 py-3 text-center font-bold" style={{ color: c.partyColor || FALLBACK_COLOR }}>
                  <div className="mx-auto mb-2 flex w-fit flex-col items-center gap-2">
                    <Avatar candidate={c} size="lg" />
                    <span className="leading-tight">{c.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {([
              ["Jam'iyya", (c: CandidateView) => c.partyName],
              ['Jiha', (c: CandidateView) => c.state],
              ['Gogewa', (c: CandidateView) => c.experience],
              ['Manufofi', null],
            ] as [string, ((c: CandidateView) => string) | null][]).map(([label, render]) => (
              <tr key={label} className="border-b border-gray-50 last:border-0">
                <th scope="row" className="px-4 py-3 text-left align-top text-xs font-bold uppercase tracking-wider text-gray-500">
                  {label}
                </th>
                {selected.map((c) => (
                  <td key={c.id} className="px-4 py-3 text-center align-top">
                    {render ? (
                      <span className={render(c) ? '' : 'text-gray-300'}>{render(c) || '—'}</span>
                    ) : c.priorities.length > 0 ? (
                      <ul className="space-y-1.5 text-left">
                        {c.priorities.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm leading-snug text-gray-700">
                            <CheckIcon color={c.partyColor || FALLBACK_COLOR} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

const CandidateGrid = ({ candidates }: Props) => {
  const [filters, setFilters] = useState<Filters>({ party: '', state: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const parties = useMemo(
    () => [...new Set(candidates.map((c) => c.partyName))].sort((a, b) => a.localeCompare(b)),
    [candidates],
  );
  const states = useMemo(
    () => [...new Set(candidates.map((c) => c.state))].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [candidates],
  );

  const filtered = useMemo(
    () =>
      candidates.filter(
        (c) =>
          (filters.party === '' || c.partyName === filters.party) &&
          (filters.state === '' || c.state === filters.state),
      ),
    [candidates, filters],
  );

  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const selected = selectedIds
    .map((id) => byId.get(id))
    .filter((c): c is CandidateView => Boolean(c));
  const atCapacity = selectedIds.length >= MAX_COMPARE;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : prev.length < MAX_COMPARE
          ? [...prev, id]
          : prev,
    );
  };

  if (candidates.length === 0) {
    return (
      <p className="py-24 text-center font-serif text-xl text-gray-400">Babu dan takara a halin yanzu</p>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="filter-jamiyya" className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">
            Jam'iyya
          </label>
          <select
            id="filter-jamiyya"
            value={filters.party}
            onChange={(e) => setFilters((f) => ({ ...f, party: e.target.value }))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-yanci-dark focus:border-yanci-primary focus:outline-none"
          >
            <option value="">Duka jam'iyyu</option>
            {parties.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-jiha" className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">
            Jiha
          </label>
          <select
            id="filter-jiha"
            value={filters.state}
            onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-yanci-dark focus:border-yanci-primary focus:outline-none"
          >
            <option value="">Duka jihohi</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <p className="ml-auto pb-2 text-sm text-gray-400">
          {filtered.length} daga cikin {candidates.length} 'yan takara · Zaɓi har zuwa {MAX_COMPARE} domin kwatanta
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">Babu dan takara da ya dace da wannan zaɓin.</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {filtered.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              selected={selectedIds.includes(candidate.id)}
              atCapacity={atCapacity && !selectedIds.includes(candidate.id)}
              onSelect={() => toggleSelect(candidate.id)}
            />
          ))}
        </div>
      )}

      {selected.length > 0 && <ComparisonTable selected={selected} onClear={() => setSelectedIds([])} />}
    </div>
  );
};

export default CandidateGrid;
