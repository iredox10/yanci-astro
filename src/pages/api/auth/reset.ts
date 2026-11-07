import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
import { hashPassword } from '@lib/auth';
import { verifyResetToken } from '@lib/reset-token';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const token = String(body.token ?? '');
  const password = String(body.password ?? '');
  if (!token || !password) return json({ ok: false, message: 'Missing token or password' }, 422);
  if (password.length < 8) {
    return json({ ok: false, message: 'Kalmar shiga ta fi gajarta (a kalla haruffa 8)' }, 422);
  }

  const secret = process.env.SESSION_SECRET || 'yanci-default-session-secret-change-in-production';
  const email = verifyResetToken(token, secret);
  if (!email) {
    return json({ ok: false, message: 'Hanyar ta ƙare ko kuma ba daidai ba — ka sake nema' }, 400);
  }

  try {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) return json({ ok: false, message: 'Babu wannan asusu' }, 404);

    const passwordHash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return json({ ok: true });
  } catch (error) {
    console.error('[auth] reset failed', error);
    return json({ ok: false, message: 'An kasa canza kalmar shiga' }, 503);
  }
};
