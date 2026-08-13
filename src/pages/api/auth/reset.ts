import type { APIRoute } from 'astro';
import { Client, Users, Query } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import { PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT_ID } from 'astro:env/client';
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

  const secret = APPWRITE_API_KEY ?? '';
  if (!secret || !PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT_ID) {
    return json({ ok: false, message: 'Reset unavailable' }, 503);
  }

  const email = verifyResetToken(token, secret);
  if (!email) {
    return json({ ok: false, message: 'Hanyar ta ƙare ko kuma ba daidai ba — ka sake nema' }, 400);
  }

  try {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(secret);
    const usersApi = new Users(client);
    const { users } = await usersApi.list([Query.equal('email', email), Query.limit(1)]);
    const user = users?.[0];
    if (!user) return json({ ok: false, message: 'Babu wannan asusu' }, 404);
    await usersApi.updatePassword(user.$id, password);
    return json({ ok: true });
  } catch (error) {
    console.error('[auth] reset failed', error);
    return json({ ok: false, message: 'An kasa canza kalmar shiga' }, 503);
  }
};