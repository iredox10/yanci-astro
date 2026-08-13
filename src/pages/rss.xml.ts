import type { APIRoute } from 'astro';
import { loadArticles } from '../lib/content';
import { getSettings } from '../lib/appwrite-server';
import { buildFeed } from '../lib/rss';

export const prerender = false;

export const GET: APIRoute = async () => {
  const [articles, settings] = await Promise.all([loadArticles(), getSettings()]);
  const siteName = settings.site_name || 'Yanci';
  const tagline = settings.tagline || 'Jaridar Hausa mai zuwa';
  const xml = buildFeed({
    title: siteName,
    description: `${siteName} — ${tagline}`,
    link: 'https://yanci.ng/',
    self: 'https://yanci.ng/rss.xml',
    articles,
  });
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};