import type { APIRoute } from 'astro';
import { getSettings } from '@lib/appwrite-server';
import { sanitizePlainText } from '@lib/sanitize';
import { sendMail } from '@lib/mailer';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * POST /api/contact
 *
 * Forwards the contact form to the configured contact email. Sends via SMTP
 * when smtp_* settings are configured; otherwise logs the message server-side
 * (SMTP not configured) and confirms receipt.
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
  const siteName = settings.site_name || 'Yanci';

  const ok = await sendMail(settings, {
    to,
    subject: `[${siteName}] Sabon sako daga ${name}`,
    text: `Sunan-mai-aiko: ${name}\nImel: ${email}\n\n${message}`,
    html: `<p><strong>${name}</strong> &lt;${email}&gt;</p><p>${message.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`,
  });

  if (!ok) return json({ ok: false, message: 'Could not send message' }, 500);
  return json({ ok: true });
};
