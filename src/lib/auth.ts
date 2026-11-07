import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq, and, gt } from 'drizzle-orm';
import { db, users, sessions, roles } from '../db';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  labels?: string[];
}

export const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 4,
  admin: 4,
  managing_editor: 3,
  editor: 2,
  author: 1,
  contributor: 0,
};

export const ADMIN_COOKIE = 'yc_session';
const SESSION_TTL_DAYS = 30;
const SESSION_CACHE_TTL_MS = 60_000;

const _sessionCache = new Map<string, { user: SessionUser; expires: number }>();

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
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    let value = part.slice(eqIdx + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      /* leave as-is */
    }
    map.set(key, value);
  }
  return map;
}

export function isSessionToken(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[A-Za-z0-9_\-\.]{16,128}$/.test(value);
}

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
  const token = cookies.get(ADMIN_COOKIE);
  if (token && isSessionToken(token)) return token;

  return null;
}

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

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(
  email: string,
  password: string,
  request?: Request,
): Promise<{ token: string; user: SessionUser } | { ok: false; status: number; message: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!userRecord || !userRecord.active) {
      return { ok: false, status: 401, message: 'Imel ko kalmar sirri ba daidai ba ne' };
    }

    const passwordValid = await verifyPassword(password, userRecord.passwordHash);
    if (!passwordValid) {
      return { ok: false, status: 401, message: 'Imel ko kalmar sirri ba daidai ba ne' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    let userAgent: string | undefined;
    let ipAddress: string | undefined;

    if (request) {
      userAgent = request.headers.get('user-agent') ?? undefined;
      ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('cf-connecting-ip') ??
        undefined;
    }

    await db.insert(sessions).values({
      id: token,
      userId: userRecord.id,
      expiresAt,
      userAgent,
      ipAddress,
    });

    const sessionUser: SessionUser = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      labels: [userRecord.role],
    };

    _sessionCache.set(token, { user: sessionUser, expires: Date.now() + SESSION_CACHE_TTL_MS });

    return { token, user: sessionUser };
  } catch (error) {
    console.error('[auth] createSession error', error);
    return { ok: false, status: 500, message: 'Kuskuren uwar garke wajen shiga' };
  }
}

export async function createAdminSession(
  email: string,
  password: string,
  request?: Request,
): Promise<{ token: string; user: SessionUser } | { ok: false; status: number; message: string }> {
  const result = await createSession(email, password, request);
  if (!('token' in result)) return result;

  if (ROLE_PRIORITY[result.user.role] === undefined) {
    return { ok: false, status: 403, message: 'Ba ku da ikon shiga bangaren admin ba' };
  }
  return result;
}

export async function destroySession(token: string): Promise<void> {
  _sessionCache.delete(token);
  try {
    await db.delete(sessions).where(eq(sessions.id, token));
  } catch (err) {
    console.error('[auth] destroySession error', err);
  }
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = await sessionTokenFrom(request);
  if (!token) return null;

  const cached = _sessionCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.user;

  try {
    const result = await db
      .select({
        sessionId: sessions.id,
        sessionExpiresAt: sessions.expiresAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        userActive: users.active,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (!result.length) {
      _sessionCache.delete(token);
      return null;
    }

    const row = result[0];
    if (!row.userActive) return null;

    const user: SessionUser = {
      id: row.userId,
      name: row.userName,
      email: row.userEmail,
      role: row.userRole,
      labels: [row.userRole],
    };

    _sessionCache.set(token, { user, expires: Date.now() + SESSION_CACHE_TTL_MS });
    return user;
  } catch (err) {
    console.error('[auth] getSessionUser error', err);
    return null;
  }
}

export async function requireUser(
  request: Request,
): Promise<{ ok: true; user: SessionUser } | { ok: false; status: number }> {
  const user = await getSessionUser(request);
  if (!user) return { ok: false, status: 401 };

  if (ROLE_PRIORITY[user.role] === undefined) {
    return { ok: false, status: 403 };
  }

  return { ok: true, user };
}

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
