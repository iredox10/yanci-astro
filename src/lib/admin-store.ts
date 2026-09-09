import { Client, Databases, ID, Query } from 'node-appwrite';
import {
  APPWRITE_API_KEY,
  APPWRITE_COLLECTION_REVISIONS,
} from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
  PUBLIC_APPWRITE_COLLECTION_ARTICLES,
} from 'astro:env/client';

/**
 * Server-side write access for the admin API. Only calls running on the server
 * (with the API key) reach these; documents are created with public read but
 * never public write, so the browser can't mutate articles directly.
 */

function writable(): {
  databaseId: string;
  collection: string;
  revisions: string | null;
  client: Client;
} | null {
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_ENDPOINT ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID ||
    !PUBLIC_APPWRITE_COLLECTION_ARTICLES
  ) {
    return null;
  }
  const client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return {
    client,
    collection: PUBLIC_APPWRITE_COLLECTION_ARTICLES,
    databaseId: PUBLIC_APPWRITE_DATABASE_ID,
    revisions: APPWRITE_COLLECTION_REVISIONS ?? null,
  };
}

export const READ_ANY = 'read("any")';

/** True when a document already carries this headline (dedupe). */
export async function articleExistsByHeadline(headline: string): Promise<boolean> {
  const env = writable();
  if (!env) return false;
  if (!headline) return false;
  try {
    const { total } = await new Databases(env.client).listDocuments({
      databaseId: env.databaseId,
      collectionId: env.collection,
      queries: [Query.equal('headline', headline), Query.limit(1)],
    });
    return total > 0;
  } catch (error) {
    console.error('[admin-store] articleExistsByHeadline failed', error);
    return true; // fail closed: don't create duplicates when unknown
  }
}

const ALLOWED_ARTICLE_KEYS = new Set([
  'headline',
  'kicker',
  'trail',
  'body',
  'image',
  'videoUrl',
  'keyFigures',
  'pillar',
  'section',
  'type',
  'author',
  'isLive',
  'liveUpdates',
  'status',
  'series',
  'slug',
  'metaDescription',
  'publishAt',
  'metaTitle',
  'isSensitive',
  'imageFocalY',
  'format',
  'imageFocalX',
  'is_breaking',
  'breaking_until',
]);

let _lastAdminStoreError: string | null = null;
export function getLastAdminStoreError(): string | null {
  return _lastAdminStoreError;
}

function prepareArticlePayload(data: Record<string, unknown>, isCreate = true): Record<string, unknown> {
  let keyFiguresObj: Record<string, unknown> = {};
  if (typeof data.keyFigures === 'string' && data.keyFigures) {
    try {
      keyFiguresObj = JSON.parse(data.keyFigures);
    } catch {}
  }

  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    if (ALLOWED_ARTICLE_KEYS.has(key)) {
      payload[key] = value;
    } else {
      // Attributes not explicitly defined in Appwrite's schema are preserved in keyFigures JSON
      keyFiguresObj[key] = value;
    }
  }

  if (isCreate) {
    if (!payload.type || !['hero', 'standard', 'compact'].includes(String(payload.type))) {
      payload.type = 'standard';
    }
    if (!payload.pillar) {
      payload.pillar = 'news';
    }
    if (!payload.section) {
      payload.section = 'labarai';
    }
    if (typeof payload.isLive !== 'boolean') {
      payload.isLive = false;
    }
    if (!payload.status) {
      payload.status = 'draft';
    }
  }

  if (Object.keys(keyFiguresObj).length > 0) {
    payload.keyFigures = JSON.stringify(keyFiguresObj);
  }

  return payload;
}

export async function adminCreateArticle(data: Record<string, unknown>): Promise<string | null> {
  const env = writable();
  if (!env) return null;
  try {
    const cleanPayload = prepareArticlePayload(data, true);

    const doc = await new Databases(env.client).createDocument({
      databaseId: env.databaseId,
      collectionId: env.collection,
      documentId: ID.unique(),
      data: cleanPayload,
      permissions: [READ_ANY],
    });
    _lastAdminStoreError = null;
    return doc.$id;
  } catch (error: any) {
    _lastAdminStoreError = error?.message || String(error);
    console.error('[admin-store] createArticle failed', error);
    return null;
  }
}

export async function adminUpdateArticle(
  id: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const env = writable();
  if (!env) return false;
  try {
    const cleanPayload = prepareArticlePayload(data, false);
    await new Databases(env.client).updateDocument({
      databaseId: env.databaseId,
      collectionId: env.collection,
      documentId: id,
      data: cleanPayload,
    });
    _lastAdminStoreError = null;
    return true;
  } catch (error: any) {
    _lastAdminStoreError = error?.message || String(error);
    console.error('[admin-store] updateArticle failed', error);
    return false;
  }
}

export async function adminDeleteArticle(id: string): Promise<boolean> {
  const env = writable();
  if (!env) return false;
  try {
    await new Databases(env.client).deleteDocument(env.databaseId, env.collection, id);
    return true;
  } catch (error) {
    console.error('[admin-store] deleteArticle failed', error);
    return false;
  }
}

/** Drafts created by the autofetch pipeline (author marker), newest first. */
export async function getAutofetchDrafts(limit = 20): Promise<Record<string, unknown>[]> {
  const env = writable();
  if (!env) return [];
  try {
    const { documents } = await new Databases(env.client).listDocuments(
      env.databaseId,
      env.collection,
      [
        Query.equal('author', 'AI Fetcher'),
        Query.equal('status', 'draft'),
        Query.orderDesc('$createdAt'),
        Query.limit(Math.min(limit, 50)),
      ],
    );
    return documents ?? [];
  } catch (error) {
    console.error('[admin-store] getAutofetchDrafts failed', error);
    return [];
  }
}

export async function createRevision(articleId: string, previous: unknown, editorName: string): Promise<void> {
  const env = writable();
  if (!env || !env.revisions) return;
  try {
    await new Databases(env.client).createDocument({
      databaseId: env.databaseId,
      collectionId: env.revisions,
      documentId: ID.unique(),
      data: {
        article_id: articleId,
        previous_json: typeof previous === 'string' ? previous : JSON.stringify(previous),
        edited_by: editorName,
        edited_at: new Date().toISOString(),
      },
      permissions: [READ_ANY],
    });
  } catch (error) {
    console.error('[admin-store] createRevision failed', error);
  }
}