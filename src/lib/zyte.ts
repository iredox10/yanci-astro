import { ZYTE_API_KEY } from 'astro:env/server';

export interface ZyteArticle {
  headline?: string;
  articleBody?: string;
  articleBodyHtml?: string;
  mainImage?: { url?: string };
  datePublished?: string;
  authors?: Array<{ name: string }>;
  description?: string;
  canonicalUrl?: string;
}

export interface ZyteExtractResponse {
  url?: string;
  article?: ZyteArticle;
  browserHtml?: string;
  httpResponseBody?: string;
  statusCode?: number;
}

let lastZyteError: string | null = null;

export function getLastZyteError(): string | null {
  return lastZyteError;
}

export function isZyteConfigured(): boolean {
  return Boolean(ZYTE_API_KEY && ZYTE_API_KEY.trim());
}

/**
 * Uses Zyte API to extract clean article content using AI.
 * Handles anti-bot protections (Cloudflare, Akamai, DataDome) and renders JavaScript.
 */
export async function extractArticleWithZyte(url: string): Promise<ZyteArticle | null> {
  if (!isZyteConfigured()) return null;

  const key = ZYTE_API_KEY!.trim();
  const authHeader = 'Basic ' + Buffer.from(`${key}:`).toString('base64');

  try {
    const res = await fetch('https://api.zyte.com/v1/extract', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        url,
        article: true,
        articleOptions: {
          extractFrom: 'browserHtml',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 401) {
        lastZyteError = 'Zyte API key is valid for your account, but the Zyte API service/trial is not activated yet in your Zyte Dashboard (visit https://app.zyte.com to start trial)';
      } else {
        lastZyteError = `Zyte API returned HTTP ${res.status}: ${errText}`;
      }
      console.warn(`[Zyte] Extraction returned HTTP ${res.status}: ${errText}`);
      return null;
    }

    lastZyteError = null;
    const data: ZyteExtractResponse = await res.json();
    return data.article ?? null;
  } catch (err: any) {
    lastZyteError = err?.message ?? String(err);
    console.warn(`[Zyte] Request failed for ${url}:`, lastZyteError);
    return null;
  }
}

/**
 * Fetches rendered browser HTML through Zyte API for sites that block standard requests
 * or require client-side JavaScript execution.
 */
export async function fetchRenderedHtmlWithZyte(url: string): Promise<string | null> {
  if (!isZyteConfigured()) return null;

  const key = ZYTE_API_KEY!.trim();
  const authHeader = 'Basic ' + Buffer.from(`${key}:`).toString('base64');

  try {
    const res = await fetch('https://api.zyte.com/v1/extract', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        url,
        browserHtml: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 401) {
        lastZyteError = 'Zyte API key is valid for your account, but the Zyte API service/trial is not activated yet in your Zyte Dashboard (visit https://app.zyte.com to start trial)';
      } else {
        lastZyteError = `Zyte API returned HTTP ${res.status}: ${errText}`;
      }
      console.warn(`[Zyte] browserHtml returned HTTP ${res.status}: ${errText}`);
      return null;
    }

    lastZyteError = null;
    const data: ZyteExtractResponse = await res.json();
    return data.browserHtml ?? null;
  } catch (err: any) {
    lastZyteError = err?.message ?? String(err);
    console.warn(`[Zyte] browserHtml request failed for ${url}:`, lastZyteError);
    return null;
  }
}
