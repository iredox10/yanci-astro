import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { reorderVideos } from '@lib/videos';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  if (!Array.isArray(body.ids)) return json({ ok: false, message: 'ids must be an array' }, 422);
  const ids = body.ids.filter((id): id is string => typeof id === 'string');
  if (ids.length !== body.ids.length || ids.length === 0) {
    return json({ ok: false, message: 'ids must be non-empty strings' }, 422);
  }

  const ok = await reorderVideos(ids);
  if (!ok) return json({ ok: false, message: 'Reorder failed' }, 503);
  return json({ ok: true });
};
