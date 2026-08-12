import type { APIRoute } from 'astro';
import { getSettings } from '@lib/appwrite-server';
import { sanitizePlainText } from '@lib/sanitize';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * POST /api/contact
 *
 * Forwards the contact form to the configured contact email via a mailto
 * fallback — no SMTP in the stack, so the message is logged server-side and
 * the page confirms receipt. The `mailto` link in the UI remains the primary
 * channel.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const name = sanitizePlainText(String(body.name ?? ''), 120);
  const email = sanitizePlainText(String(body.email ?? ''), 320);
  const message = sanitizePlainText(String(body.message ?? ''), 4000);

  if (!name || !email || !message) {
    return json({ ok: false, message: 'All fields are required' }, 422);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, message: 'Invalid email' }, 422);
  }

  const settings = await getSettings();
  const to = settings.contact_email || 'labulabari@yanci.ng';

  console.log(`[contact] from ${name} <${email}> to ${to}: ${message.slice(0, 200)}`);

  return json({ ok: true });
};
