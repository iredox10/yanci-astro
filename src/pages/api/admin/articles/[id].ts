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
  const type = ['key-event', 'update', 'repo'].includes(String(u.type)) ? String(u.type) : (u.isKeyEvent ? 'key-event' : 'update');
  const pinned = Boolean(u.pinned ?? u.isPinned);
  const isPinned = Boolean(u.isPinned ?? u.pinned);
  const isKeyEvent = Boolean(u.isKeyEvent ?? (u.type === 'key-event'));
  const isSummary = Boolean(u.isSummary);
  const images = Array.isArray(u.images) ? (u.images as unknown[]).map((v) => sanitizeImageUrl(String(v))).filter((v): v is string => Boolean(v)).slice(0, 8) : undefined;
  const image = sanitizeImageUrl(String(u.image ?? '')) ?? (images?.[0] as string | undefined);
  if (!title && !content) return null;
  return {
    id: sanitizePlainText(String(u.id ?? ''), 40),
    timestamp: typeof u.timestamp === 'string' ? u.timestamp.slice(0, 40) : typeof u.timestamp === 'number' ? String(u.timestamp) : undefined,
    time: sanitizePlainText(String(u.time ?? ''), 40),
    title,
    content,
    type,
    pinned,
    isPinned,
    isKeyEvent,
    isSummary,
    images,
    author: sanitizePlainText(String(u.author ?? ''), 120),
    image: image ?? undefined,
  };
}

function sanitizeInput(body: Record<string, unknown>) {
  const liveUpdates = Array.isArray(body.liveUpdates)
    ? body.liveUpdates
        .map(sanitizeLiveUpdate)
        .filter((u): u is Record<string, unknown> => u !== null)
        .map((u) => JSON.stringify(u))
    : undefined;
  const out: Record<string, unknown> = {
    headline: body.headline !== undefined ? sanitizePlainText(String(body.headline ?? ''), 200) : undefined,
    kicker: body.kicker !== undefined ? sanitizePlainText(String(body.kicker ?? ''), 120) : undefined,
    trail: body.trail !== undefined ? sanitizePlainText(String(body.trail ?? ''), 500) : undefined,
    body: body.body !== undefined ? sanitizeRichText(String(body.body ?? '')) : undefined,
    image: body.image !== undefined ? (sanitizeImageUrl(String(body.image ?? '')) ?? undefined) : undefined,
    pillar: body.pillar !== undefined ? sanitizePlainText(String(body.pillar ?? 'news'), 40) : undefined,
    section: body.section !== undefined ? sanitizePlainText(String(body.section ?? ''), 60) : undefined,
    type: body.type !== undefined ? (['hero', 'standard', 'compact'].includes(String(body.type)) ? String(body.type) : 'standard') : undefined,
    author: body.author !== undefined ? sanitizePlainText(String(body.author ?? ''), 120) : undefined,
    slug: body.slug !== undefined ? sanitizePlainText(String(body.slug ?? ''), 160) : undefined,
    isLive: body.isLive !== undefined ? Boolean(body.isLive) : undefined,
    status: body.status !== undefined ? (['draft', 'published', 'scheduled'].includes(String(body.status)) ? String(body.status) : 'draft') : undefined,
    publishAt: body.publishAt !== undefined ? (typeof body.publishAt === 'string' ? body.publishAt : undefined) : undefined,
    isSensitive: body.isSensitive !== undefined ? Boolean(body.isSensitive) : undefined,
    metaTitle: body.metaTitle !== undefined ? sanitizePlainText(String(body.metaTitle ?? ''), 200) : undefined,
    metaDescription: body.metaDescription !== undefined ? sanitizePlainText(String(body.metaDescription ?? ''), 300) : undefined,
    imageFocalX: body.imageFocalX !== undefined ? (typeof body.imageFocalX === 'number' ? Math.round(body.imageFocalX) : undefined) : undefined,
    imageFocalY: body.imageFocalY !== undefined ? (typeof body.imageFocalY === 'number' ? Math.round(body.imageFocalY) : undefined) : undefined,
    imageAlt: body.imageAlt !== undefined ? (typeof body.imageAlt === 'string' ? sanitizePlainText(body.imageAlt, 300) : undefined) : undefined,
    tags: body.tags !== undefined ? (Array.isArray(body.tags) ? body.tags.map((t) => sanitizePlainText(String(t), 50)).filter(Boolean).slice(0, 40) : undefined) : undefined,
    is_breaking: body.is_breaking !== undefined ? Boolean(body.is_breaking) : undefined,
    breaking_until: body.breaking_until !== undefined ? (typeof body.breaking_until === 'string' && body.breaking_until ? body.breaking_until : undefined) : undefined,
    review_status: body.review_status !== undefined ? (['pending', 'approved', 'rejected'].includes(String(body.review_status)) ? String(body.review_status) : 'pending') : undefined,
    focal_point: body.focal_point !== undefined ? (body.focal_point ? (typeof body.focal_point === 'object' ? JSON.stringify(body.focal_point) : sanitizePlainText(String(body.focal_point), 100)) : undefined) : undefined,
    videoUrl: body.videoUrl !== undefined ? ((sanitizeImageUrl(String(body.videoUrl ?? '')) ?? sanitizePlainText(String(body.videoUrl ?? ''), 500)) || undefined) : undefined,
    keyFigures: body.keyFigures !== undefined ? sanitizePlainText(String(body.keyFigures ?? ''), 4000) || undefined : undefined,
    mapEmbedUrl: body.mapEmbedUrl !== undefined ? ((sanitizeImageUrl(String(body.mapEmbedUrl ?? '')) ?? sanitizePlainText(String(body.mapEmbedUrl ?? ''), 1000)) || undefined) : undefined,
  };
  if (liveUpdates !== undefined) out.liveUpdates = liveUpdates;
  // strip undefined keys so partial updates don't overwrite with empty
  for (const k of Object.keys(out)) if ((out as Record<string, unknown>)[k] === undefined) delete (out as Record<string, unknown>)[k];
  return out;
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