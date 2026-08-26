import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { getAllComments } from '@lib/appwrite-server';
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

/** GET /api/admin/comments?status=pending — list all comments for moderation. */
export const GET: APIRoute = async ({ request, url }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  const status = url.searchParams.get('status') ?? '';
  const comments = await getAllComments(status);
  return json({ ok: true, comments });
};

/** POST /api/admin/comments — set moderation status on a comment ({ id, status }). */
export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }
  const id = String(body.id ?? '');
  const status = String(body.status ?? '');
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);
  if (status !== 'pending' && status !== 'approved' && status !== 'rejected') {
    return json({ ok: false, message: 'Invalid status' }, 422);
  }
  const databaseId = PUBLIC_APPWRITE_DATABASE_ID;
  const commentsCollection = PUBLIC_APPWRITE_COLLECTION_COMMENTS;
  if (!databaseId || !commentsCollection) return json({ ok: false, message: 'Unavailable' }, 503);

  try {
    await databases().updateDocument({
      databaseId,
      collectionId: commentsCollection,
      documentId: id,
      data: { status },
    });
    return json({ ok: true });
  } catch (error) {
    console.error('[admin/comments] update failed', error);
    return json({ ok: false, message: 'An kasa aikawa' }, 503);
  }
};

/** DELETE /api/admin/comments — remove a comment ({ id }). */
export const DELETE: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }
  const id = String(body.id ?? '');
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);
  const databaseId = PUBLIC_APPWRITE_DATABASE_ID;
  const commentsCollection = PUBLIC_APPWRITE_COLLECTION_COMMENTS;
  if (!databaseId || !commentsCollection) return json({ ok: false, message: 'Unavailable' }, 503);

  try {
    await databases().deleteDocument({
      databaseId,
      collectionId: commentsCollection,
      documentId: id,
    });
    return json({ ok: true });
  } catch (error) {
    console.error('[admin/comments] delete failed', error);
    return json({ ok: false, message: 'An kasa aikawa' }, 503);
  }
};