import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { requireUser, hasRole } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';
import { db, articleRevisions } from '@/db';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const GET: APIRoute = async ({ request, url }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  const articleId = sanitizePlainText(url.searchParams.get('articleId') ?? '', 64);
  if (!articleId) return json({ ok: false, message: 'Missing articleId' }, 422);

  try {
    const rows = await db
      .select()
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, articleId))
      .orderBy(desc(articleRevisions.createdAt))
      .limit(100);

    const revisionsList = rows.map((r) => ({
      id: r.id,
      articleId: r.articleId,
      title: (r.snapshot as any)?.headline || (r.snapshot as any)?.title || 'Revision',
      changedFields: Array.isArray((r.diff as any)?.changed) ? (r.diff as any).changed : [],
      authorName: r.author,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));

    return json({ ok: true, revisions: revisionsList });
  } catch (error) {
    console.error('[admin/revisions] list failed', error);
    return json({ ok: false, message: 'An kasa loda tarihi' }, 503);
  }
};

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

  const articleId = sanitizePlainText(String(body.articleId ?? ''), 64);
  if (!articleId) return json({ ok: false, message: 'Missing articleId' }, 422);

  const snapshot = typeof body.snapshot === 'string' ? JSON.parse(body.snapshot) : body.snapshot;
  const id = `rev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const authorName = sanitizePlainText(String(body.authorName ?? ''), 120) || auth.user.name || 'unknown';

  try {
    await db.insert(articleRevisions).values({
      id,
      articleId,
      author: authorName,
      diff: { changed: body.changedFields },
      snapshot,
    });
    return json({ ok: true, id }, 201);
  } catch (error) {
    console.error('[admin/revisions] create failed', error);
    return json({ ok: false, message: 'An kasa ajiye tarihi' }, 503);
  }
};
