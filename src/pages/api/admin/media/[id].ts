import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { deleteMedia, isMediaConfigured } from '@lib/admin-media';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing file id' }, 422);

  if (!isMediaConfigured()) {
    return json({ ok: false, message: 'Storage not configured' }, 503);
  }

  try {
    const success = await deleteMedia(id);
    if (!success) {
      return json({ ok: false, message: 'Failed to delete file from storage' }, 500);
    }
    return json({ ok: true });
  } catch (error) {
    console.error('[media] delete failed', error);
    return json({ ok: false, message: 'Delete failed' }, 500);
  }
};
