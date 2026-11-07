import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { requireUser } from '@lib/auth';
import { db, settings } from '@db';

export const prerender = false;

const SETTINGS_KEY = 'autofetch_ai_settings';
const DEFAULT_SETTINGS = { provider: 'Gemini', model: 'gemini-1.5-flash' };

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ ok: false, message: 'Unauthorized' }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
      .limit(1);

    if (row?.value) {
      return new Response(row.value, { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('[ai-settings] read failed', error);
  }

  return new Response(JSON.stringify(DEFAULT_SETTINGS), {
    headers: { 'Content-Type': 'application/json' },
  });
};
