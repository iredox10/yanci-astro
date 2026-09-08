import { FIRECRAWL_API_URL, FIRECRAWL_API_KEY } from 'astro:env/server';

export interface FirecrawlArticle {
  headline: string;
  trail: string;
  bodyMarkdown: string;
  bodyHtml?: string;
  image?: string;
  author?: string;
  sourceUrl: string;
  publishDate?: string;
  links?: string[];
}

let lastFirecrawlError: string | null = null;

export function getLastFirecrawlError(): string | null {
  return lastFirecrawlError;
}

export function getFirecrawlBaseUrl(): string {
  const url = FIRECRAWL_API_URL?.trim() || 'http://127.0.0.1:3002';
  return url.replace(/\/+$/, '');
}

export function isFirecrawlConfigured(): boolean {
  return Boolean(FIRECRAWL_API_URL || FIRECRAWL_API_KEY);
}

/**
 * Checks whether the self-hosted Firecrawl API container is responsive.
 */
export async function isFirecrawlHealthy(): Promise<boolean> {
  const baseUrl = getFirecrawlBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/v0/health/readiness`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Scrapes a URL using Firecrawl (Self-Hosted or Cloud).
 * Automatically renders JavaScript, bypasses anti-bot/Cloudflare, and returns clean markdown.
 */
export async function scrapeWithFirecrawl(url: string): Promise<FirecrawlArticle | null> {
  const baseUrl = getFirecrawlBaseUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (FIRECRAWL_API_KEY && FIRECRAWL_API_KEY.trim()) {
    headers['Authorization'] = `Bearer ${FIRECRAWL_API_KEY.trim()}`;
  }

  const payload = {
    url,
    formats: ['markdown', 'html'],
    onlyMainContent: true,
  };

  try {
    // Try /v1/scrape first, then fall back to /v2/scrape
    let res = await fetch(`${baseUrl}/v1/scrape`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45_000),
    });

    if (res.status === 404) {
      res = await fetch(`${baseUrl}/v2/scrape`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45_000),
      });
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      lastFirecrawlError = `Firecrawl returned HTTP ${res.status}: ${errText.slice(0, 200)}`;
      console.warn(`[Firecrawl] Scrape failed: ${lastFirecrawlError}`);
      return null;
    }

    const json = await res.json();
    const data = json.data ?? json;
    const meta = data.metadata ?? {};

    const headline =
      meta.title ||
      meta.ogTitle ||
      meta['og:title'] ||
      meta['twitter:title'] ||
      '';

    const trail =
      meta.description ||
      meta.ogDescription ||
      meta['og:description'] ||
      meta['twitter:description'] ||
      (data.markdown ? data.markdown.slice(0, 300) : '');

    const image =
      meta.ogImage ||
      meta['og:image'] ||
      meta['twitter:image'] ||
      undefined;

    const author =
      meta.author ||
      (meta.authors && meta.authors[0]?.name) ||
      meta.sourceURL ||
      undefined;

    lastFirecrawlError = null;

    return {
      headline: String(headline || '').trim(),
      trail: String(trail || '').trim(),
      bodyMarkdown: data.markdown || '',
      bodyHtml: data.html || undefined,
      image: typeof image === 'string' ? image : undefined,
      author: typeof author === 'string' ? author : undefined,
      sourceUrl: url,
      links: Array.isArray(data.links) ? data.links : [],
    };
  } catch (err: any) {
    lastFirecrawlError = err?.message ?? String(err);
    console.warn(`[Firecrawl] Scrape request error for ${url}:`, lastFirecrawlError);
    return null;
  }
}

/**
 * Maps a website domain to find subpage/article links quickly.
 */
export async function mapWithFirecrawl(url: string, limit = 25): Promise<string[]> {
  const baseUrl = getFirecrawlBaseUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (FIRECRAWL_API_KEY && FIRECRAWL_API_KEY.trim()) {
    headers['Authorization'] = `Bearer ${FIRECRAWL_API_KEY.trim()}`;
  }

  try {
    const res = await fetch(`${baseUrl}/v1/map`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, limit }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const links: string[] = json.links || json.data?.links || [];
    return links;
  } catch {
    return [];
  }
}
