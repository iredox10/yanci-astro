#!/usr/bin/env node
/**
 * db-lockdown
 *
 * Enforce safe permissions in the Yanci Appwrite database:
 *   - PUBLIC_CONTENT collections -> collection + documents are `read("any")` only
 *   - SERVER_ONLY collections    -> no `any` permissions at any level
 *
 * Default is a DRY RUN that reports drift. Pass --apply to fix it.
 *
 * Usage:
 *   node scripts/db-lockdown.mjs                 # report only
 *   node scripts/db-lockdown.mjs --apply         # fix collections + documents
 *   node scripts/db-lockdown.mjs --collection articles --apply
 *
 * Env: PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT_ID,
 *      PUBLIC_APPWRITE_DATABASE_ID, APPWRITE_API_KEY (read from .env if present)
 */
import { Client, Databases, Query } from 'node-appwrite';
import dns from 'node:dns';
import { setGlobalDispatcher, Agent } from 'undici';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// IPv4-only: this host has no IPv6 route, and undici's happy-eyeballs races
// the unreachable IPv6 answers against the slow IPv4 one and loses. Force
// family 4 at DNS lookup time so only IPv4 addresses are ever attempted.
dns.setDefaultResultOrder('ipv4first');
setGlobalDispatcher(
  new Agent({
    connect: {
      timeout: 60000,
      lookup: (hostname, options, callback) =>
        dns.lookup(hostname, { ...options, family: 4 }, callback),
    },
    headersTimeout: 120000,
    bodyTimeout: 120000,
  }),
);

const APPLY = process.argv.includes('--apply');
const ONLY_ARG = process.argv.indexOf('--collection');
const ONLY = ONLY_ARG !== -1 ? process.argv[ONLY_ARG + 1] : null;

// Match collections by normalized NAME (ids are opaque hex strings).
// Older collections are server-only; PUBLIC list must be explicit.
const PUBLIC_CONTENT = [
  'articles',
  'highlights',
  'homepage_stats',
  'sports',
  'elections',
  'candidates',
  'results',
  'factchecks',
  'homepage_layout',
  'site_settings',
];

const SERVER_ONLY = [
  'staff',
  'comments',
  'article_views',
  'newsletter_subscribers',
  'roles',
  'invitations',
  'article_revisions',
  'autofetch_sources',
  'auto fetch sources',
];

function loadEnv() {
  const path = join(process.cwd(), '.env');
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !m[1].startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };

const ENDPOINT = env.PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = env.PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE = env.PUBLIC_APPWRITE_DATABASE_ID;
const API_KEY = env.APPWRITE_API_KEY;

if (!PROJECT || !DATABASE || !API_KEY) {
  console.error(
    'Missing env: PUBLIC_APPWRITE_PROJECT_ID, PUBLIC_APPWRITE_DATABASE_ID, APPWRITE_API_KEY',
  );
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(API_KEY);
const databases = new Databases(client);

// The Appwrite endpoint is on a flaky far-away network; retry transient
// failures with backoff so a single dropped socket doesn't abort the audit.
async function withRetry(fn, label, attempts = 8) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      const transport = error?.type === 'Error' || /fetch failed|ETIMEDOUT|ENETUNREACH|ECONN|timeout/i.test(String(error?.cause ?? error));
      if (i >= attempts || (error && !transport)) throw error;
      const wait = Math.min(2000 * 2 ** (i - 1), 15000);
      console.log(`    [retry] ${label} (attempt ${i}, wait ${wait}ms): ${error?.cause?.code ?? error?.code ?? 'network error'}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

const norm = (s) => String(s ?? '').toLowerCase().trim();
const classify = (name) => {
  const n = norm(name);
  if (SERVER_ONLY.includes(n)) return 'server';
  if (PUBLIC_CONTENT.includes(n)) return 'public';
  return null;
};

const permSets = {
  public: ['read("any")'],
  server: [],
};

async function fixCollectionPerms(col) {
  const want = permSets[classify(col.name)];
  const have = col.$permissions ?? [];
  const same = have.length === want.length && want.every((p) => have.includes(p));
  if (same) return { changed: false };
  console.log(
    `  [fix  ] collection ${col.name} (${col.$id}): ${have.join(',') || '<none>'} => ${want.join(',') || '<none>'}`,
  );
  if (APPLY) {
    await withRetry(
      () => databases.updateCollection({
        databaseId: DATABASE,
        collectionId: col.$id,
        name: col.name,
        permissions: want,
      }),
      `updateCollection ${col.name}`,
    );
  }
  return { changed: true };
}

async function main() {
  const { collections } = await withRetry(() => databases.listCollections(DATABASE), 'listCollections');
  console.log(`DB permission audit — ${APPLY ? 'FIXING' : 'DRY RUN'} (add --apply to enforce)\n`);

  let touched = 0;
  let problems = 0;
  let unknown = 0;

  for (const col of collections ?? []) {
    const kind = classify(col.name);
    if (ONLY && norm(col.name) !== norm(ONLY)) continue;
    if (kind === null) {
      unknown++;
      console.warn(`  [skip] ${col.name} (${col.$id}): untracked collection (not in allow/serve lists)`);
      continue;
    }

    // 1) Collection-level permissions
    const colResult = await fixCollectionPerms(col);
    if (colResult.changed) { touched++; problems++; }

    // 2) Document-level permissions (paged)
    const want = permSets[kind];
    const perPage = 100;
    let offset = 0;
    let collectionProblems = 0;
    do {
      const page = await withRetry(
        () => databases.listDocuments({
          databaseId: DATABASE,
          collectionId: col.$id,
          queries: [Query.limit(perPage), Query.offset(offset)],
        }),
        `listDocuments ${col.name}@${offset}`,
      );
      for (const doc of page.documents ?? []) {
        const have = doc.$permissions ?? (doc.permissions ?? []);
        const same = have.length === want.length && want.every((p) => have.includes(p));
        if (same) continue;
        problems++;
        collectionProblems++;
        console.log(`  [fix  ] ${col.name}/${doc.$id}: ${have.join(',') || '<none>'} => ${want.join(',') || '<none>'}`);
        if (APPLY) {
          await withRetry(
            () => databases.updateDocument({
              databaseId: DATABASE,
              collectionId: col.$id,
              documentId: doc.$id,
              permissions: want,
            }),
            `updateDocument ${col.name}/${doc.$id}`,
          );
          touched++;
        }
      }
      offset += perPage;
      if (!page.documents || page.documents.length < perPage) break;
    } while (true);
    if (collectionProblems) console.log(`    ↑ ${collectionProblems} doc(s) in ${col.name}`);
  }

  console.log(
    `\n${problems} items need attention${unknown ? `; ${unknown} untracked collection(s) skipped` : ''}` +
      `${APPLY ? `; ${touched} updated` : ' — no changes made (dry run)'}`,
  );
}

main().catch((error) => {
  console.error('\nLockdown failed:', error);
  process.exit(1);
});
