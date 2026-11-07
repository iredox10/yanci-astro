import { db } from '@db';
import { roles, users } from '@db/schema';
import { eq, sql } from 'drizzle-orm';
import { hasRole, type SessionUser } from '@lib/auth';
import { randomUUID } from 'node:crypto';

/**
 * Typed permission catalog and CRUD for the `roles` collection. Permission
 * keys mirror the legacy admin app (`yanci/src/hooks/usePermissions.js`);
 * permissions are persisted in PostgreSQL.
 * The superadmin system role can never be edited or deleted from here.
 */

export const PERMISSION_GROUPS = [
  {
    group: 'Content',
    permissions: [
      'read_articles',
      'create_articles',
      'edit_own_articles',
      'publish_articles',
      'edit_others_articles',
      'delete_articles',
      'manage_categories',
    ],
  },
  { group: 'Media', permissions: ['manage_media'] },
  { group: 'Community', permissions: ['manage_comments'] },
  {
    group: 'Administration',
    permissions: ['manage_users', 'manage_roles', 'manage_settings'],
  },
  { group: 'Marketing', permissions: ['manage_newsletter'] },
  { group: 'Analytics', permissions: ['view_analytics', 'manage_analytics'] },
  { group: 'Data', permissions: ['export_data'] },
  {
    group: 'Special',
    permissions: [
      'manage_elections',
      'manage_live_blog',
      'manage_highlights',
      'manage_sports',
      'manage_layout',
      'manage_seo',
      'manage_notifications',
    ],
  },
] as const;

export type PermissionGroup = (typeof PERMISSION_GROUPS)[number]['group'];

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]['permissions'][number];

export const ALL_PERMISSIONS: readonly PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (g) => g.permissions,
);

const KNOWN_PERMISSIONS = new Set<string>(ALL_PERMISSIONS);

export function isPermissionKey(value: string): value is PermissionKey {
  return KNOWN_PERMISSIONS.has(value);
}

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  read_articles: 'Read articles',
  create_articles: 'Create articles',
  edit_own_articles: 'Edit own articles',
  publish_articles: 'Publish articles',
  edit_others_articles: "Edit others' articles",
  delete_articles: 'Delete articles',
  manage_categories: 'Manage categories',
  manage_media: 'Manage media library',
  manage_comments: 'Manage comments',
  manage_users: 'Manage users',
  manage_roles: 'Manage roles & permissions',
  manage_settings: 'Manage site settings',
  manage_newsletter: 'Manage newsletter',
  view_analytics: 'View analytics',
  manage_analytics: 'Manage analytics',
  export_data: 'Export data',
  manage_elections: 'Manage elections',
  manage_live_blog: 'Manage live blog',
  manage_highlights: 'Manage highlights',
  manage_sports: 'Manage sports',
  manage_layout: 'Manage homepage layout',
  manage_seo: 'Manage SEO',
  manage_notifications: 'Manage notifications',
};

/** Built-in role defaults carried over from the legacy permission hook. */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Readonly<Record<PermissionKey, boolean>>> = {
  super_admin: Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true])) as Record<PermissionKey, boolean>,
  managing_editor: {
    read_articles: true, create_articles: true, edit_own_articles: true, publish_articles: true,
    edit_others_articles: true, delete_articles: true, manage_categories: true,
    manage_media: true, manage_comments: true, manage_users: false, manage_roles: false,
    manage_settings: false, manage_newsletter: true, manage_analytics: false,
    manage_elections: true, manage_live_blog: true, manage_highlights: true,
    manage_sports: true, manage_layout: false, manage_seo: true,
    manage_notifications: true, view_analytics: true, export_data: true,
  },
  editor: {
    read_articles: true, create_articles: true, edit_own_articles: true, publish_articles: true,
    edit_others_articles: false, delete_articles: false, manage_categories: true,
    manage_media: true, manage_comments: false, manage_users: false, manage_roles: false,
    manage_settings: false, manage_newsletter: false, manage_analytics: false,
    manage_elections: false, manage_live_blog: true, manage_highlights: false,
    manage_sports: false, manage_layout: false, manage_seo: false,
    manage_notifications: false, view_analytics: true, export_data: false,
  },
  author: {
    read_articles: true, create_articles: true, edit_own_articles: true, publish_articles: true,
    edit_others_articles: false, delete_articles: false, manage_categories: false,
    manage_media: true, manage_comments: false, manage_users: false, manage_roles: false,
    manage_settings: false, manage_newsletter: false, manage_analytics: false,
    manage_elections: false, manage_live_blog: false, manage_highlights: false,
    manage_sports: false, manage_layout: false, manage_seo: false,
    manage_notifications: false, view_analytics: false, export_data: false,
  },
  contributor: {
    read_articles: true, create_articles: true, edit_own_articles: true, publish_articles: false,
    edit_others_articles: false, delete_articles: false, manage_categories: false,
    manage_media: false, manage_comments: false, manage_users: false, manage_roles: false,
    manage_settings: false, manage_newsletter: false, manage_analytics: false,
    manage_elections: false, manage_live_blog: false, manage_highlights: false,
    manage_sports: false, manage_layout: false, manage_seo: false,
    manage_notifications: false, view_analytics: false, export_data: false,
  },
};

/**
 * Access guard for the roles API.
 */
export function canManageRoles(user: SessionUser): boolean {
  if (hasRole(user, 'admin')) return true;
  const perms = DEFAULT_ROLE_PERMISSIONS[user.role];
  return Boolean(perms?.manage_roles || perms?.manage_users);
}

export interface RoleDoc {
  $id: string;
  name: string;
  slug: string;
  description: string;
  permissions: PermissionKey[];
  priority: number;
  isSystem: boolean;
  $createdAt: string;
}

export interface RoleView extends RoleDoc {
  members: number;
  locked: boolean;
}

export interface RoleInput {
  name?: string;
  slug?: string;
  description?: string;
  permissions?: PermissionKey[];
  priority?: number;
  is_system?: boolean;
}

type MutationFailure =
  | 'unconfigured'
  | 'duplicate'
  | 'superadmin'
  | 'system'
  | 'notfound'
  | 'failed';

export type CreateResult = { ok: true; role: RoleDoc } | { ok: false; reason: MutationFailure };
export type UpdateResult = { ok: true; role: RoleDoc } | { ok: false; reason: MutationFailure };
export type DeleteResult = { ok: true } | { ok: false; reason: MutationFailure };

const SUPERADMIN_KEYS = new Set(['super_admin', 'superadmin', 'super admin']);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

/** Accepts a JSON string, map, or array; returns catalog-valid unique keys. */
export function normalizePermissions(raw: unknown): PermissionKey[] {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const found = new Set<string>();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') found.add(item.trim());
    }
  } else if (value && typeof value === 'object') {
    for (const [key, on] of Object.entries(value as Record<string, unknown>)) {
      if (on === true) found.add(key.trim());
    }
  }
  return ALL_PERMISSIONS.filter((p) => found.has(p));
}

export function permissionsToJson(perms: PermissionKey[]): string {
  return JSON.stringify(Object.fromEntries(perms.map((p) => [p, true])));
}

export function isSuperadminRole(doc: Pick<RoleDoc, 'slug' | 'name' | 'isSystem'>): boolean {
  return SUPERADMIN_KEYS.has(doc.slug.toLowerCase()) || SUPERADMIN_KEYS.has(doc.name.trim().toLowerCase());
}

export async function countRoleMembers(): Promise<Record<string, number>> {
  if (!db) return {};
  try {
    const rows = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .groupBy(users.role);
    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (row.role) counts[row.role.toLowerCase()] = row.count;
    }
    return counts;
  } catch (error) {
    console.error('[roles] count failed', error);
    return {};
  }
}

export function membersForRole(counts: Record<string, number>, doc: Pick<RoleDoc, 'slug' | 'name'>): number {
  const candidates = [doc.slug, slugify(doc.name), doc.name.trim().toLowerCase().replace(/\s+/g, '_')];
  return Math.max(...candidates.map((k) => counts[k.toLowerCase()] ?? 0), 0);
}

export function toRoleView(doc: RoleDoc, counts: Record<string, number>): RoleView {
  return {
    ...doc,
    members: membersForRole(counts, doc),
    locked: doc.isSystem || isSuperadminRole(doc),
  };
}

export async function listRoles(): Promise<RoleDoc[]> {
  if (!db) return [];
  try {
    const rows = await db.select().from(roles);
    return rows.map((r) => ({
      $id: r.id,
      name: r.name,
      slug: slugify(r.id || r.name),
      description: r.description ?? '',
      permissions: normalizePermissions(r.permissions),
      priority: 0,
      isSystem: isSuperadminRole({ slug: r.id, name: r.name, isSystem: false }) || ['super_admin', 'editor', 'author', 'contributor', 'reader'].includes(r.id),
      $createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('[roles] list failed', error);
    return [];
  }
}

export async function getRole(id: string): Promise<RoleDoc | null> {
  if (!db) return null;
  try {
    const [row] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!row) return null;
    return {
      $id: row.id,
      name: row.name,
      slug: slugify(row.id || row.name),
      description: row.description ?? '',
      permissions: normalizePermissions(row.permissions),
      priority: 0,
      isSystem: isSuperadminRole({ slug: row.id, name: row.name, isSystem: false }) || ['super_admin', 'editor', 'author', 'contributor', 'reader'].includes(row.id),
      $createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function createRole(input: RoleInput): Promise<CreateResult> {
  if (!db) return { ok: false, reason: 'unconfigured' };
  const slug = input.slug ?? slugify(input.name ?? '');
  const id = slug || randomUUID();
  const existing = await getRole(id);
  if (existing) return { ok: false, reason: 'duplicate' };

  try {
    const perms = input.permissions ?? [];
    const [created] = await db.insert(roles).values({
      id,
      name: input.name ?? slug,
      description: input.description ?? '',
      permissions: perms,
    }).returning();

    return {
      ok: true,
      role: {
        $id: created.id,
        name: created.name,
        slug: slugify(created.id),
        description: created.description ?? '',
        permissions: normalizePermissions(created.permissions),
        priority: 0,
        isSystem: false,
        $createdAt: created.createdAt ? created.createdAt.toISOString() : new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[roles] create failed', error);
    return { ok: false, reason: 'failed' };
  }
}

export async function updateRole(id: string, input: RoleInput): Promise<UpdateResult> {
  if (!db) return { ok: false, reason: 'unconfigured' };
  const current = await getRole(id);
  if (!current) return { ok: false, reason: 'notfound' };
  if (isSuperadminRole(current)) return { ok: false, reason: 'superadmin' };

  try {
    const updateData: Partial<typeof roles.$inferInsert> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.permissions !== undefined) updateData.permissions = input.permissions;

    const [updated] = await db
      .update(roles)
      .set(updateData)
      .where(eq(roles.id, id))
      .returning();

    return {
      ok: true,
      role: {
        $id: updated.id,
        name: updated.name,
        slug: slugify(updated.id),
        description: updated.description ?? '',
        permissions: normalizePermissions(updated.permissions),
        priority: 0,
        isSystem: current.isSystem,
        $createdAt: updated.createdAt ? updated.createdAt.toISOString() : new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[roles] update failed', error);
    return { ok: false, reason: 'failed' };
  }
}

export async function deleteRole(id: string): Promise<DeleteResult> {
  if (!db) return { ok: false, reason: 'unconfigured' };
  const current = await getRole(id);
  if (!current) return { ok: false, reason: 'notfound' };
  if (isSuperadminRole(current)) return { ok: false, reason: 'superadmin' };
  if (current.isSystem) return { ok: false, reason: 'system' };

  try {
    await db.delete(roles).where(eq(roles.id, id));
    return { ok: true };
  } catch (error) {
    console.error('[roles] delete failed', error);
    return { ok: false, reason: 'failed' };
  }
}
