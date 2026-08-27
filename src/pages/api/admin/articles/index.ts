import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { adminCreateArticle } from '@lib/admin-store';
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
  };
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'author')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const cleaned = sanitizeInput(body);
  if (!cleaned.headline) return json({ ok: false, message: 'Missing headline' }, 422);

  const id = await adminCreateArticle(cleaned);
  if (!id) return json({ ok: false, message: 'Publish unavailable' }, 503);
  return json({ ok: true, id }, 201);
};