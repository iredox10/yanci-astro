import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPool(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn('[DB] DATABASE_URL is not set. Database operations will fail.');
  }

  const isLocal =
    !connectionString ||
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1');

  pool = new Pool({
    connectionString,
    ssl: isLocal
      ? false
      : {
          rejectUnauthorized: false,
        },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client', err);
  });

  return pool;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDb();
    // @ts-expect-error dynamic proxy
    return instance[prop];
  },
});

export * from './schema';
