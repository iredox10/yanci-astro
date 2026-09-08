import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { assertSafeFetchUrl } from './ssrf';
import { sanitizePlainText, sanitizeRichText, sanitizeImageUrl } from './sanitize';
import { extractArticleWithZyte, fetchRenderedHtmlWithZyte, isZyteConfigured, getLastZyteError } from './zyte';
import {
  scrapeWithFirecrawl,
  mapWithFirecrawl,
  isFirecrawlConfigured,
  getLastFirecrawlError,
} from './firecrawl';

function markdownToHtml(md: string): string {
  if (!md) return '<p></p>';
  return md
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith('#') && !block.startsWith('!['))
    .map((block) => `<p>${block.replace(/\n/g, ' ')}</p>`)
    .join('\n');
}

/**
 * Autofetch sync sidecar. Pulls from configured `autofetch_sources` entries and
 * turns them into DRAFT articles for editor approval. Every outbound URL goes
 * through the SSRF guard; fetched text is sanitized before it can be stored.
 * If Firecrawl or Zyte is configured, it bypasses Cloudflare, anti-bot protections, and executes JavaScript.
 */

export interface AutofetchSource {
  $id?: string;
  name: string;
  url?: string;
  type?: string; // 'rss' | 'article' | 'homepage' | 'scrape' | 'agent'
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
const TIMEOUT_MS = 15_000;

async function safeFetch(raw: string): Promise<string> {
  const check = await assertSafeFetchUrl(raw);
  if (!check.ok) throw new Error(`SSRF guard: ${check.reason}`);

  try {
    const res = await fetch(check.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        accept: 'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      // If blocked by Cloudflare or anti-bot (403, 429, 503), retry through Firecrawl or Zyte
      if (res.status === 403 || res.status === 429 || res.status === 503) {
        if (isFirecrawlConfigured()) {
          const fc = await scrapeWithFirecrawl(raw);
          if (fc && (fc.bodyHtml || fc.bodyMarkdown)) {
            return fc.bodyHtml || `<html><body><h1>${fc.headline}</h1><div>${markdownToHtml(fc.bodyMarkdown)}</div></body></html>`;
          }
          const fcErr = getLastFirecrawlError();
          if (fcErr) console.warn(`[Autofetch] Firecrawl fallback: ${fcErr}`);
        }

        if (isZyteConfigured()) {
          const zyteHtml = await fetchRenderedHtmlWithZyte(raw);
          if (zyteHtml) return zyteHtml;
          const zyteErr = getLastZyteError();
          if (zyteErr) throw new Error(`HTTP ${res.status} (Site anti-bot block; Zyte error: ${zyteErr})`);
        }
      }
      throw new Error(`HTTP ${res.status}`);
    }

    return res.text();
  } catch (err: any) {
    if (isFirecrawlConfigured() && !String(err?.message || '').includes('Firecrawl error')) {
      const fc = await scrapeWithFirecrawl(raw);
      if (fc && (fc.bodyHtml || fc.bodyMarkdown)) {
        return fc.bodyHtml || `<html><body><h1>${fc.headline}</h1><div>${markdownToHtml(fc.bodyMarkdown)}</div></body></html>`;
      }
    }
    if (isZyteConfigured() && !String(err?.message || '').includes('Zyte error')) {
      const zyteHtml = await fetchRenderedHtmlWithZyte(raw);
      if (zyteHtml) return zyteHtml;
      const zyteErr = getLastZyteError();
      if (zyteErr) throw new Error(`${err?.message ?? err} (Zyte error: ${zyteErr})`);
    }
    throw err;
  }
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

  // 1. If Firecrawl is configured, extract clean markdown and lead metadata
  if (isFirecrawlConfigured()) {
    try {
      const fc = await scrapeWithFirecrawl(url);
      if (fc && fc.headline && (fc.bodyMarkdown || fc.bodyHtml)) {
        return toDraft({
          headline: fc.headline,
          trail: fc.trail || fc.bodyMarkdown.slice(0, 400),
          body: fc.bodyHtml || markdownToHtml(fc.bodyMarkdown),
          image: fc.image,
          source: fc.author ? { ...source, name: fc.author } : source,
        });
      }
    } catch (err) {
      console.warn(`[Autofetch] Firecrawl article extraction failed for ${url}, falling back:`, err);
    }
  }

  // 2. If Zyte is configured, attempt AI article extraction with anti-bot bypass
  if (isZyteConfigured()) {
    try {
      const zyte = await extractArticleWithZyte(url);
      if (zyte && zyte.headline && zyte.articleBody) {
        return toDraft({
          headline: zyte.headline,
          trail: zyte.description || zyte.articleBody.slice(0, 400),
          body: zyte.articleBodyHtml || zyte.articleBody,
          image: zyte.mainImage?.url,
          source,
        });
      }
    } catch (err) {
      console.warn(`[Autofetch] Zyte article extraction failed for ${url}, falling back:`, err);
    }
  }

  // 3. Fallback to safeFetch + Cheerio DOM parsing
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
  const paragraphs = $('main p, .content p, article p, .post-content p, .article__body p, .entry-content p')
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

// ─── Scrape or Homepage crawl → extract candidate story links ─────────────────
async function fromScrapeSite(source: AutofetchSource, maxStories = 4): Promise<DraftArticle[]> {
  const url = source.url!;

  // 1. If Firecrawl is configured, map site to discover clean article URLs
  if (isFirecrawlConfigured()) {
    try {
      const links = await mapWithFirecrawl(url, 30);
      const articleLinks = links.filter((link) => {
        try {
          const u = new URL(link);
          const base = new URL(url);
          return (
            u.origin === base.origin &&
            !link.includes('/tag/') &&
            !link.includes('/category/') &&
            !link.includes('/author/') &&
            !link.includes('/page/') &&
            !link.includes('/privacy') &&
            !link.includes('/terms') &&
            link !== url &&
            link.length > url.length + 5
          );
        } catch {
          return false;
        }
      });

      if (articleLinks.length > 0) {
        const drafts: DraftArticle[] = [];
        for (const storyUrl of articleLinks.slice(0, maxStories)) {
          try {
            const draft = await fromArticlePage({ ...source, url: storyUrl });
            if (draft && draft.headline && draft.body.length > 100) {
              drafts.push(draft);
            }
          } catch {}
        }
        if (drafts.length > 0) return drafts;
      }
    } catch (err) {
      console.warn(`[Autofetch] Firecrawl map failed for ${url}, falling back to DOM crawl:`, err);
    }
  }

  // 2. Fallback to safeFetch + Cheerio DOM parsing
  const page = await safeFetch(url);
  const $ = cheerio.load(page);

  const foundLinks: string[] = [];
  $('a[href]').each((_, el) => {
    if (foundLinks.length >= maxStories * 2) return;
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (!href || text.split(/\s+/).length < 3) return;

    try {
      const abs = new URL(href, url);
      // Skip social links, anchors, and external domains
      if (
        abs.origin === new URL(url).origin &&
        /^https?:\/\//i.test(abs.href) &&
        !abs.pathname.includes('/tag/') &&
        !abs.pathname.includes('/category/') &&
        !abs.pathname.includes('/author/') &&
        !foundLinks.includes(abs.href)
      ) {
        foundLinks.push(abs.href);
      }
    } catch {}
  });

  const drafts: DraftArticle[] = [];
  for (const storyUrl of foundLinks.slice(0, maxStories)) {
    try {
      const draft = await fromArticlePage({ ...source, url: storyUrl });
      if (draft && draft.headline && draft.body.length > 100) {
        drafts.push(draft);
      }
    } catch {}
  }

  if (drafts.length === 0) {
    // If no individual stories parsed, extract what's on the page
    drafts.push(extractFromDom(url, source, $));
  }

  return drafts;
}

// ─── Homepage crawl → first credible story link ──────────────────────────────
async function fromHomepage(source: AutofetchSource): Promise<DraftArticle | null> {
  const stories = await fromScrapeSite(source, 1);
  return stories[0] ?? null;
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
      case 'scrape':
      case 'agent':
        return { source: source.name, ok: true, drafts: await fromScrapeSite(source, 3) };
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