import { Client, Databases, ID, Query } from 'node-appwrite';
import { APPWRITE_API_KEY, APPWRITE_COLLECTION_ROLES } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';
import { hasRole, type SessionUser } from '@lib/auth';

/**
 * Typed permission catalog and CRUD for the `roles` collection. Permission
 * keys mirror the legacy admin app (`yanci/src/hooks/usePermissions.js`);
 * permissions are persisted as a legacy-compatible JSON map `{key: true}`.
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
 * Access guard for the roles API. The existing handlers check `hasRole(user,
 * 'admin')`; this keeps that floor and additionally honours explicit
 * `manage_roles` / `manage_users` grants should custom roles appear.
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

function collectionId(): string {
  return APPWRITE_COLLECTION_ROLES || 'roles';
}

function databases(): { db: Databases; databaseId: string } | null {
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_ENDPOINT ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID
  ) {
    return null;
  }
  const client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return { db: new Databases(client), databaseId: PUBLIC_APPWRITE_DATABASE_ID };
}

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

/** Legacy storage format: a JSON object map of enabled keys. */
export function permissionsToJson(perms: PermissionKey[]): string {
  return JSON.stringify(Object.fromEntries(perms.map((p) => [p, true])));
}

export function isSuperadminRole(doc: Pick<RoleDoc, 'slug' | 'name' | 'isSystem'>): boolean {
  return SUPERADMIN_KEYS.has(doc.slug.toLowerCase()) || SUPERADMIN_KEYS.has(doc.name.trim().toLowerCase());
}

function toRoleDoc(doc: Record<string, unknown>): RoleDoc {
  return {
    $id: String(doc.$id),
    name: String(doc.name ?? ''),
    slug: String(doc.slug ?? '') || slugify(String(doc.name ?? '')),
    description: String(doc.description ?? ''),
    permissions: normalizePermissions(doc.permissions),
    priority: Number.isFinite(Number(doc.priority)) ? Number(doc.priority) : 0,
    isSystem: Boolean(doc.is_system),
    $createdAt: String(doc.$createdAt ?? ''),
  };
}

async function listRawDocs(db: Databases, databaseId: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await db.listDocuments({
      databaseId,
      collectionId: collectionId(),
      queries: [Query.limit(500)],
    });
    return res.documents as unknown as Record<string, unknown>[];
  } catch (error) {
    console.error('[roles] list failed', error);
    return [];
  }
}

/**
 * Member counts per role, derived from assignment documents in the same
 * collection (`userId`/`user_id` + `role`, the shape auth.ts reads). Keyed by
 * lower-cased role token.
 */
export async function countRoleMembers(): Promise<Record<string, number>> {
  const env = databases();
  if (!env) return {};
  const docs = await listRawDocs(env.db, env.databaseId);
  const counts: Record<string, number> = {};
  for (const doc of docs) {
    const userId = doc.userId ?? doc.user_id;
    if (!userId) continue;
    const key = String(doc.role ?? '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
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
  const env = databases();
  if (!env) return [];
  return (await listRawDocs(env.db, env.databaseId)).map(toRoleDoc).sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
}

export async function getRole(id: string): Promise<RoleDoc | null> {
  const env = databases();
  if (!env) return null;
  try {
    const doc = await env.db.getDocument(env.databaseId, collectionId(), id);
    return toRoleDoc(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

function dataFrom(input: RoleInput, perms: PermissionKey[]): Record<string, unknown> {
  const data: Record<string, unknown> = {
    description: input.description ?? '',
    permissions: permissionsToJson(perms),
    priority: Number.isFinite(input.priority) ? input.priority : 0,
  };
  if (input.name !== undefined) data.name = input.name;
  if (input.slug) data.slug = input.slug;
  if (input.is_system !== undefined) data.is_system = input.is_system;
  return data;
}

export async function createRole(input: RoleInput): Promise<CreateResult> {
  const env = databases();
  if (!env) return { ok: false, reason: 'unconfigured' };

  const slug = input.slug ?? slugify(input.name ?? '');
  const existing = await listRoles();
  if (existing.some((r) => r.slug.toLowerCase() === slug.toLowerCase())) {
    return { ok: false, reason: 'duplicate' };
  }

  try {
    const doc = await env.db.createDocument({
      databaseId: env.databaseId,
      collectionId: collectionId(),
      documentId: ID.unique(),
      data: dataFrom({ ...input, slug }, input.permissions ?? []),
      permissions: ['read("any")'],
    });
    return { ok: true, role: toRoleDoc(doc as unknown as Record<string, unknown>) };
  } catch (error) {
    console.error('[roles] create failed', error);
    return { ok: false, reason: 'failed' };
  }
}

export async function updateRole(id: string, input: RoleInput): Promise<UpdateResult> {
  const env = databases();
  if (!env) return { ok: false, reason: 'unconfigured' };
  const current = await getRole(id);
  if (!current) return { ok: false, reason: 'notfound' };
  if (isSuperadminRole(current)) return { ok: false, reason: 'superadmin' };

  try {
    const doc = await env.db.updateDocument({
      databaseId: env.databaseId,
      collectionId: collectionId(),
      documentId: id,
      data: dataFrom(input, input.permissions ?? current.permissions),
    });
    return { ok: true, role: toRoleDoc(doc as unknown as Record<string, unknown>) };
  } catch (error) {
    console.error('[roles] update failed', error);
    return { ok: false, reason: 'failed' };
  }
}

export async function deleteRole(id: string): Promise<DeleteResult> {
  const env = databases();
  if (!env) return { ok: false, reason: 'unconfigured' };
  const current = await getRole(id);
  if (!current) return { ok: false, reason: 'notfound' };
  if (isSuperadminRole(current)) return { ok: false, reason: 'superadmin' };
  if (current.isSystem) return { ok: false, reason: 'system' };

  try {
    await env.db.deleteDocument(env.databaseId, collectionId(), id);
    return { ok: true };
  } catch (error) {
    console.error('[roles] delete failed', error);
    return { ok: false, reason: 'failed' };
  }
}
