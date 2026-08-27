import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  calculateFocalPointFromEvent,
  clampPercent,
  formatFocalPointLabel,
  getImageCropStyles,
  normalizeFocalPoint,
  type FocalPoint,
} from '../../../lib/crop-utils';

export interface FocalPointPickerProps {
  imageUrl: string;
  value?: FocalPoint | { x?: number; y?: number };
  onChange: (point: FocalPoint) => void;
  onClose?: () => void;
}

const PRESET_POSITIONS: Array<{ label: string; x: number; y: number; ariaLabel: string }> = [
  { label: '↖', x: 15, y: 15, ariaLabel: 'Sama da Hagu (Top-Left)' },
  { label: '↑', x: 50, y: 15, ariaLabel: 'Sama (Top-Center)' },
  { label: '↗', x: 85, y: 15, ariaLabel: 'Sama da Dama (Top-Right)' },
  { label: '←', x: 15, y: 50, ariaLabel: 'Hagu (Center-Left)' },
  { label: '•', x: 50, y: 50, ariaLabel: 'Tsakiya (Center)' },
  { label: '→', x: 85, y: 50, ariaLabel: 'Dama (Center-Right)' },
  { label: '↙', x: 15, y: 85, ariaLabel: 'Kasa da Hagu (Bottom-Left)' },
  { label: '↓', x: 50, y: 85, ariaLabel: 'Kasa (Bottom-Center)' },
  { label: '↘', x: 85, y: 85, ariaLabel: 'Kasa da Dama (Bottom-Right)' },
];

export default function FocalPointPicker({
  imageUrl,
  value,
  onChange,
  onClose,
}: FocalPointPickerProps) {
  const [point, setPoint] = useState<FocalPoint>(() => normalizeFocalPoint(value));
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync external value if changed
  useEffect(() => {
    if (value) {
      setPoint(normalizeFocalPoint(value));
    }
  }, [value]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updatePointFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const next = calculateFocalPointFromEvent(clientX, clientY, rect);
      setPoint(next);
      onChange(next);
    },
    [onChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePointFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePointFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture already released
      }
    }
  };

  const handleAxisChange = (axis: 'x' | 'y', val: number) => {
    const clamped = clampPercent(val);
    const next = { ...point, [axis]: clamped };
    setPoint(next);
    onChange(next);
  };

  const handleKeyDownOnCanvas = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 5 : 1;
    let nextX = point.x;
    let nextY = point.y;
    let handled = true;

    switch (e.key) {
      case 'ArrowLeft':
        nextX -= step;
        break;
      case 'ArrowRight':
        nextX += step;
        break;
      case 'ArrowUp':
        nextY -= step;
        break;
      case 'ArrowDown':
        nextY += step;
        break;
      default:
        handled = false;
        break;
    }

    if (handled) {
      e.preventDefault();
      const next = { x: clampPercent(nextX), y: clampPercent(nextY) };
      setPoint(next);
      onChange(next);
    }
  };

  const applyPreset = (x: number, y: number) => {
    const next = { x, y };
    setPoint(next);
    onChange(next);
  };

  const resetToCenter = () => {
    const next = { x: 50, y: 50 };
    setPoint(next);
    onChange(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focal-point-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-yanci-dark/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Box */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-none border border-yanci-primary/20 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-yanci-primary/15 bg-yanci-paper/80 px-6 py-4">
          <div>
            <h2 id="focal-point-title" className="font-serif text-xl font-bold text-yanci-primary">
              Tsakiyar Hoto (Image Focal Point)
            </h2>
            <p className="mt-0.5 text-xs text-yanci-primary/60">
              Danna ko ja hoton don zaɓar muhimmin sashen da za a kiyaye yayin yanka (crop).
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Rufe"
              className="flex size-8 items-center justify-center rounded text-lg font-bold text-yanci-primary/50 transition-colors hover:bg-yanci-primary/10 hover:text-yanci-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-yanci-accent"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!imageUrl ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 text-3xl">🖼️</div>
              <p className="font-medium text-yanci-primary">Babu hoton da aka zaɓa tukuna.</p>
              <p className="mt-1 text-xs text-yanci-primary/60">
                Da farko loda ko saka adireshin hoto a cikin edita.
              </p>
            </div>
          ) : imgError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-yanci-red">
              <p className="font-semibold">An kasa nuna hoton.</p>
              <p className="mt-1 text-xs text-yanci-dark/60">Tabbatar cewa URL ɗin yana aiki daidai.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column: Interactive Focal Point Canvas */}
              <div className="flex flex-col lg:col-span-7">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-yanci-primary/70">
                    Babban Hoto (Danna don saita tsakiya)
                  </span>
                  <span className="rounded bg-yanci-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-yanci-primary">
                    {formatFocalPointLabel(point)}
                  </span>
                </div>

                <div
                  ref={imageContainerRef}
                  tabIndex={0}
                  role="slider"
                  aria-label="Image focal point picker"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={point.x}
                  aria-valuetext={`X: ${point.x}%, Y: ${point.y}%`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onKeyDown={handleKeyDownOnCanvas}
                  className="group relative select-none overflow-hidden border border-yanci-primary/20 bg-yanci-paper/60 shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-yanci-accent cursor-crosshair"
                  style={{ minHeight: '260px' }}
                >
                  <img
                    src={imageUrl}
                    alt="Focal point preview"
                    onError={() => setImgError(true)}
                    className="block h-auto max-h-[380px] w-full object-contain pointer-events-none"
                    draggable={false}
                  />

                  {/* Crosshair & Target Overlay */}
                  <div
                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  >
                    {/* Ring Target */}
                    <div className="relative flex size-8 items-center justify-center">
                      <span className="absolute size-8 rounded-full border-2 border-white bg-yanci-accent/60 shadow-lg ring-1 ring-yanci-primary/40 animate-pulse" />
                      <span className="size-2 rounded-full bg-white shadow-xs" />
                      {/* Crosshair ticks */}
                      <span className="absolute -top-3.5 h-3 w-0.5 bg-white shadow-xs" />
                      <span className="absolute -bottom-3.5 h-3 w-0.5 bg-white shadow-xs" />
                      <span className="absolute -left-3.5 h-0.5 w-3 bg-white shadow-xs" />
                      <span className="absolute -right-3.5 h-0.5 w-3 bg-white shadow-xs" />
                    </div>

                    {/* Coordinate Tag */}
                    <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-yanci-primary px-1.5 py-0.5 text-[10px] font-mono font-bold text-white shadow">
                      {point.x}% , {point.y}%
                    </div>
                  </div>
                </div>

                {/* Fine Controls & Presets */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-yanci-primary/10 pt-4">
                  {/* 3x3 Preset Grid */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-yanci-primary/60">
                      Gurbi:
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {PRESET_POSITIONS.map((preset) => {
                        const isSelected =
                          Math.abs(point.x - preset.x) < 5 && Math.abs(point.y - preset.y) < 5;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => applyPreset(preset.x, preset.y)}
                            title={preset.ariaLabel}
                            aria-label={preset.ariaLabel}
                            className={`flex size-6 items-center justify-center border text-xs font-bold transition-colors ${
                              isSelected
                                ? 'border-yanci-accent bg-yanci-accent text-white'
                                : 'border-yanci-primary/20 bg-white text-yanci-primary/70 hover:bg-yanci-paper'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sliders / Inputs */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-yanci-dark">
                      <span className="font-bold text-yanci-primary/70">X:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={point.x}
                        onChange={(e) => handleAxisChange('x', parseFloat(e.target.value) || 0)}
                        className="w-14 border border-yanci-primary/25 bg-white px-1.5 py-1 font-mono text-xs text-center focus:border-yanci-accent focus:outline-none"
                      />
                      <span className="text-yanci-primary/50">%</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-yanci-dark">
                      <span className="font-bold text-yanci-primary/70">Y:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={point.y}
                        onChange={(e) => handleAxisChange('y', parseFloat(e.target.value) || 0)}
                        className="w-14 border border-yanci-primary/25 bg-white px-1.5 py-1 font-mono text-xs text-center focus:border-yanci-accent focus:outline-none"
                      />
                      <span className="text-yanci-primary/50">%</span>
                    </label>

                    <button
                      type="button"
                      onClick={resetToCenter}
                      className="border border-yanci-primary/20 bg-yanci-paper px-2 py-1 text-[11px] font-semibold text-yanci-primary hover:bg-yanci-primary/10"
                    >
                      Tsakiya
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Aspect Ratio Previews */}
              <div className="flex flex-col lg:col-span-5">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-yanci-primary/70">
                  Misalai Yayin Yanka (Live Aspect Ratio Previews)
                </span>

                <div className="space-y-3.5 rounded-none border border-yanci-primary/15 bg-yanci-paper/40 p-3.5">
                  {/* 16:9 Preview */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-yanci-primary/70">
                      <span>16:9 — Babban Labari (Hero / Header)</span>
                      <span className="font-mono text-[10px] text-yanci-primary/40">object-cover</span>
                    </div>
                    <div className="overflow-hidden border border-yanci-primary/20 bg-yanci-dark/10" style={{ aspectRatio: '16/9' }}>
                      <img
                        src={imageUrl}
                        alt="16:9 preview"
                        style={getImageCropStyles(point, '16:9')}
                        className="h-full w-full"
                      />
                    </div>
                  </div>

                  {/* 4:3 Preview */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-yanci-primary/70">
                      <span>4:3 — Katun Labari (Card Grid)</span>
                      <span className="font-mono text-[10px] text-yanci-primary/40">object-cover</span>
                    </div>
                    <div className="overflow-hidden border border-yanci-primary/20 bg-yanci-dark/10" style={{ aspectRatio: '4/3', maxHeight: '110px' }}>
                      <img
                        src={imageUrl}
                        alt="4:3 preview"
                        style={getImageCropStyles(point, '4:3')}
                        className="h-full w-full"
                      />
                    </div>
                  </div>

                  {/* 1:1 Preview */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-yanci-primary/70">
                      <span>1:1 — Murabba'i (Square Thumbnail)</span>
                      <span className="font-mono text-[10px] text-yanci-primary/40">object-cover</span>
                    </div>
                    <div className="size-20 overflow-hidden border border-yanci-primary/20 bg-yanci-dark/10">
                      <img
                        src={imageUrl}
                        alt="1:1 preview"
                        style={getImageCropStyles(point, '1:1')}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-yanci-primary/15 bg-yanci-paper/60 px-6 py-3">
          <p className="text-xs text-yanci-primary/50">
            CSS: <code className="font-mono font-bold text-yanci-primary">object-position: {point.x}% {point.y}%;</code>
          </p>
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="border border-yanci-primary/25 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-yanci-primary hover:bg-yanci-primary/5"
              >
                An gama
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onChange(point);
                if (onClose) onClose();
              }}
              className="bg-yanci-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-yanci-paper transition-colors hover:bg-yanci-primary/90"
            >
              Aiwatar (Apply)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
