import { Client, Databases, ID, Query } from 'node-appwrite';
import {
  APPWRITE_API_KEY,
  APPWRITE_COLLECTION_NEWSLETTER,
} from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
  PUBLIC_APPWRITE_COLLECTION_ARTICLES,
  PUBLIC_APPWRITE_COLLECTION_VIEWS,
} from 'astro:env/client';
import type { Article, LiveUpdate } from '../data/schema';

/**
 * Server-only Appwrite access. The secret `APPWRITE_API_KEY` stays on the
 * server and is never bundled to the browser.
 */

let _databases: Databases | null = null;

export function isAppwriteConfigured(): boolean {
  return Boolean(
    APPWRITE_API_KEY &&
      PUBLIC_APPWRITE_PROJECT_ID &&
      PUBLIC_APPWRITE_DATABASE_ID &&
      PUBLIC_APPWRITE_COLLECTION_ARTICLES,
  );
}

function databases(): Databases {
  if (!_databases) {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY ?? '');
    _databases = new Databases(client);
  }
  return _databases;
}

type Collections = {
  databaseId: string;
  articles: string;
  views: string | null;
  newsletter: string | null;
};

function collections(): Collections | null {
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID ||
    !PUBLIC_APPWRITE_COLLECTION_ARTICLES
  ) {
    return null;
  }
  return {
    databaseId: PUBLIC_APPWRITE_DATABASE_ID,
    articles: PUBLIC_APPWRITE_COLLECTION_ARTICLES,
    views: PUBLIC_APPWRITE_COLLECTION_VIEWS ?? null,
    newsletter: APPWRITE_COLLECTION_NEWSLETTER ?? null,
  };
}

function parseLiveUpdates(raw: unknown): LiveUpdate[] | undefined {
  if (Array.isArray(raw)) return raw as LiveUpdate[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as LiveUpdate[]) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Map an Appwrite document to the shared Article type. */
export function toArticle(doc: Record<string, unknown>): Article {
  return {
    $id: doc.$id as string,
    ...doc,
    liveUpdates: parseLiveUpdates(doc.liveUpdates),
  } as unknown as Article;
}

// ─── Read actions ────────────────────────────────────────────────────────────
export async function getArticles(limit = 200): Promise<Article[]> {
  const c = collections();
  if (!c) return [];
  try {
    const { documents } = await databases().listDocuments(c.databaseId, c.articles, [
      Query.orderDesc('$createdAt'),
      Query.limit(Math.min(limit, 100)),
    ]);
    return (documents ?? []).map((doc) => toArticle(doc as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('[appwrite] getArticles failed', error);
    return [];
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  const c = collections();
  if (!c) return null;
  try {
    const doc = await databases().getDocument(c.databaseId, c.articles, id);
    return toArticle(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const c = collections();
  if (!c) return null;
  try {
    const { documents } = await databases().listDocuments(c.databaseId, c.articles, [
      Query.equal('slug', slug),
      Query.limit(1),
    ]);
    return documents?.[0]
      ? toArticle(documents[0] as unknown as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// ─── Views / analytics ───────────────────────────────────────────────────────
export async function trackView(input: {
  articleId: string;
  section?: string | null;
  referrer?: string | null;
  device?: string | null;
}): Promise<void> {
  const c = collections();
  if (!c || !c.views) return;
  try {
    await databases().createDocument(c.databaseId, c.views, ID.unique(), {
      article_id: input.articleId,
      section: input.section ?? null,
      referrer: input.referrer ?? null,
      device: input.device ?? null,
      viewed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[appwrite] trackView failed', error);
  }
}

export async function getMostRead(limit = 10): Promise<{ articleId: string; views: number }[]> {
  const c = collections();
  if (!c || !c.views) return [];
  try {
    const { documents } = await databases().listDocuments(c.databaseId, c.views, [
      Query.limit(1000),
    ]);
    const counts = new Map<string, number>();
    for (const doc of documents ?? []) {
      const id = (doc as any).article_id;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([articleId, views]) => ({ articleId, views }));
  } catch {
    return [];
  }
}

export function viewCountFor(articleId: string, most: Awaited<ReturnType<typeof getMostRead>>): number {
  return most.find((m) => m.articleId === articleId)?.views ?? 0;
}

// ─── Newsletter subscriptions ────────────────────────────────────────────────
export async function subscribeNewsletter(email: string): Promise<boolean> {
  const c = collections();
  if (!c || !c.newsletter) return false;
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false;
  try {
    await databases().createDocument(c.databaseId, c.newsletter, ID.unique(), {
      email: normalized,
      subscribed_at: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('[appwrite] subscribeNewsletter failed', error);
    return false;
  }
}