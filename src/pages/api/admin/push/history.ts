import type { APIRoute } from 'astro';
import { desc } from 'drizzle-orm';
import { requireUser, hasRole } from '@lib/auth';
import { db, notificationsOutbox } from '@/db';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  try {
    const rows = await db
      .select()
      .from(notificationsOutbox)
      .orderBy(desc(notificationsOutbox.queuedAt))
      .limit(20);

    const items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      url: r.url,
      audience: r.audience,
      queuedAt: r.queuedAt ? new Date(r.queuedAt).toISOString() : null,
      sentCount: r.sentCount,
    }));

    return json({ ok: true, items });
  } catch (error) {
    console.error('[push/history] fetch failed', error);
    return json({ ok: false, message: 'Failed to fetch notification history' }, 503);
  }
};
