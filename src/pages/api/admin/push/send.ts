import type { APIRoute } from 'astro';
import { AppwriteException, Client, Databases, ID, Query } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';
import { requireUser, hasRole } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';
import { SECTIONS } from '@/data/sections';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const SUBSCRIPTIONS_COLLECTION =
  process.env.APPWRITE_COLLECTION_PUSH_SUBSCRIPTIONS || 'push_subscriptions';
const OUTBOX_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS || 'notifications_outbox';

const AUDIENCES = new Set(['all', ...SECTIONS.map((s) => s.slug)]);

interface SendPayload {
  title: string;
  body: string;
  url: string;
  audience: string;
}

function isRelativeOrHttpsUrl(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return value.length <= 2048;
  return /^https:\/\/\S+$/.test(value) && value.length <= 2048;
}

function parseSendPayload(raw: unknown): SendPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const title = typeof b.title === 'string' ? sanitizePlainText(b.title, 80).trim() : '';
  const body = typeof b.body === 'string' ? sanitizePlainText(b.body, 200).trim() : '';
  if (!title || !body) return null;
  const url = typeof b.url === 'string' && b.url.trim() ? b.url.trim() : '/';
  if (!isRelativeOrHttpsUrl(url)) return null;
  const audience = typeof b.audience === 'string' && AUDIENCES.has(b.audience) ? b.audience : 'all';
  return { title, body, url, audience };
}

/**
 * POST /api/admin/push/send
 *
 * Validates a notification and enqueues exactly one outbox document. Delivery
 * itself is drained by the send worker; this endpoint never pushes directly.
 */
export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const payload = parseSendPayload(raw);
  if (!payload) {
    return json({ ok: false, message: 'Sanarwa ba daidai ba: take (≤80), saƙonni (≤200), hanya ingantaccen URL' }, 422);
  }

  if (!PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT_ID || !PUBLIC_APPWRITE_DATABASE_ID) {
    return json({ ok: false, message: 'Push unavailable' }, 503);
  }

  const client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY ?? '');
  const databases = new Databases(client);

  try {
    const subs = await databases.listDocuments({
      databaseId: PUBLIC_APPWRITE_DATABASE_ID,
      collectionId: SUBSCRIPTIONS_COLLECTION,
      queries: [Query.limit(1)],
    });
    const subscribers = subs.total;

    await databases.createDocument({
      databaseId: PUBLIC_APPWRITE_DATABASE_ID,
      collectionId: OUTBOX_COLLECTION,
      documentId: ID.unique(),
      data: {
        title: payload.title,
        body: payload.body,
        url: payload.url,
        audience: payload.audience,
        queuedAt: new Date().toISOString(),
        sentCount: 0,
      },
    });

    const pending = await databases.listDocuments({
      databaseId: PUBLIC_APPWRITE_DATABASE_ID,
      collectionId: OUTBOX_COLLECTION,
      queries: [Query.equal('sentCount', 0), Query.limit(1)],
    });

    return json(
      { ok: true, queued: true, subscribers, queueDepth: pending.total },
      201,
    );
  } catch (error) {
    if (
      error instanceof AppwriteException &&
      (error.code === 404 || error.type === 'collection_not_found')
    ) {
      console.error('[push] outbox or subscriptions collection missing', {
        outbox: OUTBOX_COLLECTION,
        subscriptions: SUBSCRIPTIONS_COLLECTION,
      });
      return json({ ok: false, message: 'Push unavailable' }, 503);
    }
    console.error('[push] enqueue failed', error);
    return json({ ok: false, message: 'An kasa tsara aikawa' }, 503);
  }
};
