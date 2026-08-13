import type { APIRoute } from 'astro';
import { SECTIONS, sectionKeyForSlug } from '../../data/sections';
import { loadSectionFeed } from '../../lib/content';
import { buildFeed } from '../../lib/rss';

export const prerender = false;

export function getStaticPaths() {
  return SECTIONS.map((s) => ({ params: { section: s.slug } }));
}

export const GET: APIRoute = async ({ params }) => {
  const section = params.section;
  if (!section) return new Response('Missing section', { status: 404 });
  const def = SECTIONS.find((s) => s.slug === section);
  if (!def) return new Response('Unknown section', { status: 404 });

  const sectionKey = sectionKeyForSlug(section) ?? section;
  const articles = await loadSectionFeed(sectionKey);
  const xml = buildFeed({
    title: `Yanci — ${def.label}`,
    description: def.blurb,
    link: `https://yanci.ng/${section}/`,
    self: `https://yanci.ng/rss/${section}.xml`,
    articles,
  });
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};