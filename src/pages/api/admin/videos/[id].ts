import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';
import { cleanVideoInput, deleteVideo, updateVideo, type VideoPatch } from '@lib/videos';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function seniorEditor(role: string): boolean {
  return role === 'super_admin' || role === 'managing_editor';
}

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const patch: VideoPatch = {};
  if (body.url !== undefined) {
    const cleaned = cleanVideoInput(body);
    if (!cleaned) return json({ ok: false, message: 'Invalid YouTube URL' }, 422);
    patch.title = cleaned.title;
    patch.url = cleaned.url;
    patch.youtubeId = cleaned.youtubeId;
    patch.description = cleaned.description;
    patch.thumbnail = cleaned.thumbnail;
    patch.published = cleaned.published;
    if (cleaned.order !== null) patch.order = cleaned.order;
  } else {
    if (typeof body.title === 'string') patch.title = sanitizePlainText(body.title, 200);
    if (typeof body.description === 'string') {
      patch.description = sanitizePlainText(body.description, 1000);
    }
    if (typeof body.thumbnail === 'string') patch.thumbnail = sanitizePlainText(body.thumbnail, 500);
    if (typeof body.published === 'boolean') patch.published = body.published;
  }

  if (body.order !== undefined && patch.order === undefined) {
    const order = Number(body.order);
    if (Number.isFinite(order)) patch.order = Math.trunc(order);
  }

  if (Object.keys(patch).length === 0) return json({ ok: false, message: 'No valid fields' }, 422);

  const video = await updateVideo(id, patch);
  if (!video) return json({ ok: false, message: 'Update failed' }, 503);
  return json({ ok: true, video });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!seniorEditor(auth.user.role)) {
    return json({ ok: false, message: 'Forbidden: only senior editors can delete' }, 403);
  }

  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  const ok = await deleteVideo(id);
  if (!ok) return json({ ok: false, message: 'Delete failed' }, 503);
  return json({ ok: true });
};
