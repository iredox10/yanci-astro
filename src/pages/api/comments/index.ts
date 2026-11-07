import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getComments } from '@lib/appwrite-server';
import { sanitizePlainText } from '@lib/sanitize';
import { db, comments } from '@/db';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function rateLimited(articleId: string, ip: string): boolean {
  const key = `${articleId}|${ip}`;
  const now = Date.now();
  const hits = _recent.get(key);
  if (!hits) {
    _recent.set(key, now);
    return false;
  }
  if (now - hits < 60_000) return true;
  _recent.set(key, now);
  return false;
}
const _recent = new Map<string, number>();
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, t] of _recent) if (t < cutoff) _recent.delete(k);
}, 300_000).unref();

export const GET: APIRoute = async ({ url }) => {
  const articleId = url.searchParams.get('articleId') ?? '';
  if (!articleId) return json({ ok: false, message: 'Missing articleId' }, 422);
  const commentList = await getComments(articleId);
  return json({ ok: true, comments: commentList });
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const articleId = sanitizePlainText(String(body.articleId ?? ''), 64);
  const name = sanitizePlainText(String(body.name ?? ''), 60);
  const commentBody = sanitizePlainText(String(body.body ?? ''), 2000);
  if (!articleId) return json({ ok: false, message: 'Missing articleId' }, 422);
  if (!name) return json({ ok: false, message: 'Da sunanka' }, 422);
  if (commentBody.length < 2) return json({ ok: false, message: 'Rubutu ya fi gajarta' }, 422);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(articleId, ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }

  const commentId = `cm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const ownerToken = typeof body.ownerToken === 'string' ? sanitizePlainText(body.ownerToken, 64) : '';

  try {
    await db.insert(comments).values({
      id: commentId,
      articleId,
      name,
      body: commentBody,
      likes: 0,
      status: 'pending',
      ownerToken,
    });

    return json({
      ok: true,
      comment: {
        $id: commentId,
        id: commentId,
        articleId,
        name,
        body: commentBody,
        likes: 0,
        status: 'pending',
        ownerToken,
        createdAt: new Date().toISOString(),
      },
    }, 201);
  } catch (error) {
    console.error('[comments] create failed', error);
    return json({ ok: false, message: 'An kasa aikawa' }, 503);
  }
};
