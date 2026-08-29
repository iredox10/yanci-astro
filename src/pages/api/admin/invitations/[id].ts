import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { adminDeleteCollectionDoc, adminUpdateCollectionDoc } from '@lib/admin-collections';

export const prerender = false;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'admin')) return json({ ok: false, message: 'Forbidden' }, 403);
  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);
  const ok = await adminDeleteCollectionDoc('invitations', id);
  if (!ok) return json({ ok: false, message: 'Delete failed' }, 503);
  return json({ ok: true });
};

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'admin')) return json({ ok: false, message: 'Forbidden' }, 403);
  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }
  const allowed: Record<string, unknown> = {};
  if (typeof body.status === 'string') allowed.status = body.status;
  if (Object.keys(allowed).length === 0) return json({ ok: false, message: 'No fields' }, 422);
  const ok = await adminUpdateCollectionDoc('invitations', id, allowed);
  if (!ok) return json({ ok: false, message: 'Update failed' }, 503);
  return json({ ok: true });
};
