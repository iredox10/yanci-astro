import type { APIRoute } from 'astro';
import { requireUser } from '@lib/auth';
import { db, settings } from '@db';

export const prerender = false;

const SETTINGS_KEY = 'autofetch_ai_settings';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function parseSettings(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const provider = typeof b.provider === 'string' ? b.provider.slice(0, 64) : null;
  const model = typeof b.model === 'string' ? b.model.slice(0, 128) : null;
  if (!provider && !model) return null;
  return JSON.stringify({ provider, model });
}

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const value = parseSettings(body);
  if (!value) return json({ ok: false, message: 'Invalid AI settings' }, 422);

  try {
    await db
      .insert(settings)
      .values({ key: SETTINGS_KEY, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
    return json({ ok: true });
  } catch (error) {
    console.error('[ai-settings] save failed', error);
    return json({ ok: false, message: 'Could not save AI settings' }, 500);
  }
};
