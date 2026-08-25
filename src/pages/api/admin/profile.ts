import type { APIRoute } from 'astro';
import { Account, Client, Users } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import { PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT_ID } from 'astro:env/client';
import { createAdminSession, requireUser } from '@lib/auth';

export const prerender = false;

const NAME_MAX = 64;
const PASSWORD_MIN = 8;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function usersApi(): Users | null {
  if (!APPWRITE_API_KEY || !PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT_ID) return null;
  return new Users(
    new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY),
  );
}

/**
 * Self-service profile updates for the signed-in admin. Identity comes only
 * from the re-verified session cookie — nothing in the body can target
 * another account.
 */
async function handler({ request }: { request: Request }): Promise<Response> {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const api = usersApi();
  if (!api) return json({ ok: false, message: 'Profile service unavailable' }, 503);

  if (String(body.action ?? '') === 'password') {
    const currentPassword = String(body.currentPassword ?? '');
    const newPassword = String(body.newPassword ?? '');
    const confirmPassword =
      body.confirmPassword === undefined ? newPassword : String(body.confirmPassword);

    if (!currentPassword || !newPassword) {
      return json({ ok: false, message: 'Cika duk filayen kalmar sirri' }, 422);
    }
    if (newPassword.length < PASSWORD_MIN) {
      return json({ ok: false, message: 'Kalmar sirri ta fi gajarta (a kalla haruffa 8)' }, 422);
    }
    if (newPassword !== confirmPassword) {
      return json({ ok: false, message: 'Sababbin kalmomin sirri ba su dace ba' }, 422);
    }

    // Verify the current password by opening a throwaway Appwrite session
    // before touching the stored credential.
    const attempt = await createAdminSession(auth.user.email, currentPassword);
    if ('ok' in attempt) {
      return json(
        { ok: false, message: 'Kalmar sirri ta yanzu ba daidai ba' },
        attempt.status === 503 ? 503 : 401,
      );
    }

    // Drop the throwaway session so verifications never exhaust the
    // account's active-session slots.
    try {
      const disposable = new Account(
        new Client()
          .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
          .setProject(PUBLIC_APPWRITE_PROJECT_ID)
          .setSession(attempt.token),
      );
      await disposable.deleteSession('current');
    } catch {
      /* best effort */
    }

    try {
      await api.updatePassword(auth.user.id, newPassword);
      return json({ ok: true });
    } catch (error) {
      console.error('[admin/profile] password change failed', error);
      return json({ ok: false, message: 'An kasa canza kalmar sirri' }, 503);
    }
  }

  const name = String(body.name ?? '').trim();
  if (!name) return json({ ok: false, message: 'Sunan ba zai iya komai ba' }, 422);
  if (name.length > NAME_MAX) return json({ ok: false, message: 'Sunan ya yi tsayi sosai' }, 422);

  try {
    await api.updateName(auth.user.id, name);
    return json({ ok: true, name });
  } catch (error) {
    console.error('[admin/profile] name update failed', error);
    return json({ ok: false, message: 'An kasa sabunta suna' }, 503);
  }
}

export const PATCH: APIRoute = handler;
export const POST: APIRoute = handler;
