import type { APIRoute } from 'astro';
import { subscribeNewsletter } from '../../lib/appwrite-server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let email = '';
  try {
    const json = await request.json();
    email = String(json?.email ?? '').trim();
  } catch {
    return new Response(JSON.stringify({ ok: false, message: 'Bad JSON' }), { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, message: 'Invalid email' }), { status: 422 });
  }

  try {
    const ok = await subscribeNewsletter(email);
    if (!ok) {
      return new Response(JSON.stringify({ ok: false, message: 'Subscription unavailable' }), {
        status: 503,
      });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, message: 'Server error' }), { status: 500 });
  }
};