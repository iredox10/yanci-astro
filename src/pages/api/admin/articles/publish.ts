import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { adminUpdateArticle } from '@lib/admin-store';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * POST /api/admin/articles/publish
 *
 * Batch-publish review drafts: { ids: string[] }. Only flips status/isLive,
 * never touches content (the generic PUT sanitizes every field, so it cannot
 * be used to just publish).
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

  const ids = Array.isArray(body.ids)
    ? body.ids.map((x) => String(x)).filter((x) => x.length > 0)
    : [];
  if (ids.length === 0) return json({ ok: false, message: 'No article ids given' }, 422);
  if (ids.length > 50) return json({ ok: false, message: 'Too many ids (max 50)' }, 422);

  const failed: string[] = [];
  for (const id of ids) {
    const ok = await adminUpdateArticle(id, { status: 'published', isLive: true });
    if (!ok) failed.push(id);
  }

  return json({ ok: true, published: ids.length - failed.length, failed }, failed.length ? 207 : 200);
};