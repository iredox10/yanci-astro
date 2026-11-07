import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { requireUser, hasRole } from '@lib/auth';
import { getAllComments } from '@lib/appwrite-server';
import { db, comments } from '@/db';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** GET /api/admin/comments — list all comments for moderation. */
export const GET: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  const commentList = await getAllComments();
  return json({ ok: true, comments: commentList });
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

  try {
    await db.update(comments).set({ status }).where(eq(comments.id, id));
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

  try {
    await db.delete(comments).where(eq(comments.id, id));
    return json({ ok: true });
  } catch (error) {
    console.error('[admin/comments] delete failed', error);
    return json({ ok: false, message: 'An kasa aikawa' }, 503);
  }
};
