import type { APIRoute } from 'astro';
import { Client, Users, Query } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_SITE_URL,
} from 'astro:env/client';
import { getSettings } from '@lib/appwrite-server';
import { sendMail } from '@lib/mailer';
import { signResetToken } from '@lib/reset-token';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const _recent = new Map<string, number>();
function rateLimited(key: string, windowMs: number): boolean {
  const now = Date.now();
  const last = _recent.get(key);
  if (last && now - last < windowMs) return true;
  _recent.set(key, now);
  return false;
}
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [k, t] of _recent) if (t < cutoff) _recent.delete(k);
}, 600_000).unref();

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email) return json({ ok: false, message: 'Email required' }, 422);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(`recovery|ip|${ip}`, 60_000)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }
  if (rateLimited(`recovery|email|${email}`, 15 * 60_000)) {
    return json({ ok: false, message: 'An riga an aika — ka duba imel ɗinka' }, 429);
  }

  // Always report success: do not leak which emails have accounts.
  const settings = await getSettings();
  const secret = APPWRITE_API_KEY ?? '';
  if (secret && PUBLIC_APPWRITE_ENDPOINT && PUBLIC_APPWRITE_PROJECT_ID) {
    try {
      const client = new Client()
        .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
        .setProject(PUBLIC_APPWRITE_PROJECT_ID)
        .setKey(secret);
      const usersApi = new Users(client);
      const { users } = await usersApi.list([Query.equal('email', email), Query.limit(1)]);
      const user = users?.[0];
      if (user) {
        const token = signResetToken(email, secret);
        const base = String(PUBLIC_SITE_URL || 'https://yanci.ng').replace(/\/$/, '');
        const link = `${base}/admin/reset-password?token=${encodeURIComponent(token)}`;
        const siteName = settings.site_name || 'Yanci';
        await sendMail(settings, {
          to: email,
          subject: `${siteName} — Sake saita kalmar shiga`,
          text: `Ana iya sake saita kalmar shiga ta wannan hanyar (yana aiki na mintuna 30):\n${link}\n\nIdan ba kai ba ne, ka yi watsi da wannan sakon.`,
          html: `<p>Ana iya sake saita kalmar shiga ta wannan hanyar (yana aiki na mintuna 30):</p><p><a href="${link}">Sake saita kalmar shiga</a></p><p>Idan ba kai ba ne, ka yi watsi da wannan sakon.</p>`,
        });
      }
    } catch (error) {
      console.error('[auth] recovery failed', error);
    }
  }

  return json({ ok: true, message: 'Idan akwai wannan asusu, an aika hanyar sake saitin kalmar shiga.' });
};