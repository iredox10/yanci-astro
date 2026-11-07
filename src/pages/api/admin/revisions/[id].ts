import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { requireUser, hasRole } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';
import { db, articleRevisions } from '@/db';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

async function handle(request: Request, id: string | undefined): Promise<Response> {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  const revisionId = sanitizePlainText(id ?? '', 64);
  if (!revisionId) return json({ ok: false, message: 'Missing id' }, 422);

  try {
    const [row] = await db
      .select()
      .from(articleRevisions)
      .where(eq(articleRevisions.id, revisionId))
      .limit(1);

    if (!row) {
      return json({ ok: false, message: 'Ba a samu wannan sigar ba' }, 404);
    }

    return json({
      ok: true,
      revision: {
        id: row.id,
        articleId: row.articleId,
        title: (row.snapshot as any)?.headline || 'Revision',
        changedFields: Array.isArray((row.diff as any)?.changed) ? (row.diff as any).changed : [],
        authorName: row.author,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        snapshot: row.snapshot,
      },
    });
  } catch (error) {
    console.error('[admin/revisions] fetch failed', error);
    return json({ ok: false, message: 'Ba a samu wannan sigar ba' }, 404);
  }
}

export const GET: APIRoute = async ({ request, params }) => handle(request, params.id);
export const POST: APIRoute = async ({ request, params }) => handle(request, params.id);
