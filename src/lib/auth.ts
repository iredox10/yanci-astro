import { Client, Account, Databases, Query } from 'node-appwrite';
import { APPWRITE_COLLECTION_ROLES } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';

let _authFetchTuned = false;
async function tuneAuthFetch(): Promise<void> {
  if (_authFetchTuned) return;
  _authFetchTuned = true;
  try {
    const dns = await import('node:dns');
    dns.setDefaultResultOrder('ipv4first');
    const { Agent, setGlobalDispatcher } = await import('undici');
    setGlobalDispatcher(
      new Agent({
        connect: {
          autoSelectFamily: false,
          lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { ...options, family: 4 }, callback);
          },
          timeout: 8_000,
        },
        keepAliveTimeout: 60_000,
      }),
    );
  } catch {
    // undici unavailable — keep default fetch timeouts
  }
}
void tuneAuthFetch();

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
  labels?: string[];
}

/** `super_admin` has the most access; unknown roles are denied, never "editor". */
const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 4,
  // Legacy handlers request `admin` as the minimum role; treat it as super_admin.
  admin: 4,
  managing_editor: 3,
  editor: 2,
  author: 1,
  contributor: 0,
};

const PREFERRED_ROLES = ['super_admin', 'managing_editor', 'editor', 'author', 'contributor'];

function parseCookies(request?: Request): Map<string, string> {
  const map = new Map<string, string>();
  if (!request) return map;
  let header = '';
  try {
    header = request.headers?.get('cookie') ?? '';
  } catch {
    return map;
  }
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

/**
 * Validate a session credential: either a 3-part JWT, raw session secret, or Appwrite's base64
 * JSON session envelope `{"id":...,"secret":...}` (the legacy session token).
 */
export function isSessionToken(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (value.split('.').length === 3) return true;
  // Raw session secret token (alphanumeric/hex string, e.g. 64-256 chars)
  if (/^[A-Za-z0-9_\-\.]+$/.test(value) && value.length >= 16) return true;
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    try {
      const parsed = JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
      return typeof parsed?.id === 'string' && typeof parsed?.secret === 'string';
    } catch {
      return false;
    }
  }
  return false;
}

/** Pull a session token out of the request: Authorization header or cookie. */
export async function sessionTokenFrom(request?: Request): Promise<string | null> {
  if (!request) return null;
  let auth = '';
  try {
    auth = request.headers?.get('authorization') ?? '';
  } catch {
    return null;
  }
  const [scheme, ...rest] = auth.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && rest.length) {
    const token = rest.join(' ').trim();
    if (isSessionToken(token)) return token;
  }

  const cookies = parseCookies(request);

  // Admin console cookie (HttpOnly, set by POST /api/auth/login).
  const admin = cookies.get(ADMIN_COOKIE);
  if (admin && isSessionToken(admin)) return admin;

  const project = PUBLIC_APPWRITE_PROJECT_ID;
  if (!project) return null;
  for (const key of [`a_session_${project}`, `a_session_${project}_legacy`]) {
    const value = cookies.get(key);
    if (!value) continue;
    const token = value.startsWith('{') ? null : value;
    if (token && isSessionToken(token)) return token;
    // JSON cookie format: attempt to recover a session token field.
    try {
      const parsed = JSON.parse(value);
      const token = parsed?.jwt ?? parsed?.token ?? null;
      if (token && isSessionToken(String(token))) return String(token);
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

/**
 * Create an Appwrite email/password session server-side and return its
 * session token. Used for reader and staff authentication.
 */
export async function createSession(
  email: string,
  password: string,
): Promise<{ token: string; user: SessionUser } | { ok: false; status: number; message?: string }> {
  await tuneAuthFetch();
  if (!PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT_ID) {
    return { ok: false, status: 503, message: 'Tsarin Appwrite bai kammala ba' };
  }
  try {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID);

    const account = new Account(client);
    const session = await account.createEmailPasswordSession(email.trim(), password);

    const token = session.secret;
    if (!token) return { ok: false, status: 401, message: 'An kasa samun session' };

    const verified = await verifySession(token);
    if (!verified) return { ok: false, status: 401, message: 'An kasa tantance session' };
    const custom = await roleForUser(verified.id);
    const role = custom ?? (await roleFromLabels(verified.labels)) ?? 'reader';
    const user: SessionUser = { ...verified, role };
    _sessionCache.set(token, { user, expires: Date.now() + SESSION_TTL_MS });
    return { token, user };
  } catch (err: any) {
    const status = err?.code === 401 || err?.status === 401 ? 401 : 400;
    return {
      ok: false,
      status,
      message: err?.message || 'Imel ko kalmar sirri ba daidai ba ne',
    };
  }
}

/**
 * Create an Appwrite email/password session server-side and ensure the user
 * has an editorial role.
 */
export async function createAdminSession(
  email: string,
  password: string,
): Promise<{ token: string; user: SessionUser } | { ok: false; status: number; message?: string }> {
  const result = await createSession(email, password);
  if (!('token' in result)) return result;
  if (ROLE_PRIORITY[result.user.role] === undefined) {
    return { ok: false, status: 403, message: 'Ba ku da ikon shiga bangaren admin ba' };
  }
  return result;
}

export async function verifySession(
  token: string,
): Promise<Omit<SessionUser, 'role'> | null> {
  await tuneAuthFetch();
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
      labels: (session as unknown as { labels?: string[] }).labels ?? [],
    };
  } catch {
    return null;
  }
}

export async function roleForUser(userId: string): Promise<string | null> {
  await tuneAuthFetch();
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

export async function roleFromLabels(labels: string[] | undefined): Promise<string | null> {
  if (!labels) return null;
  const set = new Set(labels.map((l) => l.trim().toLowerCase()));
  // Legacy app stored "superadmin" (Appwrite labels forbid underscores);
  // accept that spelling alongside the underscore form.
  if (set.has('super_admin') || set.has('superadmin')) return 'super_admin';
  if (set.has('managing_editor') || set.has('managingeditor')) return 'managing_editor';
  for (const candidate of PREFERRED_ROLES) {
    if (set.has(candidate)) return candidate;
  }
  return null;
}

const _sessionCache = new Map<string, { user: SessionUser; expires: number }>();
const SESSION_TTL_MS = 60_000;

/** Retrieve authenticated user without requiring an editorial role (readers or staff). */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = await sessionTokenFrom(request);
  if (!token) return null;
  const cached = _sessionCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.user;
  const session = await verifySession(token);
  if (!session) return null;
  const custom = await roleForUser(session.id);
  const role = custom ?? (await roleFromLabels(session.labels)) ?? 'reader';
  const user: SessionUser = { ...session, role };
  _sessionCache.set(token, { user, expires: Date.now() + SESSION_TTL_MS });
  return user;
}

export async function requireUser(request: Request): Promise<{ ok: true; user: SessionUser } | { ok: false; status: number }> {
  const token = await sessionTokenFrom(request);
  if (!token) return { ok: false, status: 401 };
  const cached = _sessionCache.get(token);
  if (cached && cached.expires > Date.now()) return { ok: true, user: cached.user };
  const session = await verifySession(token);
  if (!session) return { ok: false, status: 401 };
  const custom = await roleForUser(session.id);
  const role = custom ?? (await roleFromLabels(session.labels));
  if (!role || ROLE_PRIORITY[role] === undefined) return { ok: false, status: 403 };
  const user: SessionUser = { ...session, role };
  _sessionCache.set(token, { user, expires: Date.now() + SESSION_TTL_MS });
  return { ok: true, user };
}

/** True when the authenticated user has at least `minRole` (or is admin). */
export function hasRole(user: SessionUser, minRole: string): boolean {
  return (ROLE_PRIORITY[user.role] ?? -1) >= (ROLE_PRIORITY[minRole] ?? Infinity);
}

export function clearSessionCache(token?: string): void {
  if (token) _sessionCache.delete(token);
  else _sessionCache.clear();
}

export const ROLE_LABELS: Record<string, string> = {
  reader: 'Mai Karatu',
  contributor: 'Contributor',
  author: 'Author',
  editor: 'Editor',
  managing_editor: 'Managing Editor',
  super_admin: 'Super Admin',
};

export function roleName(role: string): string {
  return ROLE_LABELS[role] ?? role;
}