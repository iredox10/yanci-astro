import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { adminCreateCollectionDoc, adminDeleteCollectionDoc } from '@lib/admin-collections';
import { sanitizePlainText, sanitizeImageUrl } from '@lib/sanitize';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'admin')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const email = sanitizePlainText(String(body.email ?? ''), 320).toLowerCase();
  const name = sanitizePlainText(String(body.name ?? ''), 120);
  const role = sanitizePlainText(String(body.role ?? 'contributor'), 60);
  const category = sanitizePlainText(String(body.category ?? ''), 60);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, message: 'Invalid email' }, 422);
  }

  const token = [...crypto.getRandomValues(new Uint8Array(24))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const id = await adminCreateCollectionDoc('invitations', {
    email,
    name,
    token,
    role,
    category,
    labels: `${role},${role}`,
    status: 'pending',
    expires_at: expiresAt,
    invited_by: auth.user.id ?? 'admin',
  });
  if (!id) return json({ ok: false, message: 'Create failed' }, 503);

  return json({ ok: true, id, token, expiresAt }, 201);
};

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
