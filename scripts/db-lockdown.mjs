#!/usr/bin/env node
/**
 * db-lockdown
 *
 * Enforce that Appwrite collections hold only safe row permissions:
 *   - PUBLIC_CONTENT   -> documents are `read("any")` only (no public write)
 *   - SERVER_ONLY      -> no document-level `any` permissions at all
 *
 * Default is a DRY RUN that reports drift. Pass --apply to fix it.
 *
 * Usage:
 *   node scripts/db-lockdown.mjs                # report only
 *   node scripts/db-lockdown.mjs --apply         # fix documents
 *   node scripts/db-lockdown.mjs --collection articles --apply
 *
 * Env: PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT_ID,
 *      PUBLIC_APPWRITE_DATABASE_ID, APPWRITE_API_KEY (read from .env if present)
 */
import { Client, Databases } from 'node-appwrite';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const APPLY = process.argv.includes('--apply');
const ONLY = process.argv.includes('--collection') ? process.argv[process.argv.indexOf('--collection') + 1] : null;

// ORDER MATTERS: older keys (roles, invites) are server-only. NEW collections
// added later default to server-only unless explicitly listed here.
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
  'settings',
];

const SERVER_ONLY = [
  'comments',
  'article_views',
  'newsletter_subscribers',
  'roles',
  'invitations',
  'article_revisions',
  'autofetch_sources',
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

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(API_KEY);
const databases = new Databases(client);

function targetPerms(collectionId) {
  if (SERVER_ONLY.includes(collectionId)) return [];
  if (PUBLIC_CONTENT.includes(collectionId)) return ['read("any")'];
  return null; // unknown/untracked collection — refuse to touch
}

async function main() {
  const { collections } = await databases.listCollections(DATABASE);
  console.log(`DB permission audit — ${APPLY ? 'FIXING' : 'DRY RUN'} (add --apply to enforce)\n`);

  let touched = 0;
  let problems = 0;

  for (const col of collections ?? []) {
    const id = col.$id;
    if (ONLY && id !== ONLY) continue;
    const want = targetPerms(id);
    if (want === null) {
      console.warn(`  [skip] ${id}: untracked collection (not in allow/serve lists)`);
      continue;
    }

    const perPage = 100;
    let offset = 0;
    let collectionProblems = 0;
    do {
      const page = await databases.listDocuments({ databaseId: DATABASE, collectionId: id, queries: ['limit(100)', `offset(${offset})`] });
      for (const doc of page.documents ?? []) {
        const have = doc.$permissions ?? (doc.permissions ?? []);
        const same = have.length === want.length && want.every((p) => have.includes(p));
        if (same) continue;
        problems++;
        collectionProblems++;
        console.log(`  [fix  ] ${id}/${doc.$id}: ${have.join(',') || '<none>'} => ${want.join(',') || '<none>'}`);
        if (APPLY) {
          await databases.updateDocument({ databaseId: DATABASE, collectionId: id, documentId: doc.$id, permissions: want });
          touched++;
        }
      }
      offset += perPage;
      if (!page.documents || page.documents.length < perPage) break;
    } while (true);
    if (collectionProblems) console.log(`    ↑ ${collectionProblems} doc(s) in ${id}`);
  }
  console.log(`\n${problems} documents need attention; ${APPLY ? `${touched} updated` : 'no changes made (dry run)'}`);
  if (APPLY && problems > 0) console.log('You may need to run twice; updateDocument with empty data preserves content but notes per-project permissions.');
}

main().catch((error) => {
  console.error('\nLockdown failed:', error);
  process.exit(1);
});