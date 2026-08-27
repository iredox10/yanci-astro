import { useEffect, useState, useCallback } from 'react';

export type FontSizeOption = 'normal' | 'big' | 'large' | 'xlarge';

export interface FontSizeConfig {
  id: FontSizeOption;
  label: string;
  displayLabel: string;
  ariaLabel: string;
  title: string;
  scale: number;
}

export const FONT_SIZE_STORAGE_KEY = 'yanci_reader_fontsize';

export const FONT_SIZE_OPTIONS: FontSizeConfig[] = [
  {
    id: 'normal',
    label: 'Normal',
    displayLabel: 'A',
    ariaLabel: 'Girman rubutu na kullum (Normal - A)',
    title: 'Normal (A)',
    scale: 1,
  },
  {
    id: 'big',
    label: 'Big',
    displayLabel: 'A+',
    ariaLabel: 'Babban girman rubutu (Big - A+)',
    title: 'Big (A+)',
    scale: 1.15,
  },
  {
    id: 'large',
    label: 'Large',
    displayLabel: 'A++',
    ariaLabel: 'Mafi babban girman rubutu (Large - A++)',
    title: 'Large (A++)',
    scale: 1.3,
  },
  {
    id: 'xlarge',
    label: 'Extra Large',
    displayLabel: 'A+++',
    ariaLabel: 'Babban gaske girman rubutu (Extra Large - A+++)',
    title: 'Extra Large (A+++)',
    scale: 1.5,
  },
];

export interface FontSizeControllerProps {
  className?: string;
  showReset?: boolean;
}

/**
 * Apply the selected font size to the article body elements and root element
 */
export function applyReaderFontSize(size: FontSizeOption): void {
  if (typeof document === 'undefined') return;

  const targets = document.querySelectorAll('.yanci-article-body, .article-body');
  targets.forEach((el) => {
    (el as HTMLElement).setAttribute('data-font-size', size);
  });
  document.documentElement.setAttribute('data-reader-font-size', size);

  // Dispatch event so any other listeners can react
  window.dispatchEvent(
    new CustomEvent('yanci:fontsize-change', {
      detail: { size },
    })
  );
}

export default function FontSizeController({
  className = '',
  showReset = true,
}: FontSizeControllerProps) {
  const [currentSize, setCurrentSize] = useState<FontSizeOption>('normal');
  const [mounted, setMounted] = useState(false);

  // Read persisted preference on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY) as FontSizeOption | null;
      if (
        saved &&
        (saved === 'normal' || saved === 'big' || saved === 'large' || saved === 'xlarge')
      ) {
        setCurrentSize(saved);
        applyReaderFontSize(saved);
      } else {
        applyReaderFontSize('normal');
      }
    } catch {
      applyReaderFontSize('normal');
    }
  }, []);

  const handleSelectSize = useCallback((size: FontSizeOption) => {
    setCurrentSize(size);
    applyReaderFontSize(size);
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
    } catch {
      // Ignore quota/private mode errors
    }
  }, []);

  const handleReset = useCallback(() => {
    handleSelectSize('normal');
  }, [handleSelectSize]);

  return (
    <div
      role="group"
      aria-label="Girman haruffan karatu (Reader font size)"
      className={`inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-white p-1 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Zaɓin girman rubutu">
        {FONT_SIZE_OPTIONS.map((opt) => {
          const isActive = mounted ? currentSize === opt.id : opt.id === 'normal';
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={opt.ariaLabel}
              title={opt.title}
              onClick={() => handleSelectSize(opt.id)}
              className={`flex h-8 min-w-[30px] items-center justify-center rounded-full px-2 text-xs font-bold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#c59d5f] active:scale-95 ${
                isActive
                  ? 'bg-[#0f3036] text-[#c59d5f] shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span
                className={`leading-none ${
                  opt.id === 'normal'
                    ? 'text-[11px]'
                    : opt.id === 'big'
                    ? 'text-[12px]'
                    : opt.id === 'large'
                    ? 'text-[13px]'
                    : 'text-[14px]'
                }`}
              >
                {opt.displayLabel}
              </span>
            </button>
          );
        })}
      </div>

      {showReset && (
        <>
          <div className="mx-0.5 h-4 w-px bg-gray-200" aria-hidden="true" />
          <button
            type="button"
            onClick={handleReset}
            disabled={mounted && currentSize === 'normal'}
            aria-label="Sake saita girman rubutu (Reset font size to default)"
            title="Sake saita girman rubutu (Reset font size)"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#c59d5f] active:scale-90 ${
              mounted && currentSize === 'normal'
                ? 'cursor-not-allowed text-gray-300'
                : 'text-gray-500 hover:bg-gray-100 hover:text-[#0f3036]'
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
