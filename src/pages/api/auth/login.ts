import type { APIRoute } from 'astro';
import { createAdminSession, adminCookieHeader } from '@lib/auth';

export const prerender = false;

const SESSION_TTL = 60 * 60 * 12;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, message: 'Bad JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  if (!email || !password) {
    return new Response(JSON.stringify({ ok: false, message: 'Email and password required' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await createAdminSession(email, password);
  if (!('token' in result)) {
    const message =
      result.status === 403
        ? 'Account has no editorial role'
        : result.status === 503
          ? 'Login unavailable'
          : 'Invalid credentials';
    return new Response(JSON.stringify({ ok: false, message }), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, user: result.user }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': adminCookieHeader(result.token, SESSION_TTL),
    },
  });
};
