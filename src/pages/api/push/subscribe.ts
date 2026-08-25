import type { APIRoute } from 'astro';
import { AppwriteException, Client, Databases, ID, Query } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

interface PushSubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function isBase64Url(value: unknown, max: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= max &&
    /^[A-Za-z0-9\-_+/=]+$/.test(value)
  );
}

function isPushSubscriptionBody(body: unknown): body is PushSubscriptionBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.endpoint !== 'string') return false;
  if (!/^https:\/\/\S+$/.test(b.endpoint) || b.endpoint.length > 2048) return false;
  if (!b.keys || typeof b.keys !== 'object') return false;
  const keys = b.keys as Record<string, unknown>;
  return isBase64Url(keys.p256dh, 256) && isBase64Url(keys.auth, 128);
}

const _recent = new Map<string, number[]>();
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, hits] of _recent) {
    const alive = hits.filter((t) => t >= cutoff);
    if (alive.length === 0) _recent.delete(k);
    else _recent.set(k, alive);
  }
}, 300_000).unref();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - 60_000;
  const hits = (_recent.get(ip) ?? []).filter((t) => t >= cutoff);
  // Allow up to five subscribe attempts per minute per IP.
  if (hits.length >= 5) return true;
  hits.push(now);
  _recent.set(ip, hits);
  return false;
}

/**
 * POST /api/push/subscribe
 *
 * Stores a web push subscription for later fan-out by the send worker.
 * Deduplicates on the endpoint URL; re-subscribes refresh the stored keys.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  if (!isPushSubscriptionBody(body)) {
    return json({ ok: false, message: 'Invalid subscription' }, 422);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }

  if (!PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT_ID || !PUBLIC_APPWRITE_DATABASE_ID) {
    return json({ ok: false, message: 'Push unavailable' }, 503);
  }

  const collectionId =
    process.env.APPWRITE_COLLECTION_PUSH_SUBSCRIPTIONS || 'push_subscriptions';

  const client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY ?? '');
  const databases = new Databases(client);

  try {
    const existing = await databases.listDocuments({
      databaseId: PUBLIC_APPWRITE_DATABASE_ID,
      collectionId,
      queries: [Query.equal('endpoint', body.endpoint), Query.limit(1)],
    });

    const data = {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      subscribed_at: new Date().toISOString(),
    };

    if (existing.documents.length > 0) {
      await databases.updateDocument({
        databaseId: PUBLIC_APPWRITE_DATABASE_ID,
        collectionId,
        documentId: existing.documents[0].$id,
        data,
      });
    } else {
      await databases.createDocument({
        databaseId: PUBLIC_APPWRITE_DATABASE_ID,
        collectionId,
        documentId: ID.unique(),
        data,
      });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof AppwriteException &&
      (error.code === 404 || error.type === 'collection_not_found')
    ) {
      console.error('[push] subscriptions collection missing', collectionId);
      return json({ ok: false, message: 'Push unavailable' }, 503);
    }
    console.error('[push] subscribe failed', error);
    return json({ ok: false, message: 'An kasa aikawa' }, 503);
  }
};
