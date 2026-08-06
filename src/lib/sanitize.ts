import sanitizeHtml from 'sanitize-html';

/**
 * Server-side HTML sanitization. Never trust the client: rich-text toolbars can
 * emit event handlers, javascript: URLs, or style smuggling. All content that
 * will be rendered with `set:html` must pass through here on the way in.
 */

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'figure',
  'figcaption', 'img', 'hr', 'strong', 'em', 'b', 'i', 'u', 's', 'span',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'hr', 'sup', 'sub', 'code',
];

export function sanitizeRichText(input: string | undefined | null): string {
  const options: sanitizeHtml.IOptions = {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'name'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      span: ['class', 'style'],
      '*': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowedStyles: {
      color: [/^#(?:0x)?[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i],
      'text-align': [/^left$/, /^right$/, /^center$/],
    } as unknown as sanitizeHtml.IOptions['allowedStyles'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: 'lazy', decoding: 'async' },
      }),
    },
    // Drop references that would smuggle user-generated state into the page.
    exclusiveFilter: (frame: sanitizeHtml.IFrame) =>
      frame.tag === 'img' && !/^https?:\/\//i.test(frame.attribs.src ?? ''),
  };
  return sanitizeHtml(input ?? '', options).trim();
}

export function sanitizePlainText(input: string | undefined | null, max = 500): string {
  const clean = sanitizeHtml(input ?? '', { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
  return clean.slice(0, max);
}

export function sanitizeImageUrl(input: string | undefined | null): string | null {
  const url = (input ?? '').trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export const IMAGE_MIME_ALLOWLIST = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);