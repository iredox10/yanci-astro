import type { APIRoute } from 'astro';
import { Client, Databases } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
  PUBLIC_APPWRITE_COLLECTION_COMMENTS,
} from 'astro:env/client';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function databases() {
  const client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY ?? '');
  return new Databases(client);
}

const _likeLocks = new Map<string, Promise<unknown>>();
const _likeCounts = new Map<string, string>();
const MAX_LIKES_PER_IP = 100;

// Increment likes with a per-comment mutex so concurrent clicks don't race.
export const POST: APIRoute = async ({ request, params }) => {
  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);
  const databaseId = PUBLIC_APPWRITE_DATABASE_ID;
  const commentsCollection = PUBLIC_APPWRITE_COLLECTION_COMMENTS;
  if (!databaseId || !commentsCollection) {
    return json({ ok: false, message: 'Comments unavailable' }, 503);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipKey = `likes|${ip}`;
  const ipCount = Number(_likeCounts.get(ipKey) ?? 0);
  if (ipCount >= MAX_LIKES_PER_IP) return json({ ok: false, message: 'Sun yi yawa' }, 429);
  _likeCounts.set(ipKey, String(ipCount + 1));

  const db = databases();
  const prev = (_likeLocks.get(id) ?? Promise.resolve()).catch(() => {});
  const run = prev.then(async () => {
    const doc = await db.getDocument({
      databaseId,
      collectionId: commentsCollection,
      documentId: id,
    });
    const likes = Number((doc as Record<string, unknown>).likes ?? 0);
    return db.updateDocument({
      databaseId,
      collectionId: commentsCollection,
      documentId: id,
      data: { likes: likes + 1 },
    });
  }).finally(() => _likeLocks.delete(id));
  _likeLocks.set(id, run);

  try {
    const updated = await run;
    return json({ ok: true, likes: Number((updated as Record<string, unknown>).likes ?? 0) });
  } catch (error) {
    console.error('[comments] like failed', error);
    return json({ ok: false, message: 'An kasa aikawa' }, 503);
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }
  const ownerToken = String(body.ownerToken ?? '');
  if (!ownerToken) return json({ ok: false, message: 'Missing ownerToken' }, 422);
  const databaseId = PUBLIC_APPWRITE_DATABASE_ID;
  const commentsCollection = PUBLIC_APPWRITE_COLLECTION_COMMENTS;
  if (!databaseId || !commentsCollection) {
    return json({ ok: false, message: 'Comments unavailable' }, 503);
  }

  try {
    const doc = await databases().getDocument({
      databaseId,
      collectionId: commentsCollection,
      documentId: id,
    });
    const stored = String((doc as Record<string, unknown>).ownerToken ?? '');
    if (!stored || stored !== ownerToken) {
      return json({ ok: false, message: 'Wannan sharhin ba naka ba ne' }, 403);
    }
    await databases().deleteDocument({
      databaseId,
      collectionId: commentsCollection,
      documentId: id,
    });
    return json({ ok: true });
  } catch (error) {
    console.error('[comments] delete failed', error);
    return json({ ok: false, message: 'An kasa aikawa' }, 503);
  }
};