import type { APIRoute } from 'astro';
import { requireUser, roleName } from '@lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ ok: false, message: 'Unauthorized' }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  return new Response(
    JSON.stringify({
      ok: true,
      user: { ...auth.user, roleLabel: roleName(auth.user.role) },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    },
  );
};
