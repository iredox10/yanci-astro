import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { adminUpdateArticle } from '@lib/admin-store';
import { getArticleById } from '@lib/appwrite-server';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Naive IP-hash rate limiting, same spirit as api/auth/register.
const WINDOW_MS = 60 * 60_000;
const MAX_PER_WINDOW = 30;
const _attempts = new Map<string, number[]>();
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [k, times] of _attempts) {
    const live = times.filter((t) => t > cutoff);
    if (live.length === 0) _attempts.delete(k);
    else _attempts.set(k, live);
  }
}, 300_000).unref();

function hashIp(ip: string): string {
  let h = 5381;
  for (let i = 0; i < ip.length; i++) h = ((h << 5) + h + ip.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function rateLimited(ip: string): boolean {
  const key = hashIp(ip);
  const now = Date.now();
  const recent = (_attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    _attempts.set(key, recent);
    return true;
  }
  recent.push(now);
  _attempts.set(key, recent);
  return false;
}

/**
 * POST /api/admin/articles/revive — { id }
 *
 * Resurfaces a stale published article: publishAt is refreshed to now (any
 * write also touches $updatedAt server-side). Same permission model as
 * PUT /api/admin/articles/[id]; never mutates editorial content.
 */
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

  const id = String(body.id ?? '').trim();
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa bayan dan lokaci' }, 429);
  }

  const article = await getArticleById(id);
  if (!article) return json({ ok: false, message: 'Article not found' }, 404);
  const status = String(article.status ?? (article.isLive ? 'published' : 'draft'));
  if (status !== 'published') {
    return json({ ok: false, message: 'Only published articles can be revived' }, 409);
  }

  const now = new Date().toISOString();
  const ok = await adminUpdateArticle(id, { publishAt: now });
  if (!ok) return json({ ok: false, message: 'Update failed' }, 503);
  return json({ ok: true, publishAt: now });
};
