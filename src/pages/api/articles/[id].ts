import type { APIRoute } from 'astro';
import { getArticleById } from '@lib/appwrite-server';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/** Public JSON for the live-blog poller: full article incl. liveUpdates. */
export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  const article = await getArticleById(id);
  if (!article) return json({ ok: false, message: 'Not found' }, 404);

  return json({
    ok: true,
    article: {
      $id: article.$id,
      headline: article.headline,
      isLive: Boolean(article.isLive),
      liveUpdates: article.liveUpdates ?? [],
    },
  });
};
