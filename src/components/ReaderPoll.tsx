import { useState, useEffect } from 'react';
import type { Poll } from '../data/schema';

interface ReaderPollProps {
  initialPoll?: Poll;
}

const STORAGE_KEY = 'yanci_poll_voted';

export default function ReaderPoll({ initialPoll }: ReaderPollProps) {
  const [poll, setPoll] = useState<Poll | null>(initialPoll ?? null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userVotedOption, setUserVotedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(!initialPoll);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState<boolean>(false);
  const [showResultsOnly, setShowResultsOnly] = useState<boolean>(false);

  // Fetch active poll on mount if not provided or to get latest stats
  useEffect(() => {
    let mounted = true;

    async function loadPoll() {
      try {
        const res = await fetch('/api/polls');
        if (!res.ok) throw new Error('Network response not ok');
        const data = await res.json();
        if (mounted && data?.ok && data.poll) {
          setPoll(data.poll);
          checkSavedVote(data.poll.id);
        }
      } catch (err) {
        console.error('[ReaderPoll] Failed to fetch poll:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    function checkSavedVote(pollId: string) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object' && parsed[pollId]) {
              setUserVotedOption(parsed[pollId]);
              setHasVoted(true);
              return;
            }
          } catch {
            // String fallback
            if (stored === pollId || stored.startsWith('opt-')) {
              setUserVotedOption(stored);
              setHasVoted(true);
              return;
            }
          }
        }
      } catch (err) {
        console.error('[ReaderPoll] LocalStorage read error:', err);
      }
    }

    if (initialPoll?.id) {
      checkSavedVote(initialPoll.id);
    }
    loadPoll();

    return () => {
      mounted = false;
    };
  }, [initialPoll?.id]);

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption || !poll || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: poll.id,
          optionId: selectedOption,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Kuskure wajen kada kuri’a');
      }

      // Update poll data with newly computed percentages & counts
      setPoll(data.poll);
      setUserVotedOption(selectedOption);
      setHasVoted(true);
      setJustVoted(true);

      // Save to localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const map = raw ? JSON.parse(raw) : {};
        map[poll.id] = selectedOption;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } catch {
        try {
          localStorage.setItem(STORAGE_KEY, selectedOption);
        } catch {
          // ignore localStorage failure
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kuskure ya faru. A sake gwadawa.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshPoll = async () => {
    if (!poll) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/polls');
      const data = await res.json();
      if (data?.ok && data.poll) {
        setPoll(data.poll);
      }
    } catch (err) {
      console.error('[ReaderPoll] Refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!poll && isLoading) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-6 w-32 rounded-full bg-gray-200" />
          <div className="h-8 w-3/4 rounded-xl bg-gray-200" />
          <div className="space-y-3 pt-4">
            <div className="h-12 w-full rounded-2xl bg-gray-100" />
            <div className="h-12 w-full rounded-2xl bg-gray-100" />
            <div className="h-12 w-full rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!poll) return null;

  const totalVotes = poll.totalVotes ?? poll.options.reduce((sum, o) => sum + (o.votes || 0), 0);
  const showResults = hasVoted || showResultsOnly;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-gradient-to-b from-white to-[#fbfaf8] p-6 shadow-xl shadow-gray-200/40 md:p-10">
      {/* Decorative background accents */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#c59d5f]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[#0f3036]/5 blur-3xl" />

      {/* Top Header Badge */}
      <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f3036] text-[#c59d5f] shadow-md">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="9" y1="10" x2="15" y2="10" />
              <line x1="12" y1="7" x2="12" y2="13" />
            </svg>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#0f3036]">
              {poll.category || "Ra'ayin Jama'a"}
            </span>
            <h3 className="font-sans text-xs font-semibold text-gray-400">Zaɓen Masu Karatu</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Kuri’a Na Kai Tsaye
          </span>

          {showResults && (
            <button
              onClick={refreshPoll}
              disabled={isLoading}
              title="Sabunta Sakamako"
              aria-label="Sabunta Sakamako"
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#0f3036]"
            >
              <svg className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span className="hidden sm:inline">Sabunta</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Question */}
      <div className="relative z-10 mb-6">
        <h2 className="font-serif text-2xl font-black leading-tight text-[#1c1917] sm:text-3xl">
          {poll.question}
        </h2>
        {poll.description && (
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {poll.description}
          </p>
        )}
      </div>

      {/* Success Banner after voting */}
      {justVoted && (
        <div className="relative z-10 mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 shadow-sm animate-fadeIn">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm">Mun gode da ra'ayinka!</p>
            <p className="text-xs text-emerald-700">An yi nasarar adana kuri'arka. Ga yadda sauran masu karatu suka kada tasu.</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="relative z-10 mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Content Area: Either Voting Form OR Animated Results */}
      <div className="relative z-10">
        {!showResults ? (
          /* ─── Voting Form State ─── */
          <form onSubmit={handleVoteSubmit} className="space-y-4">
            <div className="space-y-3" role="radiogroup" aria-label="Zaɓuɓɓukan ƙuri'a">
              {poll.options.map((option) => {
                const isSelected = selectedOption === option.id;
                return (
                  <label
                    key={option.id}
                    className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? 'border-[#0f3036] bg-[#0f3036]/5 shadow-md shadow-[#0f3036]/5 ring-2 ring-[#0f3036]/20'
                        : 'border-gray-200/90 bg-white hover:border-[#c59d5f] hover:bg-[#c59d5f]/5 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 pr-4">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                          isSelected
                            ? 'border-[#0f3036] bg-[#0f3036] text-white'
                            : 'border-gray-300 bg-white group-hover:border-[#c59d5f]'
                        }`}
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="poll-option"
                        value={option.id}
                        checked={isSelected}
                        onChange={() => setSelectedOption(option.id)}
                        className="sr-only"
                      />
                      <span className={`text-sm font-semibold sm:text-base ${
                        isSelected ? 'text-[#0f3036]' : 'text-[#1c1917] group-hover:text-[#0f3036]'
                      }`}>
                        {option.text}
                      </span>
                    </div>

                    <span className="text-xs font-medium text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                      Zaɓa
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={!selectedOption || isSubmitting}
                className={`flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all ${
                  !selectedOption || isSubmitting
                    ? 'cursor-not-allowed bg-gray-300 opacity-70 shadow-none'
                    : 'bg-[#0f3036] shadow-[#0f3036]/20 hover:-translate-y-0.5 hover:bg-[#1a454c] active:translate-y-0'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Ana Aikawa...</span>
                  </>
                ) : (
                  <>
                    <span>Kada Kuri'a</span>
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowResultsOnly(true)}
                className="text-xs font-bold uppercase tracking-wider text-gray-500 transition-colors hover:text-[#0f3036]"
              >
                Duba Sakamakon Yanzu
              </button>
            </div>
          </form>
        ) : (
          /* ─── Results State with Animated Percentage Bars ─── */
          <div className="space-y-4">
            <div className="space-y-3.5">
              {poll.options.map((option) => {
                const pct = option.percentage ?? (totalVotes > 0 ? Math.round(((option.votes || 0) / totalVotes) * 100) : 0);
                const isUserChoice = userVotedOption === option.id;
                const isHighest = poll.options.every((o) => (o.votes || 0) <= (option.votes || 0)) && (option.votes || 0) > 0;

                return (
                  <div
                    key={option.id}
                    className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-500 ${
                      isUserChoice
                        ? 'border-[#0f3036] bg-[#0f3036]/5 shadow-sm ring-1 ring-[#0f3036]/20'
                        : 'border-gray-100 bg-white'
                    }`}
                  >
                    {/* Background fill bar (animated) */}
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${
                        isUserChoice
                          ? 'bg-gradient-to-r from-[#0f3036]/15 to-[#0f3036]/5'
                          : isHighest
                          ? 'bg-gradient-to-r from-[#c59d5f]/25 to-[#c59d5f]/10'
                          : 'bg-gray-100/70'
                      }`}
                      style={{ width: `${pct}%` }}
                    />

                    {/* Content overlay */}
                    <div className="relative z-10 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold sm:text-base ${
                            isUserChoice ? 'text-[#0f3036]' : 'text-[#1c1917]'
                          }`}>
                            {option.text}
                          </span>
                          {isUserChoice && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#0f3036] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c59d5f]">
                              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Zaɓinku
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2 shrink-0">
                          <span className="font-serif text-lg font-black text-[#0f3036] sm:text-xl">
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bar line */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200/80">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            isUserChoice
                              ? 'bg-gradient-to-r from-[#0f3036] to-[#1a454c]'
                              : isHighest
                              ? 'bg-gradient-to-r from-[#c59d5f] to-[#e0a84e]'
                              : 'bg-gray-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex justify-end text-[11px] font-medium text-gray-500">
                        <span>{(option.votes || 0).toLocaleString()} kuri'u</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Metadata & Actions */}
            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <svg className="h-4 w-4 text-[#c59d5f]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span>
                  Jimillar Kuri'u: <strong className="text-[#0f3036] font-bold">{totalVotes.toLocaleString()}</strong>
                </span>
              </div>

              {!hasVoted && showResultsOnly && (
                <button
                  type="button"
                  onClick={() => setShowResultsOnly(false)}
                  className="text-xs font-bold uppercase tracking-wider text-[#0f3036] transition-colors hover:text-[#c59d5f]"
                >
                  ← Koma don Kada Kuri'a
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
