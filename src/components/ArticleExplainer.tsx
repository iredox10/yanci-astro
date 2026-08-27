import { useState, useCallback } from 'react';

export interface ArticleExplainerProps {
  headline: string;
  body: string;
  initialSummary?: string;
}

interface ExplainResponse {
  ok: boolean;
  bullets?: string[];
  recap?: string;
  message?: string;
}

export default function ArticleExplainer({
  headline,
  body,
  initialSummary,
}: ArticleExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bullets, setBullets] = useState<string[]>(() => {
    if (!initialSummary) return [];
    const lines = initialSummary
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter((l) => l.length > 0);
    return lines.length > 1 ? lines : [];
  });
  const [recap, setRecap] = useState<string>(() => {
    if (!initialSummary) return '';
    const lines = initialSummary.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.length === 1 ? lines[0] : '';
  });
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const fetchExplanation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, body }),
      });

      const data: ExplainResponse = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'An kasa samun bayani daga AI');
      }

      if (Array.isArray(data.bullets) && data.bullets.length > 0) {
        setBullets(data.bullets);
      }
      if (data.recap) {
        setRecap(data.recap);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kuskure ya faru wajen loda bayani';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [headline, body]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    // If opening for the first time and no data loaded yet, fetch explanation
    if (nextState && bullets.length === 0 && !recap && !isLoading && !initialSummary) {
      fetchExplanation();
    }
  };

  const handleRating = (value: 'up' | 'down') => {
    setRating(value);
    setFeedbackSent(true);
  };

  return (
    <section
      aria-label="Ka Fahimci Wannan Labari"
      className="my-8 overflow-hidden rounded-2xl border border-[#0f3036]/15 bg-gradient-to-br from-[#f8faf8] via-[#f4f7f5] to-[#edf3ef] shadow-sm transition-all duration-300 hover:shadow-md"
    >
      {/* Header Banner */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls="explainer-accordion-content"
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-[#0f3036]/5 sm:p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f3036]"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f3036] text-amber-300 shadow-inner">
            <span className="text-xl" role="img" aria-hidden="true">
              💡
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-base font-bold text-[#121212] sm:text-lg">
                Ka Fahimci Wannan Labari
              </span>
              <span className="inline-flex items-center rounded-full bg-[#0f3036]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0f3036]">
                AI Saukake
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
              Babban jigon labarin a sauƙaƙe cikin yaren Hausa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden font-sans text-xs font-semibold text-[#0f3036] sm:inline">
            {isOpen ? 'Rufe' : 'Fadada'}
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0f3036] shadow-sm transition-transform duration-300 ${
              isOpen ? 'rotate-180 bg-[#0f3036] text-white' : ''
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div
          id="explainer-accordion-content"
          className="border-t border-[#0f3036]/10 bg-white/70 p-4 sm:p-6 backdrop-blur-sm"
        >
          {/* Skeleton Loader while generating */}
          {isLoading && (
            <div className="space-y-4 py-2" role="status" aria-label="Ana loda bayani...">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f3036]/70">
                <span className="inline-block h-2 w-2 animate-ping rounded-full bg-[#0f3036]" />
                Ana nazari da sauƙaƙa labarin da AI...
              </div>

              {/* Skeleton Recap */}
              <div className="h-14 w-full animate-pulse rounded-xl bg-gray-200/80" />

              {/* Skeleton Bullets */}
              <div className="space-y-3 pt-2">
                {[85, 95, 75, 90].map((widthPercent, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-emerald-200" />
                    <div
                      className="h-5 animate-pulse rounded-md bg-gray-200/80"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
              <div className="flex items-center gap-2 font-bold">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Ba a samu bayani ba</span>
              </div>
              <p className="mt-1 text-xs text-red-600">{error}</p>
              <button
                type="button"
                onClick={fetchExplanation}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                Sake Gwadawa
              </button>
            </div>
          )}

          {/* Loaded Content */}
          {!isLoading && !error && (bullets.length > 0 || recap) && (
            <div className="space-y-5">
              {/* Short Recap Banner */}
              {recap && (
                <div className="rounded-xl border-l-4 border-[#0f3036] bg-[#0f3036]/5 p-3.5 sm:p-4">
                  <span className="block text-[11px] font-bold uppercase tracking-widest text-[#0f3036]">
                    A Taƙaice
                  </span>
                  <p className="mt-1 font-serif text-sm leading-relaxed text-[#1c1917] sm:text-base">
                    {recap}
                  </p>
                </div>
              )}

              {/* Takeaway Bullets */}
              {bullets.length > 0 && (
                <div>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                    Muhimman Abubuwan Lura:
                  </h4>
                  <ul className="space-y-3">
                    {bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm"
                          aria-hidden="true"
                        >
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                        <span className="font-sans text-sm leading-relaxed text-gray-800 sm:text-[15px]">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rating and Closing Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-200/80 pt-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-600">
                    Wannan bayani ya taimaka?
                  </span>
                  {feedbackSent ? (
                    <span className="font-semibold text-emerald-700">
                      Mun gode da ra'ayinka! 🙏
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRating('up')}
                        aria-label="Wannan bayani ya taimaka (E)"
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-medium transition-all ${
                          rating === 'up'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50'
                        }`}
                      >
                        <span role="img" aria-hidden="true">
                          👍
                        </span>
                        <span>E</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRating('down')}
                        aria-label="Wannan bayani bai taimaka ba (A'a)"
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-medium transition-all ${
                          rating === 'down'
                            ? 'border-red-600 bg-red-50 text-red-700 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-red-400 hover:bg-red-50/50'
                        }`}
                      >
                        <span role="img" aria-hidden="true">
                          👎
                        </span>
                        <span>A'a</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="self-end sm:self-auto font-sans font-semibold text-gray-500 hover:text-[#0f3036] hover:underline"
                >
                  Rufe wannan bayani ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
