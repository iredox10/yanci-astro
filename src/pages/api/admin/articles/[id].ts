import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { adminUpdateArticle, adminDeleteArticle } from '@lib/admin-store';
import { sanitizeRichText, sanitizePlainText, sanitizeImageUrl } from '@lib/sanitize';

export const prerender = false;

function sanitizeLiveUpdate(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  const title = sanitizePlainText(String(u.title ?? ''), 300);
  const content = sanitizeRichText(String(u.content ?? ''));
  const type = ['key-event', 'update', 'repo'].includes(String(u.type)) ? String(u.type) : 'update';
  const pinned = Boolean(u.pinned);
  if (!title && !content) return null;
  return {
    id: sanitizePlainText(String(u.id ?? ''), 40),
    timestamp: typeof u.timestamp === 'string' ? u.timestamp.slice(0, 40) : undefined,
    time: sanitizePlainText(String(u.time ?? ''), 40),
    title,
    content,
    type,
    pinned,
    author: sanitizePlainText(String(u.author ?? ''), 120),
    image: sanitizeImageUrl(String(u.image ?? '')) ?? undefined,
  };
}

function sanitizeInput(body: Record<string, unknown>) {
  const liveUpdates = Array.isArray(body.liveUpdates)
    ? body.liveUpdates
        .map(sanitizeLiveUpdate)
        .filter((u): u is Record<string, unknown> => u !== null)
        .map((u) => JSON.stringify(u))
    : undefined;
  return {
    headline: sanitizePlainText(String(body.headline ?? ''), 200),
    kicker: sanitizePlainText(String(body.kicker ?? ''), 120),
    trail: sanitizePlainText(String(body.trail ?? ''), 500),
    body: sanitizeRichText(String(body.body ?? '')),
    image: sanitizeImageUrl(String(body.image ?? '')) ?? undefined,
    pillar: sanitizePlainText(String(body.pillar ?? 'news'), 40),
    section: sanitizePlainText(String(body.section ?? ''), 60),
    type: ['hero', 'standard', 'compact'].includes(String(body.type))
      ? String(body.type)
      : 'standard',
    author: sanitizePlainText(String(body.author ?? ''), 120),
    slug: sanitizePlainText(String(body.slug ?? ''), 160),
    isLive: Boolean(body.isLive),
    status: ['draft', 'published', 'scheduled'].includes(String(body.status))
      ? String(body.status)
      : 'draft',
    publishAt: typeof body.publishAt === 'string' ? body.publishAt : undefined,
    isSensitive: Boolean(body.isSensitive),
    metaTitle: sanitizePlainText(String(body.metaTitle ?? ''), 200),
    metaDescription: sanitizePlainText(String(body.metaDescription ?? ''), 300),
    imageFocalX: typeof body.imageFocalX === 'number' ? Math.round(body.imageFocalX) : undefined,
    imageFocalY: typeof body.imageFocalY === 'number' ? Math.round(body.imageFocalY) : undefined,
    imageAlt: typeof body.imageAlt === 'string' ? sanitizePlainText(body.imageAlt, 300) : undefined,
    tags: Array.isArray(body.tags)
      ? body.tags.map((t) => sanitizePlainText(String(t), 50)).filter(Boolean).slice(0, 40)
      : undefined,
    is_breaking: Boolean(body.is_breaking),
    breaking_until: typeof body.breaking_until === 'string' && body.breaking_until ? body.breaking_until : undefined,
    review_status: ['pending', 'approved', 'rejected'].includes(String(body.review_status))
      ? String(body.review_status)
      : 'pending',
    focal_point: body.focal_point
      ? typeof body.focal_point === 'object'
        ? JSON.stringify(body.focal_point)
        : sanitizePlainText(String(body.focal_point), 100)
      : undefined,
    liveUpdates,
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