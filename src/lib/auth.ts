import { Client, Account, Databases, Query } from 'node-appwrite';
import { APPWRITE_COLLECTION_ROLES } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';

/**
 * Server-side session verification. The legacy app trusted client-side auth
 * state ("anyone logged in is an editor"); here every admin call re-verifies
 * the session with Appwrite and re-reads the role from the `roles` collection
 * (falling back to verified server-side user labels).
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** `super_admin` has the most access; unknown roles are denied, never "editor". */
const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 4,
  managing_editor: 3,
  editor: 2,
  author: 1,
  contributor: 0,
};

const PREFERRED_ROLES = ['super_admin', 'managing_editor', 'editor', 'author', 'contributor'];

function parseCookies(request: Request): Map<string, string> {
  const map = new Map<string, string>();
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    let value = part.slice(eq + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      /* leave as-is */
    }
    map.set(key, value);
  }
  return map;
}

/** Pull a session JWT out of the request: Authorization header or Appwrite cookie. */
export async function sessionTokenFrom(request: Request): Promise<string | null> {
  const auth = request.headers.get('authorization') ?? '';
  const [scheme, ...rest] = auth.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && rest.length) {
    const token = rest.join(' ').trim();
    if (token.split('.').length === 3) return token;
  }

  const cookies = parseCookies(request);

  // Admin console cookie (HttpOnly, set by POST /api/auth/login).
  const admin = cookies.get(ADMIN_COOKIE);
  if (admin && admin.split('.').length === 3) return admin;

  const project = PUBLIC_APPWRITE_PROJECT_ID;
  if (!project) return null;
  for (const key of [`a_session_${project}`, `a_session_${project}_legacy`]) {
    const value = cookies.get(key);
    if (!value) continue;
    const token = value.startsWith('{') ? null : value;
    if (token && token.split('.').length === 3) return token;
    // JSON cookie format: attempt to recover the `jwt` field.
    try {
      const parsed = JSON.parse(value);
      const jwt = parsed?.jwt ?? parsed?.token ?? null;
      if (jwt && jwt.split('.').length === 3) return String(jwt);
    } catch {
      /* not JSON */
    }
  }
  return null;
}

export const ADMIN_COOKIE = 'yc_session';

export function adminCookieHeader(token: string, maxAgeSeconds: number, reset = false): string {
  const secure = import.meta.env?.PROD ? '; Secure' : '';
  return [
    `${ADMIN_COOKIE}=${reset ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure,
    reset ? 'Max-Age=0' : `Max-Age=${maxAgeSeconds}`,
  ]
    .filter(Boolean)
    .join('; ');
}

/** Create an Appwrite email/password session server-side and return its JWT. */
export async function createAdminSession(
  email: string,
  password: string,
): Promise<{ token: string; user: SessionUser } | { ok: false; status: number }> {
  if (!PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT_ID) {
    return { ok: false, status: 503 };
  }
  try {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID);
    const session = await new Account(client).createEmailPasswordSession(email.trim(), password);
    const token = session.secret;
    const verified = await verifySession(token);
    if (!verified) return { ok: false, status: 403 };
    const role = await roleForUser(verified.id) ?? (await roleFromLabels(getLabels(verified)));
    if (!role || ROLE_PRIORITY[role] === undefined) return { ok: false, status: 403 };
    return { token, user: { ...verified, role } };
  } catch {
    return { ok: false, status: 401 };
  }
}

export async function verifySession(
  token: string,
): Promise<Omit<SessionUser, 'role'> | null> {
  if (!PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT_ID) return null;
  try {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setSession(token);
    const session = await new Account(client).get();
    return {
      id: session.$id,
      name: session.name,
      email: session.email,
    };
  } catch {
    return null;
  }
}

export async function roleForUser(userId: string): Promise<string | null> {
  if (!PUBLIC_APPWRITE_DATABASE_ID || !APPWRITE_COLLECTION_ROLES) return null;
  try {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID);
    const roles = await new Databases(client).listDocuments({
      databaseId: PUBLIC_APPWRITE_DATABASE_ID,
      collectionId: APPWRITE_COLLECTION_ROLES,
      queries: [
        Query.or([Query.equal('userId', userId), Query.equal('user_id', userId)]),
        Query.limit(1),
      ],
    });
    const first = roles?.documents?.[0];
    const role = String(first?.role ?? '');
    return ROLE_PRIORITY[role] !== undefined ? role : null;
  } catch {
    return null;
  }
}

function getLabels(session: { id: string; name: string; email: string }): string[] {
  return (session as unknown as { labels?: string[] }).labels ?? [];
}

export async function roleFromLabels(labels: string[] | undefined): Promise<string | null> {
  if (!labels) return null;
  const set = new Set(labels.map((l) => l.trim().toLowerCase()));
  if (set.has('super_admin')) return 'super_admin';
  for (const candidate of PREFERRED_ROLES) {
    if (set.has(candidate)) return candidate;
  }
  return null;
}

export async function requireUser(request: Request): Promise<{ ok: true; user: SessionUser } | { ok: false; status: number }> {
  const token = await sessionTokenFrom(request);
  if (!token) return { ok: false, status: 401 };
  const session = await verifySession(token);
  if (!session) return { ok: false, status: 401 };

  // Roles come from either the `roles` collection assignment (if it exists for
  // the user) or, as in the legacy app, from server-side user labels.
  const custom = await roleForUser(session.id);
  const role = custom ?? (await roleFromLabels(getLabels(session)));
  if (!role || ROLE_PRIORITY[role] === undefined) return { ok: false, status: 403 };

  return { ok: true, user: { ...session, role } };
}

/** True when the authenticated user has at least `minRole` (or is admin). */
export function hasRole(user: SessionUser, minRole: string): boolean {
  return (ROLE_PRIORITY[user.role] ?? -1) >= (ROLE_PRIORITY[minRole] ?? Infinity);
}

export const ROLE_LABELS: Record<string, string> = {
  contributor: 'Contributor',
  author: 'Author',
  editor: 'Editor',
  managing_editor: 'Managing Editor',
  super_admin: 'Super Admin',
};

export function roleName(role: string): string {
  return ROLE_LABELS[role] ?? role;
}