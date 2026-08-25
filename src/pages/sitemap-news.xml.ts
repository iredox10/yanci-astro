import type { APIRoute } from 'astro';
import { loadArticles } from '../lib/content';
import { escapeXml, publishedOnly } from '../lib/rss';

export const prerender = false;

const MAX_ENTRIES = 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

function siteUrl(): string {
  const raw = import.meta.env.PUBLIC_SITE_URL;
  const base =
    typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : 'https://yanci.ng';
  return base.replace(/\/+$/, '');
}

function newsEntries(articles: Awaited<ReturnType<typeof loadArticles>>): string[] {
  const base = siteUrl();
  const cutoff = Date.now() - FORTY_EIGHT_HOURS_MS;
  return publishedOnly(articles)
    .filter((a) => !a.isLive)
    .map((a) => ({
      id: String(a.id ?? a.$id ?? ''),
      title: typeof a.headline === 'string' ? a.headline : '',
      at: new Date(a.publishAt ?? a.$createdAt ?? ''),
    }))
    .filter(
      (r) =>
        r.id.length > 0 &&
        r.title.trim().length > 0 &&
        !Number.isNaN(r.at.getTime()) &&
        r.at.getTime() >= cutoff,
    )
    .sort((x, y) => y.at.getTime() - x.at.getTime())
    .slice(0, MAX_ENTRIES)
    .map((r) =>
      [
        '<url>',
        `<loc>${base}/article/${r.id}</loc>`,
        '<news:news>',
        '<news:publication>',
        '<news:name>Yanci</news:name>',
        '<news:language>ha</news:language>',
        '</news:publication>',
        `<news:publication_date>${r.at.toISOString()}</news:publication_date>`,
        `<news:title>${escapeXml(r.title)}</news:title>`,
        '</news:news>',
        '</url>',
      ].join(''),
    );
}

export const GET: APIRoute = async () => {
  let entries: string[] = [];
  try {
    entries = newsEntries(await loadArticles());
  } catch {
    entries = [];
  }
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n');
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
