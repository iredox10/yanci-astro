import type { APIRoute } from 'astro';
import { subscribeNewsletter, unsubscribeNewsletter } from '../../lib/appwrite-server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let email = '';
  let action = 'subscribe';
  try {
    const json = await request.json();
    email = String(json?.email ?? '').trim();
    action = String(json?.action ?? 'subscribe');
  } catch {
    return new Response(JSON.stringify({ ok: false, message: 'Bad JSON' }), { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, message: 'Invalid email' }), { status: 422 });
  }

  try {
    const ok = action === 'unsubscribe' ? await unsubscribeNewsletter(email) : await subscribeNewsletter(email);
    if (!ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: action === 'unsubscribe' ? 'Not subscribed' : 'Subscription unavailable',
        }),
        { status: action === 'unsubscribe' ? 404 : 503 },
      );
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, message: 'Server error' }), { status: 500 });
  }
};