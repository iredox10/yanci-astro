import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db, users, invitations } from '@/db';
import { hashPassword } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const token = sanitizePlainText(String(body.token ?? ''), 128);
  const password = String(body.password ?? '');
  const name = sanitizePlainText(String(body.name ?? ''), 120);

  if (!token || password.length < 8) {
    return json({ ok: false, message: 'Password must be at least 8 characters' }, 422);
  }

  try {
    const [invite] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.token, token), eq(invitations.accepted, false)))
      .limit(1);

    if (!invite) {
      return json({ ok: false, message: 'Invitation not found or already used' }, 404);
    }
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return json({ ok: false, message: 'Invitation expired' }, 410);
    }

    const email = invite.email.trim().toLowerCase();
    const role = invite.role || 'contributor';
    const displayName = name || email.split('@')[0];

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return json({ ok: false, message: 'An account with this email already exists' }, 409);
    }

    const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      email,
      name: displayName,
      passwordHash,
      role,
      active: true,
    });

    await db
      .update(invitations)
      .set({ accepted: true })
      .where(eq(invitations.id, invite.id));

    return json({ ok: true, message: 'Account created — you can now sign in.' }, 201);
  } catch (error) {
    console.error('[invite] accept failed', error);
    return json({ ok: false, message: 'Could not create account — try again' }, 500);
  }
};
