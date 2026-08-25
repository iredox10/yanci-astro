import type { APIRoute } from 'astro';
import { requireUser, hasRole } from '@lib/auth';
import {
  getHomepageLayout,
  listHomepageLayoutDocs,
  parseLayoutItems,
  resetHomepageLayout,
  saveHomepageLayout,
} from '@lib/homepage-layout';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** GET — normalized layout plus the raw stored docs. */
export const GET: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'admin')) return json({ ok: false, message: 'Forbidden' }, 403);

  const [layout, docs] = await Promise.all([getHomepageLayout(), listHomepageLayoutDocs()]);
  return json({ ok: true, layout, docs });
};

async function save(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'admin')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  if (body.reset === true) {
    const ok = await resetHomepageLayout();
    return ok ? json({ ok: true }) : json({ ok: false, message: 'Ba a iya mayar da tsoho' }, 503);
  }

  const items = parseLayoutItems(body.layout);
  if (!items) return json({ ok: false, message: 'Invalid layout' }, 422);

  const ok = await saveHomepageLayout(items);
  return ok ? json({ ok: true }) : json({ ok: false, message: 'Ba a iya ajiyewa' }, 503);
}

/** POST/PUT — persist the full layout ({ layout }) or restore defaults ({ reset: true }). */
export const POST: APIRoute = ({ request }) => save(request);
export const PUT: APIRoute = ({ request }) => save(request);
