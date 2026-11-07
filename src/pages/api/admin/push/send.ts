import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { requireUser, hasRole } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';
import { SECTIONS } from '@/data/sections';
import { db, notificationsOutbox } from '@/db';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const AUDIENCES = new Set(['all', ...SECTIONS.map((s) => s.slug)]);

interface SendPayload {
  title: string;
  body: string;
  url: string;
  audience: string;
}

function isRelativeOrHttpsUrl(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return value.length <= 2048;
  return /^https:\/\/\S+$/.test(value) && value.length <= 2048;
}

function parseSendPayload(raw: unknown): SendPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const title = typeof b.title === 'string' ? sanitizePlainText(b.title, 80).trim() : '';
  const body = typeof b.body === 'string' ? sanitizePlainText(b.body, 200).trim() : '';
  if (!title || !body) return null;
  const url = typeof b.url === 'string' && b.url.trim() ? b.url.trim() : '/';
  if (!isRelativeOrHttpsUrl(url)) return null;
  const audience = typeof b.audience === 'string' && AUDIENCES.has(b.audience) ? b.audience : 'all';
  return { title, body, url, audience };
}

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!hasRole(auth.user, 'editor')) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const payload = parseSendPayload(body);
  if (!payload) {
    return json({ ok: false, message: 'Dole ne a ba da take, bayani da adireshin labari daidai' }, 422);
  }

  const id = `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  try {
    await db.insert(notificationsOutbox).values({
      id,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      audience: payload.audience,
      sentCount: 0,
    });
    return json({ ok: true, id }, 202);
  } catch (error) {
    console.error('[push] enqueue failed', error);
    return json({ ok: false, message: 'An kasa aikawa' }, 503);
  }
};
