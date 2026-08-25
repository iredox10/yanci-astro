import type { APIRoute } from 'astro';
import { AppwriteException, Client, Databases, Query } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';
import { requireUser, hasRole } from '@lib/auth';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const OUTBOX_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS || 'notifications_outbox';

interface OutboxItem {
  id: string;
  title: string;
  body: string;
  url: string;
  audience: string;
  queuedAt: string | null;
  sentCount: number;
}

function toOutboxItem(doc: Record<string, unknown>): OutboxItem {
  return {
    id: String(doc.$id ?? ''),
    title: String(doc.title ?? ''),
    body: String(doc.body ?? ''),
    url: String(doc.url ?? '/'),
    audience: String(doc.audience ?? 'all'),
    queuedAt: typeof doc.queuedAt === 'string' ? doc.queuedAt : null,
    sentCount: Number(doc.sentCount ?? 0),
  };
}

/**
 * GET /api/admin/push/history
 *
 * Recent outbox documents, newest first, capped at 20.
 */
export const GET: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  if (!PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT_ID || !PUBLIC_APPWRITE_DATABASE_ID) {
    return json({ ok: false, message: 'Push unavailable' }, 503);
  }

  const client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY ?? '');

  try {
    const { documents } = await new Databases(client).listDocuments({
      databaseId: PUBLIC_APPWRITE_DATABASE_ID,
      collectionId: OUTBOX_COLLECTION,
      queries: [Query.orderDesc('$createdAt'), Query.limit(20)],
    });
    return json({ ok: true, items: documents.map(toOutboxItem) });
  } catch (error) {
    if (
      error instanceof AppwriteException &&
      (error.code === 404 || error.type === 'collection_not_found')
    ) {
      console.error('[push] outbox collection missing', OUTBOX_COLLECTION);
      return json({ ok: true, items: [] });
    }
    console.error('[push] history failed', error);
    return json({ ok: false, message: 'An kasa dawo da tarihi' }, 503);
  }
};
