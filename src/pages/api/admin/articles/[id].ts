import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { adminUpdateArticle, adminDeleteArticle } from '@lib/admin-store';
import { sanitizeRichText, sanitizePlainText, sanitizeImageUrl } from '@lib/sanitize';

export const prerender = false;

function sanitizeInput(body: Record<string, unknown>) {
  return {
    headline: sanitizePlainText(String(body.headline ?? ''), 200),
    kicker: sanitizePlainText(String(body.kicker ?? ''), 120),
    trail: sanitizePlainText(String(body.trail ?? ''), 500),
    body: sanitizeRichText(String(body.body ?? '')),
    image: sanitizeImageUrl(String(body.image ?? '')) ?? undefined,
    pillar: sanitizePlainText(String(body.pillar ?? 'news'), 40),
    section: sanitizePlainText(String(body.section ?? ''), 60),
    author: sanitizePlainText(String(body.author ?? ''), 120),
    slug: sanitizePlainText(String(body.slug ?? ''), 160),
    isLive: Boolean(body.isLive),
    status: ['draft', 'published', 'scheduled'].includes(String(body.status))
      ? String(body.status)
      : 'draft',
    publishAt: typeof body.publishAt === 'string' ? body.publishAt : undefined,
    isSensitive: Boolean(body.isSensitive),
    tags: Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => sanitizePlainText(String(t), 40)).filter(Boolean)
      : [],
    metaTitle: sanitizePlainText(String(body.metaTitle ?? ''), 200),
    metaDescription: sanitizePlainText(String(body.metaDescription ?? ''), 300),
  };
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

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

  const cleaned = sanitizeInput(body);
  const ok = await adminUpdateArticle(id, cleaned);
  if (!ok) return json({ ok: false, message: 'Update failed' }, 503);
  return json({ ok: true });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (auth.user.role !== 'super_admin' && auth.user.role !== 'managing_editor') {
    return json({ ok: false, message: 'Forbidden: only senior editors can delete' }, 403);
  }

  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  const ok = await adminDeleteArticle(id);
  if (!ok) return json({ ok: false, message: 'Delete failed' }, 503);
  return json({ ok: true });
};