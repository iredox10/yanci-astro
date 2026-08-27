import { useEffect, useState, useRef, type MouseEvent } from 'react';
import {
  type BookmarkArticleProps,
  isArticleSaved,
  toggleSavedArticle,
  subscribeBookmarks,
} from '../lib/bookmarks';

export interface BookmarkButtonProps {
  article: BookmarkArticleProps;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'standard' | 'minimal' | 'card';
}

export default function BookmarkButton({
  article,
  className = '',
  showLabel = false,
  size = 'md',
  variant = 'standard',
}: BookmarkButtonProps) {
  const [saved, setSaved] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'saved' | 'removed'>('saved');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync saved state on mount and when bookmarks change
  useEffect(() => {
    if (!article?.id) return;
    setSaved(isArticleSaved(article.id));

    const unsubscribe = subscribeBookmarks(() => {
      setSaved(isArticleSaved(article.id));
    });

    return () => {
      unsubscribe();
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [article?.id]);

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!article || !article.id) return;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    const result = toggleSavedArticle(article);
    setSaved(result.saved);

    const message = result.saved ? 'An ajiye labari' : 'An cire labari';
    const type = result.saved ? 'saved' : 'removed';

    setToastType(type);
    setToastMessage(message);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {variant === 'standard' ? (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={saved ? 'Cire daga labaran da aka ajiye' : 'Ajiye wannan labari'}
          title={saved ? 'Cire daga labaran da aka ajiye' : 'Ajiye wannan labari'}
          className={`group flex items-center justify-center gap-2 rounded-full border transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c59d5f] active:scale-95 ${
            saved
              ? 'border-[#c59d5f]/40 bg-[#c59d5f]/10 text-[#c59d5f] shadow-sm hover:border-[#c59d5f] hover:bg-[#c59d5f]/20'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
          } ${showLabel ? 'h-10 px-3.5' : sizeClasses}`}
        >
          <svg
            className={`${iconSizes} transition-transform duration-200 ${
              isAnimating ? 'scale-125' : 'group-hover:scale-110'
            }`}
            viewBox="0 0 24 24"
            fill={saved ? '#c59d5f' : 'none'}
            stroke={saved ? '#c59d5f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>

          {showLabel && (
            <span className="font-sans text-xs font-bold uppercase tracking-wider">
              {saved ? 'An Ajiye' : 'Ajiye'}
            </span>
          )}
        </button>
      ) : variant === 'card' ? (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={saved ? 'Cire daga labaran da aka ajiye' : 'Ajiye wannan labari'}
          title={saved ? 'Cire daga labaran da aka ajiye' : 'Ajiye labari'}
          className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 active:scale-90 ${
            saved
              ? 'bg-[#0f3036] text-[#c59d5f] shadow-md ring-1 ring-[#c59d5f]/50'
              : 'bg-black/40 text-white hover:bg-black/60 hover:text-[#c59d5f]'
          }`}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${
              isAnimating ? 'scale-125' : ''
            }`}
            viewBox="0 0 24 24"
            fill={saved ? '#c59d5f' : 'none'}
            stroke={saved ? '#c59d5f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={saved ? 'Cire daga labaran da aka ajiye' : 'Ajiye wannan labari'}
          title={saved ? 'Cire daga labaran da aka ajiye' : 'Ajiye labari'}
          className={`flex items-center gap-1.5 p-1 transition-colors ${
            saved
              ? 'text-[#c59d5f]'
              : 'text-gray-400 hover:text-[#c59d5f]'
          }`}
        >
          <svg
            className={`${iconSizes} transition-transform duration-200 ${
              isAnimating ? 'scale-125' : ''
            }`}
            viewBox="0 0 24 24"
            fill={saved ? '#c59d5f' : 'none'}
            stroke={saved ? '#c59d5f' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {showLabel && (
            <span className="text-xs font-semibold">
              {saved ? 'An Ajiye' : 'Ajiye'}
            </span>
          )}
        </button>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-xl transition-all duration-300 animate-in fade-in zoom-in-95 z-50 flex items-center gap-1.5 ${
            toastType === 'saved' ? 'bg-[#0f3036] ring-1 ring-[#c59d5f]/60' : 'bg-gray-800'
          }`}
        >
          {toastType === 'saved' ? (
            <span className="h-2 w-2 rounded-full bg-[#c59d5f]" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-red-400" />
          )}
          <span>{toastMessage}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0f3036]" />
        </div>
      )}
    </div>
  );
}
