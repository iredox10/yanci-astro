import type { APIRoute } from 'astro';
import { clearSessionCache, sessionTokenFrom, adminCookieHeader, destroySession } from '@lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = await sessionTokenFrom(request);
  if (token) {
    clearSessionCache(token);
    await destroySession(token);
  }
  const cookie = adminCookieHeader('', 0, true);
  const acceptsHtml = (request.headers.get('accept') ?? '').includes('text/html');
  const isDocumentPost = request.headers.get('sec-fetch-dest') === 'document';

  if (acceptsHtml || isDocumentPost) {
    const url = new URL(request.url);
    const redirectParam = url.searchParams.get('redirect');
    const referer = request.headers.get('referer') ?? '';
    const location = redirectParam || (referer.includes('/admin') ? '/admin/login' : '/login');
    return new Response(null, {
      status: 302,
      headers: {
        Location: location,
        'Cache-Control': 'no-store',
        'Set-Cookie': cookie,
      },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie,
    },
  });
};
