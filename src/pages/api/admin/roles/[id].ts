import type { APIRoute } from 'astro';
import { requireUser } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';
import {
  canManageRoles,
  countRoleMembers,
  deleteRole,
  isPermissionKey,
  normalizePermissions,
  slugify,
  toRoleView,
  updateRole,
  type RoleInput,
} from '@lib/roles';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!canManageRoles(auth.user)) return json({ ok: false, message: 'Forbidden' }, 403);

  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const input: RoleInput = {};
  if (body.name !== undefined) {
    const name = sanitizePlainText(String(body.name), 80);
    if (!name) return json({ ok: false, message: 'Role name is required' }, 422);
    input.name = name;
  }
  if (body.slug !== undefined) input.slug = slugify(sanitizePlainText(String(body.slug), 60));
  if (body.description !== undefined) input.description = sanitizePlainText(String(body.description), 300);
  if (body.priority !== undefined) {
    const n = Number(body.priority);
    input.priority = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  }
  if (body.permissions !== undefined) {
    const requested = Array.isArray(body.permissions)
      ? body.permissions.map(String)
      : Object.keys((body.permissions as Record<string, unknown>) ?? {});
    const unknown = [...new Set(requested)].filter((key) => !isPermissionKey(key));
    if (unknown.length > 0) {
      return json({ ok: false, message: `Unknown permissions: ${unknown.join(', ')}` }, 422);
    }
    input.permissions = normalizePermissions(body.permissions);
  }

  const result = await updateRole(id, input);
  if (!result.ok) {
    if (result.reason === 'superadmin') {
      return json({ ok: false, message: 'The superadmin system role cannot be modified' }, 403);
    }
    if (result.reason === 'notfound') return json({ ok: false, message: 'Role not found' }, 404);
    return json({ ok: false, message: 'Update failed' }, 503);
  }

  const counts = await countRoleMembers();
  return json({ ok: true, role: toRoleView(result.role, counts) });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!canManageRoles(auth.user)) return json({ ok: false, message: 'Forbidden' }, 403);

  const id = params.id;
  if (!id) return json({ ok: false, message: 'Missing id' }, 422);

  const result = await deleteRole(id);
  if (!result.ok) {
    if (result.reason === 'superadmin') {
      return json({ ok: false, message: 'The superadmin system role cannot be deleted' }, 403);
    }
    if (result.reason === 'system') {
      return json({ ok: false, message: 'System roles cannot be deleted' }, 403);
    }
    if (result.reason === 'notfound') return json({ ok: false, message: 'Role not found' }, 404);
    return json({ ok: false, message: 'Delete failed' }, 503);
  }
  return json({ ok: true });
};
