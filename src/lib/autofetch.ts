import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { assertSafeFetchUrl } from './ssrf';
import { sanitizePlainText, sanitizeRichText, sanitizeImageUrl } from './sanitize';

/**
 * Autofetch sync sidecar. Pulls from configured `autofetch_sources` entries and
 * turns them into DRAFT articles for editor approval. Every outbound URL goes
 * through the SSRF guard; fetched text is sanitized before it can be stored.
 */

export interface AutofetchSource {
  $id?: string;
  name: string;
  url?: string;
  type?: string; // 'rss' | 'article' | 'homepage'
  isActive?: boolean;
  lastRun?: string;
}

export interface DraftArticle {
  headline: string;
  trail?: string;
  body: string;
  image?: string;
  author: string;
  status: 'draft';
  section: string;
  pillar: string;
  source_url: string;
}

export interface FetchResult {
  source?: string;
  ok: boolean;
  drafts: DraftArticle[];
  error?: string;
}

const parser = new Parser();
const TIMEOUT_MS = 12_000;

async function safeFetch(raw: string): Promise<string> {
  const check = await assertSafeFetchUrl(raw);
  if (!check.ok) throw new Error(`SSRF guard: ${check.reason}`);
  const res = await fetch(check.url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'user-agent': 'YanciAutofetch/1.0',
      accept: 'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function toDraft(fields: {
  headline: string;
  trail: string;
  body: string;
  image?: string;
  source: AutofetchSource;
}): DraftArticle {
  return {
    headline: sanitizePlainText(fields.headline, 200),
    trail: sanitizePlainText(fields.trail, 500),
    body: sanitizeRichText(fields.body),
    image: sanitizeImageUrl(fields.image) ?? undefined,
    author: fields.source.name || 'Autofetch',
    status: 'draft',
    section: 'labarai',
    pillar: 'news',
    source_url: fields.source.url ?? '',
  };
}

// ─── RSS feed ────────────────────────────────────────────────────────────────
async function fromRss(source: AutofetchSource): Promise<DraftArticle[]> {
  const xml = await safeFetch(source.url!);
  const parsed = await parser.parseString(xml);
  const drafts: DraftArticle[] = [];
  for (const item of (parsed.items ?? []).slice(0, 5)) {
    const body = [item.summary, item.content].filter(Boolean).join(' ');
    const $ = cheerio.load(body || '<p></p>');
    const text = $('body').text().trim();
    drafts.push(
      toDraft({
        headline: item.title ?? source.name,
        trail: text.slice(0, 400),
        body: text,
        source,
      }),
    );
  }
  return drafts;
}

// ─── Single article page ─────────────────────────────────────────────────────
async function fromArticlePage(source: AutofetchSource): Promise<DraftArticle> {
  const url = source.url!;
  const page = await safeFetch(url);
  const $ = cheerio.load(page);
  return extractFromDom(url, source, $);
}

function extractFromDom(url: string, source: AutofetchSource, $: cheerio.CheerioAPI): DraftArticle {
  const headline =
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().trim();
  const image =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    '';
  const paragraphs = $('main p, .content p, article p, .post-content p')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 40)
    .slice(0, 40);
  return toDraft({
    headline: String(headline || source.name),
    trail: paragraphs[0] ?? '',
    body: paragraphs.map((t) => `<p>${t}</p>`).join(''),
    image: String(image),
    source,
  });
}

// ─── Homepage crawl → first credible story link ──────────────────────────────
async function fromHomepage(source: AutofetchSource): Promise<DraftArticle | null> {
  const url = source.url!;
  const page = await safeFetch(url);
  const $ = cheerio.load(page);

  let target = '';
  $('a[href]').each((_, el) => {
    if (target) return;
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (!href || text.split(/\s+/).length < 3) return;
    try {
      const abs = new URL(href, url);
      if (abs.origin === new URL(url).origin && /^https?:\/\//i.test(abs.href)) target = abs.href;
    } catch {
      /* skip malformed */
    }
  });

  if (target) {
    const storyPage = await safeFetch(target);
    const story = cheerio.load(storyPage);
    return extractFromDom(target, { ...source, url: target }, story);
  }
  return extractFromDom(url, source, $);
}
export async function runSource(source: AutofetchSource): Promise<FetchResult> {
  try {
    if (!source.url) return { source: source.name, ok: false, drafts: [], error: 'No URL' };

    switch (source.type) {
      case 'rss':
        return { source: source.name, ok: true, drafts: await fromRss(source) };
      case 'article':
        return { source: source.name, ok: true, drafts: [await fromArticlePage(source)] };
      case 'homepage': {
        const draft = await fromHomepage(source);
        return { source: source.name, ok: true, drafts: draft ? [draft] : [] };
      }
      default:
        return {
          source: source.name,
          ok: false,
          drafts: [],
          error: `Unsupported type "${source.type}"`,
        };
    }
  } catch (error) {
    return {
      source: source.name,
      ok: false,
      drafts: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}