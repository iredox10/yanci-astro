import type { APIRoute } from 'astro';
import { Client, Account } from 'node-appwrite';
import { PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT_ID } from 'astro:env/client';
import { clearSessionCache, sessionTokenFrom, adminCookieHeader } from '@lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = await sessionTokenFrom(request);
  if (token) clearSessionCache(token);
  if (token && PUBLIC_APPWRITE_ENDPOINT && PUBLIC_APPWRITE_PROJECT_ID) {
    try {
      const client = new Client()
        .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
        .setProject(PUBLIC_APPWRITE_PROJECT_ID)
        .setSession(token);
      await new Account(client).deleteSession({ sessionId: 'current' });
    } catch {
      /* session already gone */
    }
  }
  const cookie = adminCookieHeader('', 0, true);
  const acceptsHtml = (request.headers.get('accept') ?? '').includes('text/html');
  const isDocumentPost = request.headers.get('sec-fetch-dest') === 'document';

  if (acceptsHtml || isDocumentPost) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/admin/login',
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
