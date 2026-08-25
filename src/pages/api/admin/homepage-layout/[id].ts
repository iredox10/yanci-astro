import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { deleteHomepageLayoutDoc, updateHomepageLayoutDoc } from '@lib/homepage-layout';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** PUT — update one stored module doc ({ enabled?, position? }). */
export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'admin')) return json({ ok: false, message: 'Forbidden' }, 403);

  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const patch: { enabled?: boolean; position?: number } = {};
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') {
      return json({ ok: false, message: 'Invalid enabled' }, 422);
    }
    patch.enabled = body.enabled;
  }
  if (body.position !== undefined) {
    const position = Number(body.position);
    if (!Number.isInteger(position) || position < 0 || position > 999) {
      return json({ ok: false, message: 'Invalid position' }, 422);
    }
    patch.position = position;
  }
  if (Object.keys(patch).length === 0) {
    return json({ ok: false, message: 'Nothing to update' }, 422);
  }

  const doc = await updateHomepageLayoutDoc(id, patch);
  if (!doc) return json({ ok: false, message: 'Ba a iya sabuntawa' }, 503);
  return json({ ok: true, doc });
};

/** DELETE — drop one stored doc; the module falls back to its default slot. */
export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (auth.user.role !== 'super_admin' && auth.user.role !== 'managing_editor') {
    return json({ ok: false, message: 'Forbidden: only senior editors can delete' }, 403);
  }

  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  const ok = await deleteHomepageLayoutDoc(id);
  if (!ok) return json({ ok: false, message: 'Ba a iya gogewa' }, 503);
  return json({ ok: true });
};
