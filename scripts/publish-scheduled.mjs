#!/usr/bin/env node
/**
 * publish-scheduled.mjs
 *
 * Background automation script to check for scheduled articles whose
 * publishAt time has arrived, and transition them to published/isLive.
 *
 * Usage:
 *   node scripts/publish-scheduled.mjs              # publish scheduled articles
 *   node scripts/publish-scheduled.mjs --dry-run    # simulate without writing to DB
 */

import { Client, Databases, Query } from 'node-appwrite';
import dns from 'node:dns';
import { setGlobalDispatcher, Agent } from 'undici';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Force IPv4 DNS resolution for reliability
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

function loadEnv() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    out[key] = val;
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };

const ENDPOINT = env.PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = env.PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE = env.PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ARTICLES = env.PUBLIC_APPWRITE_COLLECTION_ARTICLES || 'articles';
const API_KEY = env.APPWRITE_API_KEY;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SHOW_HELP = args.includes('--help') || args.includes('-h');

if (SHOW_HELP) {
  console.log(`
publish-scheduled.mjs - Transition scheduled articles to published

Usage:
  node scripts/publish-scheduled.mjs [--dry-run]

Options:
  --dry-run    Log scheduled articles ready for publishing without updating DB
  --help, -h   Show this help message
`);
  process.exit(0);
}

if (!PROJECT || !DATABASE || !API_KEY) {
  console.error(
    'Error: Missing required Appwrite environment variables (PUBLIC_APPWRITE_PROJECT_ID, PUBLIC_APPWRITE_DATABASE_ID, APPWRITE_API_KEY)',
  );
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(API_KEY);
const databases = new Databases(client);

async function withRetry(fn, label, attempts = 5) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      const transport =
        error?.type === 'Error' ||
        /fetch failed|ETIMEDOUT|ENETUNREACH|ECONN|timeout/i.test(
          String(error?.cause ?? error),
        );
      if (i >= attempts || (error && !transport)) throw error;
      const wait = Math.min(2000 * 2 ** (i - 1), 15000);
      console.log(
        `    [retry] ${label} (attempt ${i}, wait ${wait}ms): ${error?.cause?.code ?? error?.code ?? 'network error'}`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function main() {
  const now = new Date();
  const nowIso = now.toISOString();
  console.log(`\n=== Scheduled Article Publisher ===`);
  console.log(`Time: ${nowIso}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no database updates)' : 'LIVE (updating database)'}\n`);

  // Query scheduled articles
  const perPage = 100;
  let offset = 0;
  const readyToPublish = [];

  while (true) {
    const result = await withRetry(
      () =>
        databases.listDocuments(DATABASE, COLLECTION_ARTICLES, [
          Query.equal('status', 'scheduled'),
          Query.limit(perPage),
          Query.offset(offset),
        ]),
      'listDocuments(status=scheduled)',
    );

    const docs = result.documents || [];
    for (const doc of docs) {
      if (!doc.publishAt) {
        // Scheduled with no explicit publishAt is considered ready for immediate publish
        readyToPublish.push(doc);
      } else {
        const publishTime = new Date(doc.publishAt);
        if (isNaN(publishTime.getTime()) || publishTime <= now) {
          readyToPublish.push(doc);
        }
      }
    }

    if (docs.length < perPage) break;
    offset += perPage;
  }

  console.log(`Found ${readyToPublish.length} scheduled article(s) ready to be published.`);

  if (readyToPublish.length === 0) {
    console.log('No articles to publish at this time.\n');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const article of readyToPublish) {
    const id = article.$id;
    const headline = article.headline || '(untitled)';
    const scheduledTime = article.publishAt || 'immediate';

    if (DRY_RUN) {
      console.log(`  [dry-run] Would publish article ${id}: "${headline}" (publishAt: ${scheduledTime})`);
      successCount++;
    } else {
      try {
        await withRetry(
          () =>
            databases.updateDocument(DATABASE, COLLECTION_ARTICLES, id, {
              status: 'published',
              isLive: true,
            }),
          `updateDocument(${id})`,
        );
        console.log(`  [published] Article ${id}: "${headline}" -> status: published, isLive: true`);
        successCount++;
      } catch (err) {
        console.error(`  [error] Failed to publish article ${id} ("${headline}"):`, err.message || err);
        failCount++;
      }
    }
  }

  console.log(
    `\nPublish summary: ${successCount} article(s) ${DRY_RUN ? 'would be published' : 'published'}` +
      (failCount > 0 ? `, ${failCount} failed` : '') +
      `.\n`,
  );

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFatal error in publish-scheduled script:', err);
  process.exit(1);
});
