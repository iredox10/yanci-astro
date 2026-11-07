import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';
import { db, comments } from '@/db';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const _likeCounts = new Map<string, number>();
const MAX_LIKES_PER_IP = 100;

export const POST: APIRoute = async ({ request, params }) => {
  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipKey = `likes|${ip}`;
  const ipCount = _likeCounts.get(ipKey) ?? 0;
  if (ipCount >= MAX_LIKES_PER_IP) return json({ ok: false, message: 'Sun yi yawa' }, 429);
  _likeCounts.set(ipKey, ipCount + 1);

  try {
    const [updated] = await db
      .update(comments)
      .set({ likes: sql`${comments.likes} + 1` })
      .where(eq(comments.id, id))
      .returning({ likes: comments.likes });

    if (!updated) {
      return json({ ok: false, message: 'Comment not found' }, 404);
    }

    return json({ ok: true, likes: updated.likes });
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

  try {
    const [comment] = await db
      .select({ ownerToken: comments.ownerToken })
      .from(comments)
      .where(eq(comments.id, id))
      .limit(1);

    if (!comment) return json({ ok: false, message: 'Comment not found' }, 404);

    if (!comment.ownerToken || comment.ownerToken !== ownerToken) {
      return json({ ok: false, message: 'Wannan sharhin ba naka ba ne' }, 403);
    }

    await db.delete(comments).where(eq(comments.id, id));
    return json({ ok: true });
  } catch (error) {
    console.error('[comments] delete failed', error);
    return json({ ok: false, message: 'An kasa aikawa' }, 503);
  }
};
