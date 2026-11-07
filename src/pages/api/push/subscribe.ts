import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, pushSubscriptions } from '@/db';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

interface PushSubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function isBase64Url(value: unknown, max: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= max &&
    /^[A-Za-z0-9\-_+/=]+$/.test(value)
  );
}

function isPushSubscriptionBody(body: unknown): body is PushSubscriptionBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.endpoint !== 'string') return false;
  if (!/^https:\/\/\S+$/.test(b.endpoint) || b.endpoint.length > 2048) return false;
  if (!b.keys || typeof b.keys !== 'object') return false;
  const keys = b.keys as Record<string, unknown>;
  return isBase64Url(keys.p256dh, 256) && isBase64Url(keys.auth, 128);
}

const _recent = new Map<string, number[]>();
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, hits] of _recent) {
    const alive = hits.filter((t) => t >= cutoff);
    if (alive.length === 0) _recent.delete(k);
    else _recent.set(k, alive);
  }
}, 300_000).unref();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - 60_000;
  const hits = (_recent.get(ip) ?? []).filter((t) => t >= cutoff);
  if (hits.length >= 5) return true;
  hits.push(now);
  _recent.set(ip, hits);
  return false;
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  if (!isPushSubscriptionBody(body)) {
    return json({ ok: false, message: 'Invalid subscription' }, 422);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) {
    return json({ ok: false, message: 'A hankali — a sake gwadawa nan gaba' }, 429);
  }

  try {
    const [existing] = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, body.endpoint))
      .limit(1);

    if (existing) {
      await db
        .update(pushSubscriptions)
        .set({
          keys: body.keys,
          subscribedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existing.id));
    } else {
      const id = `ps_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      await db.insert(pushSubscriptions).values({
        id,
        endpoint: body.endpoint,
        keys: body.keys,
      });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[push] subscribe failed', error);
    return json({ ok: false, message: 'An kasa aikawa' }, 503);
  }
};
