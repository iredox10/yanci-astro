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

export async function adminCreateArticle(data: Record<string, unknown>): Promise<string | null> {
  const env = writable();
  if (!env) return null;
  try {
    const doc = await new Databases(env.client).createDocument({
      databaseId: env.databaseId,
      collectionId: env.collection,
      documentId: ID.unique(),
      data,
      permissions: [READ_ANY],
    });
    return doc.$id;
  } catch (error) {
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
    await new Databases(env.client).updateDocument({
      databaseId: env.databaseId,
      collectionId: env.collection,
      documentId: id,
      data,
    });
    return true;
  } catch (error) {
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