import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { requireUser, hashPassword, verifyPassword } from '@lib/auth';
import { db, users } from '@/db';

export const prerender = false;

const NAME_MAX = 64;
const PASSWORD_MIN = 8;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

async function handler({ request }: { request: Request }): Promise<Response> {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

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

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, auth.user.id))
        .limit(1);

      if (!user) return json({ ok: false, message: 'Babu wannan asusu' }, 404);

      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return json({ ok: false, message: 'Kalmar sirri ta yanzu ba daidai ba' }, 401);
      }

      const newHash = await hashPassword(newPassword);
      await db
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, auth.user.id));

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
    await db
      .update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, auth.user.id));

    return json({ ok: true, name });
  } catch (error) {
    console.error('[admin/profile] name update failed', error);
    return json({ ok: false, message: 'An kasa sabunta suna' }, 503);
  }
}

export const PATCH: APIRoute = handler;
export const POST: APIRoute = handler;
