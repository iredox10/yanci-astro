import type { APIRoute } from 'astro';
import { Client, Users } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import { PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT_ID } from 'astro:env/client';
import { adminCookieHeader } from '@lib/auth';
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

// Naive IP-hash rate limiting, same spirit as api/comments.
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

/**
 * Create an Appwrite email/password session without the editorial-role gate of
 * `createAdminSession` — self-registered readers get accounts, never roles
 * (the legacy register flow assigned none). Admin surfaces stay protected by
 * `requireUser`, which re-verifies roles on every request.
 */
async function createReaderSession(email: string, password: string): Promise<string | null> {
  const base = PUBLIC_APPWRITE_ENDPOINT.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/account/sessions/email`, {
      method: 'POST',
      headers: {
        'X-Appwrite-Project': PUBLIC_APPWRITE_PROJECT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    // Appwrite 1.9 only returns the token inside its session cookie.
    for (const cookie of res.headers.getSetCookie?.() ?? []) {
      const pair = cookie.split(';')[0] ?? '';
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      if (pair.slice(0, eq).trim() === `a_session_${PUBLIC_APPWRITE_PROJECT_ID}`) {
        return decodeURIComponent(pair.slice(eq + 1).trim());
      }
    }
    return null;
  } catch {
    return null;
  }
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

  if (!APPWRITE_API_KEY || !PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT_ID) {
    return json({ ok: false, message: 'Rajista ba ta nan a yanzu' }, 503);
  }

  try {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    // Duplicate emails answer identically to every other failure path so the
    // endpoint cannot be used to enumerate registered addresses.
    try {
      const users = new Users(client);
      await users.create({ userId: 'unique()', email, password, name });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (!/already|exists|unique/i.test(msg)) throw error;
    }
  } catch (error) {
    console.error('[register] account creation failed', error);
    return json({ ok: false, message: 'Rajista ta kasa — gwada sake' }, 500);
  }

  // Auto-login on success, same cookie contract as POST /api/auth/login.
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  const token = await createReaderSession(email, password);
  if (token) headers['Set-Cookie'] = adminCookieHeader(token, SESSION_TTL);
  return json({ ok: true }, 201, headers);
};
