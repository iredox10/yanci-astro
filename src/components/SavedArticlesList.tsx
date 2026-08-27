import { useEffect, useState, useMemo } from 'react';
import {
  type SavedArticleItem,
  getSavedArticles,
  removeSavedArticle,
  clearAllSavedArticles,
  subscribeBookmarks,
} from '../lib/bookmarks';

export default function SavedArticlesList() {
  const [mounted, setMounted] = useState(false);
  const [articles, setArticles] = useState<SavedArticleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [showClearModal, setShowClearModal] = useState(false);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load articles on mount and subscribe to changes
  useEffect(() => {
    setMounted(true);
    setArticles(getSavedArticles());

    const unsubscribe = subscribeBookmarks(() => {
      setArticles(getSavedArticles());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleRemove = (id: string, headline: string) => {
    const updated = removeSavedArticle(id);
    setArticles(updated);
    showToast(`An cire "${headline.slice(0, 30)}${headline.length > 30 ? '...' : ''}"`);
  };

  const handleClearAll = () => {
    clearAllSavedArticles();
    setArticles([]);
    setShowClearModal(false);
    showToast('An goge duka labaran da aka ajiye');
  };

  const handleShare = async (article: SavedArticleItem) => {
    const articleUrl = `${window.location.origin}/article/${article.slug || article.id}`;
    const shareData = {
      title: article.headline,
      text: `${article.headline} - Yanci`,
      url: articleUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to modal if share canceled or aborted
        if ((err as Error).name !== 'AbortError') {
          setActiveShareId(activeShareId === article.id ? null : article.id);
        }
      }
    } else {
      setActiveShareId(activeShareId === article.id ? null : article.id);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('An kwafi hanyar labarin zuwa allo!');
      setActiveShareId(null);
    } catch {
      showToast('Ba a iya kwafar hanyar ba.');
    }
  };

  const formatSavedDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ha-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Extract unique sections
  const sections = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => {
      if (a.section) set.add(a.section);
    });
    return Array.from(set);
  }, [articles]);

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    return articles
      .filter((a) => {
        const matchesQuery =
          searchQuery.trim() === '' ||
          a.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.section && a.section.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesSection = selectedSection === 'all' || a.section === selectedSection;

        return matchesQuery && matchesSection;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime();
        }
        if (sortOrder === 'oldest') {
          return new Date(a.savedAt || 0).getTime() - new Date(b.savedAt || 0).getTime();
        }
        if (sortOrder === 'alphabetical') {
          return a.headline.localeCompare(b.headline);
        }
        return 0;
      });
  }, [articles, searchQuery, selectedSection, sortOrder]);

  if (!mounted) {
    return (
      <div className="flex min-h-[400px] items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#c59d5f] border-t-transparent"></div>
          <span className="font-serif text-sm italic text-gray-500">Ana loda labaran da aka ajiye...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#0f3036] px-4 py-3 text-sm font-bold text-white shadow-2xl ring-1 ring-[#c59d5f]/50 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <span className="h-2 w-2 rounded-full bg-[#c59d5f]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls Bar */}
      {articles.length > 0 && (
        <div className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#0f3036]/10 px-3 py-1 font-sans text-xs font-bold uppercase tracking-wider text-[#0f3036]">
                {articles.length} {articles.length === 1 ? 'Labari' : 'Labarai'}
              </span>
              {filteredArticles.length !== articles.length && (
                <span className="text-xs text-gray-500">
                  (an tace {filteredArticles.length})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Sort Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 font-medium hidden sm:inline">Tsari:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  aria-label="Tsara labarai"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 outline-none hover:border-gray-300 focus:border-[#c59d5f] focus:ring-1 focus:ring-[#c59d5f]"
                >
                  <option value="newest">Kwanan nan aka ajiye</option>
                  <option value="oldest">Tsoffin ajiyar farko</option>
                  <option value="alphabetical">Bisa Harafi (A-Z)</option>
                </select>
              </div>

              {/* Clear All Button */}
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100/80 active:scale-95"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Goge duka</span>
              </button>
            </div>
          </div>

          {/* Search & Section Filter Bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="search"
                placeholder="Nemi a cikin labaran da aka ajiye..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-[#c59d5f] focus:ring-2 focus:ring-[#c59d5f]/20"
              />
              <svg
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Share bincike"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Section Badges Filter */}
            {sections.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedSection('all')}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    selectedSection === 'all'
                      ? 'bg-[#0f3036] text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Duka
                </button>
                {sections.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSection(sec)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      selectedSection === sec
                        ? 'bg-[#0f3036] text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {articles.length === 0 ? (
        /* Empty State */
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 text-center shadow-sm my-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#f4f1ea] text-[#c59d5f]">
            <svg
              className="h-10 w-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="mb-3 font-serif text-2xl font-bold text-[#1c1917] sm:text-3xl">
            Ba ka ajiye wani labari ba tukuna
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-gray-600">
            Duk lokacin da ka ga labarin da kake son karantawa a gaba, danna alamar ajiya (<span className="text-[#c59d5f] font-bold">🔖</span>) a gefen labarin domin adana shi a nan.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f3036] px-6 py-3.5 font-sans text-sm font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1a454c] hover:shadow-xl"
          >
            <span>Bincika Labarai</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      ) : filteredArticles.length === 0 ? (
        /* No Search / Filter Results */
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white/50 p-12 text-center my-8">
          <p className="font-serif text-lg text-gray-600 mb-4">
            Babu labarin da aka ajiye mai dacewa da "{searchQuery}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedSection('all');
            }}
            className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
          >
            Sake duba duka labaran
          </button>
        </div>
      ) : (
        /* Articles Grid */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => {
            const articleHref = `/article/${article.slug || article.id}`;
            const isShareOpen = activeShareId === article.id;
            const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${articleHref}` : articleHref;

            return (
              <article
                key={article.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-gray-300 hover:shadow-xl"
              >
                {/* Image Thumbnail */}
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                  {article.image ? (
                    <img
                      src={article.image}
                      alt={article.headline}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback image styling
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0f3036] to-[#1a454c] p-6 text-center text-white">
                      <span className="font-serif text-lg font-bold opacity-80 line-clamp-2">
                        {article.headline}
                      </span>
                    </div>
                  )}

                  {/* Section Badge */}
                  {article.section && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#0f3036]/90 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-[#c59d5f] backdrop-blur-md shadow-sm">
                      {article.section}
                    </span>
                  )}

                  {/* Quick Remove Button Overlay */}
                  <button
                    type="button"
                    onClick={() => handleRemove(article.id, article.headline)}
                    aria-label={`Cire ${article.headline}`}
                    title="Cire daga ajiyar"
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all duration-200 hover:bg-red-600 hover:scale-110 active:scale-95"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5">
                  {/* Saved Date Info */}
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-gray-400">
                    <svg className="h-3.5 w-3.5 text-[#c59d5f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>An ajiye: {formatSavedDate(article.savedAt)}</span>
                  </div>

                  {/* Headline */}
                  <h3 className="mb-4 font-serif text-lg font-bold leading-snug text-[#1c1917] transition-colors group-hover:text-[#0f3036] line-clamp-3">
                    <a href={articleHref} className="hover:underline">
                      {article.headline}
                    </a>
                  </h3>

                  {/* Card Actions Footer */}
                  <div className="mt-auto border-t border-gray-100 pt-4 flex items-center justify-between gap-2">
                    {/* Read Link */}
                    <a
                      href={articleHref}
                      className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-[#0f3036] transition-colors hover:text-[#c59d5f]"
                    >
                      <span>Karanta</span>
                      <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>

                    {/* Action buttons */}
                    <div className="relative flex items-center gap-1.5">
                      {/* Share Button */}
                      <button
                        type="button"
                        onClick={() => handleShare(article)}
                        aria-label="Raba wannan labari"
                        title="Raba labari"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-[#0f3036] hover:bg-[#0f3036] hover:text-white"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(article.id, article.headline)}
                        aria-label="Cire labari"
                        title="Cire"
                        className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      >
                        <span>Cire</span>
                      </button>

                      {/* Share Popover fallback */}
                      {isShareOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-2xl z-20 animate-in fade-in zoom-in-95">
                          <div className="flex flex-col gap-1 text-xs">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(fullUrl)}
                              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-medium text-gray-700 hover:bg-gray-100"
                            >
                              <svg className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              <span>Kwafi Hanyar (Copy)</span>
                            </button>
                            <a
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${article.headline} - ${fullUrl}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              <span className="text-emerald-600 font-bold">●</span>
                              <span>WhatsApp</span>
                            </a>
                            <a
                              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(article.headline)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 hover:bg-sky-50 hover:text-sky-700"
                            >
                              <span className="text-sky-500 font-bold">●</span>
                              <span>Twitter / X</span>
                            </a>
                            <a
                              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <span className="text-blue-600 font-bold">●</span>
                              <span>Facebook</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 id="clear-modal-title" className="mb-2 text-center font-serif text-xl font-bold text-gray-900">
              Goge duka labaran da aka ajiye?
            </h3>
            <p className="mb-6 text-center text-sm text-gray-600">
              Shin ka tabbata kana son goge duka labaran da ka ajiye ({articles.length})? Ba za a iya dawo da su ba idan ka goge.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 active:scale-95"
              >
                A'a, fasa
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-red-700 active:scale-95"
              >
                I, goge duka
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
