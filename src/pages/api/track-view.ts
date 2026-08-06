import type { APIRoute } from 'astro';
import { trackView } from '@lib/appwrite-server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let data: { articleId?: string; section?: string; referrer?: string; device?: string } = {};
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }

  const articleId = String(data?.articleId ?? '').trim();
  if (!articleId) {
    return new Response(JSON.stringify({ ok: false, message: 'Missing articleId' }), { status: 422 });
  }

  // Fire-and-forget: render the article even if tracking lags.
  await trackView({
    articleId,
    section: data.section ?? null,
    referrer: data.referrer ?? null,
    device: data.device ?? null,
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};