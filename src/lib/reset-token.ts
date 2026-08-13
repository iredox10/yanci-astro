import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL_MS = 30 * 60 * 1000;

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

/**
 * Stateless password-reset token: base64url(email).expiry.hmac.
 * No database row needed; the HMAC is keyed with the server API key.
 */
export function signResetToken(email: string, secret: string): string {
  const expiry = String(Date.now() + TTL_MS);
  const hmac = createHmac('sha256', secret).update(`${email}|${expiry}`).digest('hex');
  return `${b64url(email)}.${expiry}.${hmac}`;
}

export function verifyResetToken(token: string, secret: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [emailB64, expiryStr, hmac] = parts;
  const expected = createHmac('sha256', secret)
    .update(`${Buffer.from(emailB64, 'base64url').toString('utf8')}|${expiryStr}`)
    .digest('hex');
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
  return Buffer.from(emailB64, 'base64url').toString('utf8');
}