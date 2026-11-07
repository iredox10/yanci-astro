import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[MIGRATE] ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const isLocal =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 1,
});

async function runMigrations() {
  console.log('[MIGRATE] Connecting to PostgreSQL database...');
  const db = drizzle(pool);

  const migrationsFolder = join(__dirname, '../drizzle');
  console.log(`[MIGRATE] Running migrations from: ${migrationsFolder}`);

  try {
    await migrate(db, { migrationsFolder });
    console.log('[MIGRATE] ✅ All migrations applied successfully!');

    // Auto-seed initial content if fresh database
    try {
      const { rows } = await pool.query('SELECT count(*)::int as count FROM users');
      if (rows.length > 0 && rows[0].count === 0) {
        console.log('[MIGRATE] Fresh database detected! Auto-seeding initial database...');
        const { seedDatabase } = await import('./seed.mjs');
        await seedDatabase(pool);
      }
    } catch (seedErr) {
      console.warn('[MIGRATE] Notice: auto-seeding check skipped:', seedErr.message);
    }
  } catch (error) {
    console.error('[MIGRATE] ❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
