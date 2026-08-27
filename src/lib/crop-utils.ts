/**
 * Helper utilities for image cropping, focal point calculations, and CSS formatting.
 * Used across the Yanci editorial admin and frontend image components.
 */

export interface FocalPoint {
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
}

export type StandardAspectRatio = '16:9' | '4:3' | '1:1' | '3:2' | '2:1' | '9:16';

export const ASPECT_RATIOS: Record<StandardAspectRatio, { label: string; ratio: number; css: string }> = {
  '16:9': { label: '16:9 (Landscape / Hero)', ratio: 16 / 9, css: '16 / 9' },
  '4:3': { label: '4:3 (Standard / Card)', ratio: 4 / 3, css: '4 / 3' },
  '1:1': { label: '1:1 (Square / Avatar)', ratio: 1, css: '1 / 1' },
  '3:2': { label: '3:2 (Classic Photo)', ratio: 3 / 2, css: '3 / 2' },
  '2:1': { label: '2:1 (Panoramic Banner)', ratio: 2 / 1, css: '2 / 1' },
  '9:16': { label: '9:16 (Vertical / Story)', ratio: 9 / 16, css: '9 / 16' },
};

/**
 * Clamps a number between min and max (defaults 0 to 100), rounded to specified decimal places.
 */
export function clampPercent(value: number, min = 0, max = 100, decimals = 1): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  const clamped = Math.min(Math.max(value, min), max);
  const factor = Math.pow(10, decimals);
  return Math.round(clamped * factor) / factor;
}

/**
 * Normalizes focal point coordinates to valid 0-100 percentages. Defaults to center (50, 50).
 */
export function normalizeFocalPoint(point?: Partial<FocalPoint> | null): FocalPoint {
  if (!point) return { x: 50, y: 50 };
  return {
    x: clampPercent(typeof point.x === 'number' ? point.x : 50),
    y: clampPercent(typeof point.y === 'number' ? point.y : 50),
  };
}

/**
 * Formats focal point coordinates into CSS object-position / background-position string.
 * Example: `x% y%` -> "50% 50%" or "25.5% 80%"
 */
export function getFocalPointCss(point?: Partial<FocalPoint> | null): string {
  const norm = normalizeFocalPoint(point);
  return `${norm.x}% ${norm.y}%`;
}

/**
 * Parses a CSS object-position string (e.g. "40% 60%" or "center") into a FocalPoint object.
 */
export function parseFocalPointCss(cssPosition?: string | null): FocalPoint {
  if (!cssPosition || typeof cssPosition !== 'string') return { x: 50, y: 50 };

  const trimmed = cssPosition.trim().toLowerCase();
  if (trimmed === 'center' || trimmed === 'center center') return { x: 50, y: 50 };
  if (trimmed === 'top' || trimmed === 'top center' || trimmed === 'center top') return { x: 50, y: 0 };
  if (trimmed === 'bottom' || trimmed === 'bottom center' || trimmed === 'center bottom') return { x: 50, y: 100 };
  if (trimmed === 'left' || trimmed === 'left center' || trimmed === 'center left') return { x: 0, y: 50 };
  if (trimmed === 'right' || trimmed === 'right center' || trimmed === 'center right') return { x: 100, y: 50 };

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const parsePart = (p: string, isY: boolean): number => {
      if (p.endsWith('%')) {
        const n = parseFloat(p);
        return Number.isFinite(n) ? clampPercent(n) : 50;
      }
      if (p === 'left' || p === 'top') return 0;
      if (p === 'right' || p === 'bottom') return 100;
      if (p === 'center') return 50;
      const n = parseFloat(p);
      return Number.isFinite(n) ? clampPercent(n) : 50;
    };

    return {
      x: parsePart(parts[0], false),
      y: parsePart(parts[1], true),
    };
  }

  return { x: 50, y: 50 };
}

/**
 * Returns numeric aspect ratio value (width / height) from string or number.
 */
export function getAspectRatioValue(ratio: StandardAspectRatio | string | number): number {
  if (typeof ratio === 'number') return ratio > 0 ? ratio : 16 / 9;
  if (ratio in ASPECT_RATIOS) {
    return ASPECT_RATIOS[ratio as StandardAspectRatio].ratio;
  }
  const match = ratio.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
  if (match) {
    const w = parseFloat(match[1]);
    const h = parseFloat(match[2]);
    if (w > 0 && h > 0) return w / h;
  }
  const parsed = parseFloat(ratio);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 16 / 9;
}

/**
 * Returns CSS `aspect-ratio` string suitable for inline styles or CSS rules.
 * Example: '16:9' -> '16 / 9'
 */
export function getAspectRatioCss(ratio: StandardAspectRatio | string): string {
  if (ratio in ASPECT_RATIOS) {
    return ASPECT_RATIOS[ratio as StandardAspectRatio].css;
  }
  const match = ratio.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
  if (match) {
    return `${match[1]} / ${match[2]}`;
  }
  return ratio;
}

/**
 * Computes comprehensive CSS inline styles for an image with object-fit and focal point positioning.
 */
export function getImageCropStyles(
  point?: Partial<FocalPoint> | null,
  aspectRatio?: StandardAspectRatio | string,
): {
  objectFit: 'cover';
  objectPosition: string;
  aspectRatio?: string;
} {
  const norm = normalizeFocalPoint(point);
  const styles: {
    objectFit: 'cover';
    objectPosition: string;
    aspectRatio?: string;
  } = {
    objectFit: 'cover',
    objectPosition: `${norm.x}% ${norm.y}%`,
  };

  if (aspectRatio) {
    styles.aspectRatio = getAspectRatioCss(aspectRatio);
  }

  return styles;
}

/**
 * Calculates focal point coordinates from a mouse/touch click event relative to an HTML element's bounding rect.
 */
export function calculateFocalPointFromEvent(
  clientX: number,
  clientY: number,
  elementRect: DOMRect,
): FocalPoint {
  if (elementRect.width <= 0 || elementRect.height <= 0) {
    return { x: 50, y: 50 };
  }

  const rawX = ((clientX - elementRect.left) / elementRect.width) * 100;
  const rawY = ((clientY - elementRect.top) / elementRect.height) * 100;

  return {
    x: clampPercent(rawX),
    y: clampPercent(rawY),
  };
}

/**
 * Human-readable label for focal point coordinates.
 */
export function formatFocalPointLabel(point?: Partial<FocalPoint> | null): string {
  const norm = normalizeFocalPoint(point);
  if (norm.x === 50 && norm.y === 50) return 'Tsakiya (50%, 50%)';
  if (norm.x === 50 && norm.y === 0) return 'Sama (50%, 0%)';
  if (norm.x === 50 && norm.y === 100) return 'Kasa (50%, 100%)';
  if (norm.x === 0 && norm.y === 50) return 'Hagu (0%, 50%)';
  if (norm.x === 100 && norm.y === 50) return 'Dama (100%, 50%)';
  return `X: ${norm.x}%, Y: ${norm.y}%`;
}
