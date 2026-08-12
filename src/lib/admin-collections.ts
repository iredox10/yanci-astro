import { Client, Databases, ID, Query } from 'node-appwrite';
import {
  APPWRITE_API_KEY,
  APPWRITE_COLLECTION_AUTOFETCH_SOURCES,
  APPWRITE_COLLECTION_INVITATIONS,
  APPWRITE_COLLECTION_NEWSLETTER,
  APPWRITE_COLLECTION_ROLES,
} from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
  PUBLIC_APPWRITE_COLLECTION_HIGHLIGHTS,
  PUBLIC_APPWRITE_COLLECTION_HOMEPAGE_STATS,
  PUBLIC_APPWRITE_COLLECTION_SPORTS,
  PUBLIC_APPWRITE_COLLECTION_SETTINGS,
  PUBLIC_APPWRITE_COLLECTION_ELECTIONS,
  PUBLIC_APPWRITE_COLLECTION_CANDIDATES,
  PUBLIC_APPWRITE_COLLECTION_RESULTS,
  PUBLIC_APPWRITE_COLLECTION_FACTCHECKS,
  PUBLIC_APPWRITE_COLLECTION_VIEWS,
  PUBLIC_APPWRITE_COLLECTION_STAFF,
} from 'astro:env/client';

/**
 * Generic server-side CRUD for the homepage/content collections. All writes
 * go through the API key; documents are created with public read only.
 */

export const READ_ANY = 'read("any")';

export type CollectionKey =
  | 'highlights'
  | 'stats'
  | 'sports'
  | 'settings'
  | 'elections'
  | 'candidates'
  | 'results'
  | 'factchecks'
  | 'views'
  | 'autofetch'
  | 'invitations'
  | 'newsletter'
  | 'roles'
  | 'staff';

function collectionIdFor(key: CollectionKey): string | null {
  const pick = (v: string | undefined | null): string | null => v ?? null;
  switch (key) {
    case 'highlights': return pick(PUBLIC_APPWRITE_COLLECTION_HIGHLIGHTS);
    case 'stats': return pick(PUBLIC_APPWRITE_COLLECTION_HOMEPAGE_STATS);
    case 'sports': return pick(PUBLIC_APPWRITE_COLLECTION_SPORTS);
    case 'settings': return pick(PUBLIC_APPWRITE_COLLECTION_SETTINGS);
    case 'elections': return pick(PUBLIC_APPWRITE_COLLECTION_ELECTIONS);
    case 'candidates': return pick(PUBLIC_APPWRITE_COLLECTION_CANDIDATES);
    case 'results': return pick(PUBLIC_APPWRITE_COLLECTION_RESULTS);
    case 'factchecks': return pick(PUBLIC_APPWRITE_COLLECTION_FACTCHECKS);
    case 'views': return pick(PUBLIC_APPWRITE_COLLECTION_VIEWS);
    case 'autofetch': return pick(APPWRITE_COLLECTION_AUTOFETCH_SOURCES);
    case 'invitations': return pick(APPWRITE_COLLECTION_INVITATIONS);
    case 'newsletter': return pick(APPWRITE_COLLECTION_NEWSLETTER);
    case 'roles': return pick(APPWRITE_COLLECTION_ROLES);
    case 'staff': return pick(PUBLIC_APPWRITE_COLLECTION_STAFF);
  }
}

function writable() {
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_ENDPOINT ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID
  ) {
    return null;
  }
  const client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return { client, databaseId: PUBLIC_APPWRITE_DATABASE_ID };
}

export async function adminListCollection<T = Record<string, unknown>>(
  key: CollectionKey,
  limit = 500,
): Promise<T[]> {
  const env = writable();
  const collectionId = collectionIdFor(key);
  if (!env || !collectionId) return [];
  try {
    const res = await new Databases(env.client).listDocuments({
      databaseId: env.databaseId,
      collectionId,
      queries: [Query.limit(limit)],
    });
    return res.documents as unknown as T[];
  } catch (error) {
    console.error(`[admin-collections] list ${key} failed`, error);
    return [];
  }
}

export async function adminCreateCollectionDoc(
  key: CollectionKey,
  data: Record<string, unknown>,
): Promise<string | null> {
  const env = writable();
  const collectionId = collectionIdFor(key);
  if (!env || !collectionId) return null;
  try {
    const doc = await new Databases(env.client).createDocument({
      databaseId: env.databaseId,
      collectionId,
      documentId: ID.unique(),
      data,
      permissions: [READ_ANY],
    });
    return doc.$id;
  } catch (error) {
    console.error(`[admin-collections] create ${key} failed`, error);
    return null;
  }
}

export async function adminUpdateCollectionDoc(
  key: CollectionKey,
  id: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const env = writable();
  const collectionId = collectionIdFor(key);
  if (!env || !collectionId) return false;
  try {
    await new Databases(env.client).updateDocument({
      databaseId: env.databaseId,
      collectionId,
      documentId: id,
      data,
    });
    return true;
  } catch (error) {
    console.error(`[admin-collections] update ${key} failed`, error);
    return false;
  }
}

export async function adminDeleteCollectionDoc(
  key: CollectionKey,
  id: string,
): Promise<boolean> {
  const env = writable();
  const collectionId = collectionIdFor(key);
  if (!env || !collectionId) return false;
  try {
    await new Databases(env.client).deleteDocument(env.databaseId, collectionId, id);
    return true;
  } catch (error) {
    console.error(`[admin-collections] delete ${key} failed`, error);
    return false;
  }
}
