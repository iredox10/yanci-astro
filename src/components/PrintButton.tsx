import type { MouseEvent } from 'react';

export interface PrintButtonProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'standard' | 'minimal' | 'card';
  label?: string;
}

export default function PrintButton({
  className = '',
  showLabel = false,
  size = 'md',
  variant = 'standard',
  label = 'Buga',
}: PrintButtonProps) {
  const handlePrint = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      window.print();
    }
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

  if (variant === 'minimal') {
    return (
      <button
        type="button"
        onClick={handlePrint}
        aria-label="Buga wannan labari"
        title="Buga wannan labari (Print / PDF)"
        className={`flex items-center gap-1.5 p-1 text-gray-400 transition-colors hover:text-[#0f3036] ${className}`}
      >
        <svg
          className={iconSizes}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        {showLabel && (
          <span className="text-xs font-semibold">{label}</span>
        )}
      </button>
    );
  }

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handlePrint}
        aria-label="Buga wannan labari"
        title="Buga wannan labari (Print / PDF)"
        className={`flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:bg-black/60 hover:text-white active:scale-90 ${className}`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      aria-label="Buga wannan labari"
      title="Buga wannan labari (Print / PDF)"
      className={`group flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white text-gray-500 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f3036] active:scale-95 ${
        showLabel ? 'h-10 px-3.5' : sizeClasses
      } ${className}`}
    >
      <svg
        className={`${iconSizes} transition-transform duration-200 group-hover:scale-110`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      {showLabel && (
        <span className="font-sans text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
      )}
    </button>
  );
}
