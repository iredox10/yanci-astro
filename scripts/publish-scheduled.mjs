#!/usr/bin/env node
/**
 * publish-scheduled.mjs
 *
 * Background automation script to check for scheduled articles whose
 * publishAt time has arrived, and transition them to published/isLive.
 * Designed to be run periodically via Heroku Scheduler (e.g. every 10 mins).
 */

import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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
const connectionString = env.DATABASE_URL;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

if (!connectionString) {
  console.error('[publish-scheduled] ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const isLocal =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 1,
});

async function main() {
  const now = new Date();
  console.log(`\n=== Scheduled Article Publisher ===`);
  console.log(`Time: ${now.toISOString()}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  try {
    if (DRY_RUN) {
      const res = await pool.query(
        `SELECT id, headline, publish_at FROM articles
         WHERE status = 'scheduled' AND (publish_at IS NULL OR publish_at <= NOW())`
      );
      console.log(`Found ${res.rows.length} article(s) ready to publish:`);
      for (const row of res.rows) {
        console.log(`  [dry-run] ${row.id}: "${row.headline}" (publishAt: ${row.publish_at})`);
      }
    } else {
      const res = await pool.query(
        `UPDATE articles
         SET status = 'published', is_live = true, updated_at = NOW()
         WHERE status = 'scheduled' AND (publish_at IS NULL OR publish_at <= NOW())
         RETURNING id, headline, publish_at`
      );
      console.log(`Successfully published ${res.rows.length} scheduled article(s):`);
      for (const row of res.rows) {
        console.log(`  [published] ${row.id}: "${row.headline}"`);
      }
    }
  } catch (err) {
    console.error('[publish-scheduled] Error executing scheduled publish:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
