import type { Article } from '../data/schema';

const SITE = 'https://yanci.ng';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Only published articles belong in a feed. */
export function publishedOnly(articles: Article[]): Article[] {
  return articles.filter((a) => !a.status || a.status === 'published');
}

/** RFC-822 timestamp for RSS <pubDate>, falling back to "now" on bad input. */
export function rfc822(date?: string): string {
  const d = date ? new Date(date) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

export function buildFeed(opts: {
  title: string;
  description: string;
  link: string;
  self: string;
  articles: Article[];
  maxItems?: number;
}): string {
  const { title, description, link, self, articles, maxItems = 50 } = opts;

  const items = publishedOnly(articles)
    .filter((a) => typeof a.headline === 'string' && a.headline.trim().length > 0)
    .slice(0, maxItems)
    .map((a) => {
      const id = String(a.id ?? a.$id ?? '');
      const url = `${SITE}/article/${id}`;
      const desc =
        stripHtml(a.trail ?? a.kicker ?? '') ||
        stripHtml(String(a.body ?? '')).slice(0, 500);
      return [
        '<item>',
        `<title>${escapeXml(a.headline)}</title>`,
        `<link>${url}</link>`,
        `<guid isPermaLink="true">${url}</guid>`,
        `<pubDate>${rfc822(a.publishAt ?? a.$createdAt)}</pubDate>`,
        desc ? `<description>${escapeXml(desc)}</description>` : '',
        a.author ? `<author>${escapeXml(a.author)}</author>` : '',
        a.section ? `<category>${escapeXml(a.section)}</category>` : '',
        '</item>',
      ]
        .filter(Boolean)
        .join('');
    })
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${escapeXml(title)}</title>`,
    `<link>${link}</link>`,
    `<description>${escapeXml(description)}</description>`,
    '<language>ha</language>',
    `<atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
    items,
    '</channel>',
    '</rss>',
  ].join('\n');
}
