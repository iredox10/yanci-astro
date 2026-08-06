import { Client, Databases, Query } from 'node-appwrite';
import { APPWRITE_API_KEY, APPWRITE_COLLECTION_AUTOFETCH_SOURCES } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';
import type { AutofetchSource } from './autofetch';

/**
 * Reads the `autofetch_sources` collection (server-only) that powers the sync
 * sidecar. Sources are never readable by anonymous clients.
 */

function env(): {
  databaseId: string;
  sources: string;
  client: Client;
} | null {
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_ENDPOINT ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID ||
    !APPWRITE_COLLECTION_AUTOFETCH_SOURCES
  ) {
    return null;
  }
  return {
    client: new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY),
    databaseId: PUBLIC_APPWRITE_DATABASE_ID,
    sources: APPWRITE_COLLECTION_AUTOFETCH_SOURCES,
  };
}

export async function listAutofetchSources(activeOnly = true): Promise<AutofetchSource[]> {
  const e = env();
  if (!e) return [];
  try {
    const queries = activeOnly ? [Query.equal('isActive', true)] : [];
    const { documents } = await new Databases(e.client).listDocuments({
      databaseId: e.databaseId,
      collectionId: e.sources,
      queries,
    });
    return (documents ?? []).map((doc) => ({
      $id: doc.$id,
      name: String(doc.name ?? ''),
      url: String(doc.url ?? ''),
      type: String(doc.type ?? 'article'),
      isActive: Boolean(doc.isActive),
      lastRun: (doc as any).lastRun,
    }));
  } catch {
    return [];
  }
}

export async function touchSourceLastRun(id: string, at = new Date().toISOString()): Promise<void> {
  const e = env();
  if (!e) return;
  try {
    await new Databases(e.client).updateDocument({
      databaseId: e.databaseId,
      collectionId: e.sources,
      documentId: id,
      data: { lastRun: at },
    });
  } catch {
    /* non-fatal: annotation only */
  }
}

export const autofetchConfigured = () => env() !== null;