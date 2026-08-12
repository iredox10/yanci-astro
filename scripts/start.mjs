import { existsSync, readFileSync } from 'node:fs';
import { setDefaultResultOrder } from 'node:dns';

setDefaultResultOrder('ipv4first');

if (!process.env.PUBLIC_APPWRITE_ENDPOINT && existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

await import('../dist/server/entry.mjs');
