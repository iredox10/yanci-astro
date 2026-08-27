import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface GalleryItem {
  url: string;
  caption: string;
  credit?: string;
  title?: string;
}

export interface PhotoGalleryProps {
  items: GalleryItem[];
  title?: string;
  className?: string;
}

export default function PhotoGallery({ items, title, className = '' }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Swipe detection refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  // Thumbnail container ref for auto-scrolling
  const thumbnailContainerRef = useRef<HTMLDivElement | null>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement | null>(null);

  const total = items?.length || 0;
  const currentItem = items && items[currentIndex] ? items[currentIndex] : null;

  const goToNext = useCallback(() => {
    if (total === 0) return;
    setIsLoaded(false);
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    if (total === 0) return;
    setIsLoaded(false);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToIndex = useCallback((index: number) => {
    if (index < 0 || index >= total) return;
    setIsLoaded(false);
    setCurrentIndex(index);
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        }
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, goToNext, goToPrev]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isLightboxOpen]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (activeThumbnailRef.current && thumbnailContainerRef.current) {
      activeThumbnailRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentIndex]);

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (
      touchStartX.current === null ||
      touchEndX.current === null ||
      touchStartY.current === null ||
      touchEndY.current === null
    ) {
      return;
    }

    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 45;

    // Ensure horizontal gesture was dominant over vertical scroll
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX > 0) {
        goToNext(); // Swiped left -> next
      } else {
        goToPrev(); // Swiped right -> prev
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
    touchStartY.current = null;
    touchEndY.current = null;
  };

  if (!items || items.length === 0 || !currentItem) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 font-sans">
        Babu hotuna a wannan kundin hotuna a halin yanzu.
      </div>
    );
  }

  return (
    <div
      className={`yanci-photo-gallery relative flex flex-col gap-4 font-sans ${className}`}
      aria-roledescription="carousel"
      aria-label={title || 'Kundin Hotuna'}
    >
      {/* Optional Gallery Title Header */}
      {title && (
        <div className="border-b border-stone-200 pb-3">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#0f3036]">
            {title}
          </h2>
        </div>
      )}

      {/* Main Featured View Container */}
      <div className="relative overflow-hidden rounded-xl bg-black text-white shadow-xl">
        {/* Main Image Viewport with Touch Support */}
        <div
          className="group relative flex aspect-[16/10] sm:aspect-[16/9] w-full items-center justify-center overflow-hidden bg-stone-950 select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Photo */}
          <img
            key={currentItem.url}
            src={currentItem.url}
            alt={currentItem.title || currentItem.caption || `Hoto na ${currentIndex + 1}`}
            onLoad={() => setIsLoaded(true)}
            className={`h-full w-full object-cover transition-all duration-500 ease-out ${
              isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'
            }`}
          />

          {/* Gradient Overlay for Top Badges & Controls */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />

          {/* Top Controls Bar */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
            {/* Counter Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200/90 backdrop-blur-md border border-white/10 shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5 text-[#c59d5f]"
                aria-hidden="true"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>
                Hoton {currentIndex + 1} daga {total}
              </span>
            </span>

            {/* Fullscreen Lightbox Button */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/60 hover:bg-[#0f3036] hover:text-[#c59d5f] px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md border border-white/10 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c59d5f]"
              aria-label="Bude cikakken hoto a fuska gaba daya"
              title="Bude a Cikakken Fuska (Lightbox)"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
                aria-hidden="true"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
              <span className="hidden sm:inline">Cikakken Hoto</span>
            </button>
          </div>

          {/* Navigation Arrows on Featured Image */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/50 hover:bg-[#0f3036] text-white hover:text-[#c59d5f] backdrop-blur-md border border-white/10 transition-all duration-200 opacity-90 hover:opacity-100 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c59d5f] z-10"
                aria-label="Hoton da ya gabata"
                title="Hoton da ya gabata"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={goToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/50 hover:bg-[#0f3036] text-white hover:text-[#c59d5f] backdrop-blur-md border border-white/10 transition-all duration-200 opacity-90 hover:opacity-100 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c59d5f] z-10"
                aria-label="Hoto na gaba"
                title="Hoto na gaba"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Featured View Caption & Metadata Bar */}
        <div className="bg-[#0f3036] px-4 py-4 sm:px-6 sm:py-5 border-t border-stone-800 text-stone-100">
          <div className="flex flex-col gap-2">
            {currentItem.title && (
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
                {currentItem.title}
              </h3>
            )}

            {currentItem.caption && (
              <p className="text-sm sm:text-base text-stone-300 font-sans leading-relaxed">
                {currentItem.caption}
              </p>
            )}

            {currentItem.credit && (
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#c59d5f]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                  aria-hidden="true"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Hoto: {currentItem.credit}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail Strip Below Main Photo */}
      {total > 1 && (
        <div className="relative mt-1">
          <div
            ref={thumbnailContainerRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto py-2 no-scrollbar scroll-smooth snap-x"
            role="tablist"
            aria-label="Jerin kananan hotuna"
          >
            {items.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={item.url + idx}
                  ref={isActive ? activeThumbnailRef : null}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Hoton ${idx + 1}: ${item.title || item.caption || 'Duba hoto'}`}
                  onClick={() => goToIndex(idx)}
                  className={`group relative flex-shrink-0 w-20 h-14 sm:w-28 sm:h-20 rounded-lg overflow-hidden snap-start transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c59d5f] ${
                    isActive
                      ? 'ring-2 sm:ring-4 ring-[#c59d5f] ring-offset-2 ring-offset-stone-900 opacity-100 scale-[1.02] shadow-md'
                      : 'opacity-60 hover:opacity-90 hover:scale-[1.01]'
                  }`}
                >
                  <img
                    src={item.url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    className={`absolute inset-0 transition-colors ${
                      isActive ? 'bg-transparent' : 'bg-black/20 group-hover:bg-transparent'
                    }`}
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cikakken kudin hotuna a fuska gaba daya"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 text-white backdrop-blur-lg select-none"
        >
          {/* Lightbox Header Bar */}
          <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent z-20">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200 backdrop-blur-md border border-white/10">
                Hoton {currentIndex + 1} daga {total}
              </span>
              {title && (
                <span className="hidden md:inline-block font-serif text-sm text-stone-300 truncate max-w-md">
                  {title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-amber-300 transition-colors backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c59d5f]"
                aria-label="Rufe cikakken hoto"
                title="Rufe (Esc)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Lightbox Main Stage with Touch Gestures */}
          <div
            className="relative flex flex-1 items-center justify-center px-4 sm:px-16 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Center Image */}
            <div className="relative max-h-[70vh] sm:max-h-[78vh] max-w-full flex items-center justify-center">
              <img
                key={`lightbox-${currentItem.url}`}
                src={currentItem.url}
                alt={currentItem.title || currentItem.caption || `Hoto na ${currentIndex + 1}`}
                className="max-h-[70vh] sm:max-h-[78vh] max-w-[95vw] sm:max-w-[85vw] object-contain rounded-lg shadow-2xl transition-all duration-300"
              />
            </div>

            {/* Left Prev Navigation Button */}
            {total > 1 && (
              <button
                type="button"
                onClick={goToPrev}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white hover:text-[#c59d5f] backdrop-blur-md border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c59d5f] z-20"
                aria-label="Hoton da ya gabata"
                title="Hoton da ya gabata (Kibiya ta Hagu ←)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {/* Right Next Navigation Button */}
            {total > 1 && (
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white hover:text-[#c59d5f] backdrop-blur-md border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c59d5f] z-20"
                aria-label="Hoto na gaba"
                title="Hoto na gaba (Kibiya ta Dama →)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </div>

          {/* Lightbox Bottom Footer & Caption */}
          <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-4 sm:p-6 text-stone-100 z-20">
            <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
              {currentItem.title && (
                <h4 className="font-serif text-lg sm:text-xl font-bold text-white">
                  {currentItem.title}
                </h4>
              )}

              {currentItem.caption && (
                <p className="text-sm sm:text-base text-stone-300 font-sans leading-relaxed max-h-24 overflow-y-auto">
                  {currentItem.caption}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10 text-xs text-stone-400">
                {currentItem.credit && (
                  <span className="font-semibold uppercase tracking-wider text-[#c59d5f]">
                    Hoto: {currentItem.credit}
                  </span>
                )}

                <div className="hidden sm:flex items-center gap-3 text-stone-400">
                  <span>← → Kibiyoyi don canza hoto</span>
                  <span>•</span>
                  <span>Esc don rufewa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
