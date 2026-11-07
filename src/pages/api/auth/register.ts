import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
import { adminCookieHeader, createSession, hashPassword } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';

export const prerender = false;

const SESSION_TTL = 60 * 60 * 12;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 256;
const MAX_ATTEMPTS = 5;
const RATE_WINDOW_MS = 60 * 60_000;

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const _attempts = new Map<string, number[]>();
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [k, times] of _attempts) {
    const live = times.filter((t) => t > cutoff);
    if (live.length === 0) _attempts.delete(k);
    else _attempts.set(k, live);
  }
}, 300_000).unref();

function hashIp(ip: string): string {
  let h = 5381;
  for (let i = 0; i < ip.length; i++) h = ((h << 5) + h + ip.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function rateLimited(ip: string): boolean {
  const key = hashIp(ip);
  const now = Date.now();
  const recent = (_attempts.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    _attempts.set(key, recent);
    return true;
  }
  recent.push(now);
  _attempts.set(key, recent);
  return false;
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const name = sanitizePlainText(String(body.name ?? ''), 120);
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!name) return json({ ok: false, message: 'Da sunanka' }, 422);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, message: 'Imel ba daidai ba ne' }, 422);
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return json({ ok: false, message: 'Kalmar sirri dole ta kasance haruffa 8 ko fiye' }, 422);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa bayan dan lokaci' }, 429);
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      // Don't leak user existence, return friendly message
      return json({ ok: true }, 201);
    }

    const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      email,
      name,
      passwordHash,
      role: 'reader',
      active: true,
    });
  } catch (error) {
    console.error('[register] account creation failed', error);
    return json({ ok: false, message: 'Rajista ta kasa — gwada sake' }, 500);
  }

  // Auto-login on success
  const sessionResult = await createSession(email, password, request);
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };

  if ('token' in sessionResult) {
    headers['Set-Cookie'] = adminCookieHeader(sessionResult.token, SESSION_TTL);
  }

  return json({ ok: true }, 201, headers);
};
