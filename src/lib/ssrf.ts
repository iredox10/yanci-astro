import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Output-guard for the autofetch sidecar. We only ever `fetch()` URLs that
 * came from configured sources; this never lets a request tunnel into
 * host-network resources (DNS metadata, cloud endpoints, private nets).
 */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  return (
    (n >>> 24) === 10 || // 10.0.0.0/8
    (n >>> 20) === 0xac1 || // 172.16.0.0/12
    (n >>> 16) === 0xc0a8 || // 192.168.0.0/16
    (n >>> 16) === 0xa9fe || // 169.254.0.0/16 link-local
    (n >>> 8) === 0x7f || // 127.0.0.0/8 loopback
    n === 0 // 0.0.0.0/8
  );
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fd') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
    return true;
  }
  if (lower.startsWith('2001:db8')) return true;
  return false;
}

const BLOCKED_HOST_SUBSTRINGS = [
  'localhost',
  '.internal',
  '.corp',
  'metadata.google.internal',
];

export type UrlCheck =
  | { ok: true; url: URL; hostname: string }
  | { ok: false; reason: string };

export async function dnsAddresses(host: string): Promise<string[]> {
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    return records.map((r) => r.address);
  } catch {
    return [];
  }
}

/** Validate that a candidate fetch URL is http(s), resolvable, and never private. */
export async function assertSafeFetchUrl(raw: string): Promise<UrlCheck> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: 'Malformed URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only http/https allowed' };
  }

  const host = parsed.hostname.toLowerCase();
  if (isIP(host) && (isPrivateV4(host) || isPrivateV6(host))) {
    return { ok: false, reason: 'Private address literal' };
  }
  for (const part of BLOCKED_HOST_SUBSTRINGS) {
    if (host.includes(part)) return { ok: false, reason: `Blocked host name (${part})` };
  }

  const addresses = await dnsAddresses(host);
  if (addresses.length === 0) return { ok: false, reason: 'Host does not resolve' };
  for (const addr of addresses) {
    if (isIP(addr) === 4 ? isPrivateV4(addr) : isPrivateV6(addr)) {
      return { ok: false, reason: `Resolved to private address (${addr})` };
    }
  }

  return { ok: true, url: parsed, hostname: host };
}

export const blockedHostSubstrings = [...BLOCKED_HOST_SUBSTRINGS];