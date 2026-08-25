import type { APIRoute } from 'astro';
import { requireUser } from '@lib/auth';
import { sanitizePlainText } from '@lib/sanitize';
import {
  canManageRoles,
  countRoleMembers,
  createRole,
  isPermissionKey,
  listRoles,
  normalizePermissions,
  slugify,
  toRoleView,
  type RoleInput,
} from '@lib/roles';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!canManageRoles(auth.user)) return json({ ok: false, message: 'Forbidden' }, 403);

  const [roles, counts] = await Promise.all([listRoles(), countRoleMembers()]);
  return json({ ok: true, roles: roles.map((r) => toRoleView(r, counts)) });
};

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireUser(request);
  if (!auth.ok) return json({ ok: false, message: 'Unauthorized' }, auth.status);
  if (!canManageRoles(auth.user)) return json({ ok: false, message: 'Forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const name = sanitizePlainText(String(body.name ?? ''), 80);
  if (!name) return json({ ok: false, message: 'Role name is required' }, 422);

  const slug = slugify(sanitizePlainText(String(body.slug ?? ''), 60)) || slugify(name);
  const description = sanitizePlainText(String(body.description ?? ''), 300);
  const priorityRaw = Number(body.priority);
  const priority = Number.isFinite(priorityRaw) ? Math.max(0, Math.min(100, priorityRaw)) : 0;

  const permissions = normalizePermissions(body.permissions);
  const requested = Array.isArray(body.permissions)
    ? body.permissions.map(String)
    : Object.keys((body.permissions as Record<string, unknown>) ?? {});
  const unknown = [...new Set(requested)].filter((key) => !isPermissionKey(key));
  if (unknown.length > 0) {
    return json({ ok: false, message: `Unknown permissions: ${unknown.join(', ')}` }, 422);
  }

  const input: RoleInput = { name, slug, description, permissions, priority };
  const result = await createRole(input);
  if (!result.ok) {
    if (result.reason === 'duplicate') {
      return json({ ok: false, message: 'A role with this name already exists' }, 409);
    }
    return json({ ok: false, message: 'Create failed' }, 503);
  }

  const counts = await countRoleMembers();
  return json({ ok: true, id: result.role.$id, role: toRoleView(result.role, counts) }, 201);
};
