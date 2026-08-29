import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import { adminUpdateArticle } from '@lib/admin-store';
import { getArticleById } from '@lib/appwrite-server';
import { sanitizePlainText, sanitizeRichText, sanitizeImageUrl } from '@lib/sanitize';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function parseUpdates(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw
      .map((u) => {
        if (typeof u === 'string') {
          try {
            return JSON.parse(u);
          } catch {
            return null;
          }
        }
        return u;
      })
      .filter((u): u is Record<string, unknown> => u !== null && typeof u === 'object');
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
    } catch {
      /* ignore */
    }
  }
  return [];
}

/** Collection stores each update as a JSON string; serialize before writing. */
function serializeUpdates(updates: Record<string, unknown>[]): string[] {
  return updates.map((u) => JSON.stringify(u));
}

/** Dedupe by update id; upsert on id match, otherwise push. */
function mergeUpdate(existing: Record<string, unknown>[], update: Record<string, unknown>): Record<string, unknown>[] {
  const id = String(update.id ?? '');
  if (!id) return [...existing, update];
  const found = existing.some((u) => String(u.id ?? '') === id);
  return found
    ? existing.map((u) => (String(u.id ?? '') === id ? { ...u, ...update } : u))
    : [...existing, update];
}

/** POST /api/admin/articles/live — append or upsert a live update. */
export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const articleId = String(body.articleId ?? '');
  const raw = body.update as Record<string, unknown> | undefined;
  if (!articleId || !raw || typeof raw !== 'object') {
    return json({ ok: false, message: 'articleId and update required' }, 422);
  }

  const rawImages = Array.isArray(raw.images) ? (raw.images as unknown[]).map((v) => sanitizeImageUrl(String(v))).filter((v): v is string => Boolean(v)).slice(0, 8) : undefined;
  const rawImage = sanitizeImageUrl(String(raw.image ?? '')) ?? (rawImages?.[0] as string | undefined);
  const type = ['key-event', 'update', 'repo'].includes(String(raw.type)) ? String(raw.type) : (raw.isKeyEvent ? 'key-event' : 'update');
  const update: Record<string, unknown> = {
    id: sanitizePlainText(String(raw.id ?? `u${Date.now()}`), 40),
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp.slice(0, 40) : typeof raw.timestamp === 'number' ? String(raw.timestamp) : new Date().toISOString(),
    time: sanitizePlainText(String(raw.time ?? ''), 40),
    title: sanitizePlainText(String(raw.title ?? ''), 300),
    content: sanitizeRichText(String(raw.content ?? '')),
    type,
    pinned: Boolean(raw.pinned ?? raw.isPinned),
    isPinned: Boolean(raw.isPinned ?? raw.pinned),
    isKeyEvent: Boolean(raw.isKeyEvent ?? (String(raw.type) === 'key-event')),
    isSummary: Boolean(raw.isSummary),
    images: rawImages,
    image: rawImage ?? undefined,
    author: sanitizePlainText(String(raw.author ?? auth.user.name ?? 'Edita'), 120),
  };
  if (!update.title && !update.content) {
    return json({ ok: false, message: 'Update needs a title or content' }, 422);
  }

  const article = await getArticleById(articleId);
  if (!article) return json({ ok: false, message: 'Article not found' }, 404);

  const merged = mergeUpdate(parseUpdates(article.liveUpdates), update);
  const ok = await adminUpdateArticle(articleId, { liveUpdates: serializeUpdates(merged), isLive: true });
  if (!ok) return json({ ok: false, message: 'Update failed' }, 503);
  return json({ ok: true, liveUpdates: merged }, 201);
};

/** PUT /api/admin/articles/live — toggle the live flag (start/end coverage). */
export const PUT: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const articleId = String(body.articleId ?? '');
  if (!articleId) return json({ ok: false, message: 'Missing articleId' }, 422);

  const isLive = Boolean(body.isLive);
  const article = await getArticleById(articleId);
  if (!article) return json({ ok: false, message: 'Article not found' }, 404);

  const ok = await adminUpdateArticle(articleId, { isLive, status: isLive ? 'published' : String(article.status ?? 'draft') });
  if (!ok) return json({ ok: false, message: 'Update failed' }, 503);
  return json({ ok: true, isLive });
};

/** DELETE /api/admin/articles/live — remove one update by id. */
export const DELETE: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const articleId = String(body.articleId ?? '');
  const updateId = String(body.updateId ?? '');
  if (!articleId || !updateId) return json({ ok: false, message: 'articleId and updateId required' }, 422);

  const article = await getArticleById(articleId);
  if (!article) return json({ ok: false, message: 'Article not found' }, 404);

  const remaining = parseUpdates(article.liveUpdates).filter((u) => String(u.id ?? '') !== updateId);
  const ok = await adminUpdateArticle(articleId, { liveUpdates: serializeUpdates(remaining) });
  if (!ok) return json({ ok: false, message: 'Update failed' }, 503);
  return json({ ok: true, liveUpdates: remaining });
};
