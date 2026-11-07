import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
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
  const secret = process.env.SESSION_SECRET || 'yanci-default-session-secret-change-in-production';

  try {
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      const token = signResetToken(email, secret);
      const base = String(process.env.PUBLIC_SITE_URL || 'https://yanci.ng').replace(/\/$/, '');
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

  return json({ ok: true, message: 'Idan akwai wannan asusu, an aika hanyar sake saitin kalmar shiga.' });
};
