/**
 * Integration Test Database Harness
 *
 * Boots a real Postgres (odysseus_test) so repository-level tests exercise the actual
 * SQL that enforces lab isolation. Repositories query the pool directly, so per-test
 * cleanup is TRUNCATE — a wrapping transaction would not capture their connections.
 */

import { Client } from 'pg';

import { PostgresContext } from '@infrastructure/database/PostgresContext';

const TEST_DB_NAME = 'odysseus_test';
const DEFAULT_HOST = 'postgres://postgres:devpassword@localhost:5432';

/** Connection to the maintenance DB, used only to CREATE the test DB if missing. */
function adminConnectionString(): string {
  return process.env.TEST_ADMIN_DATABASE_URL ?? `${DEFAULT_HOST}/postgres`;
}

export function testConnectionString(): string {
  return process.env.TEST_DATABASE_URL ?? `${DEFAULT_HOST}/${TEST_DB_NAME}`;
}

async function ensureTestDatabase(): Promise<void> {
  const client = new Client({ connectionString: adminConnectionString() });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      TEST_DB_NAME,
    ]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    }
  } finally {
    await client.end();
  }
}

export function createTestContext(): PostgresContext {
  return new PostgresContext({
    connectionString: testConnectionString(),
    ssl: false,
    maxConnections: 5,
  });
}

/** Creates the test DB if needed and runs migrations (idempotent). Returns a ready context. */
export async function setupTestDatabase(): Promise<PostgresContext> {
  await ensureTestDatabase();
  const context = createTestContext();
  await context.initialize();
  return context;
}

/** Wipes every application table between tests, preserving the schema and migration ledger. */
export async function truncateAll(context: PostgresContext): Promise<void> {
  const tables = await context.queryMany<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`
  );
  if (tables.length === 0) return;
  const list = tables.map(t => `"${t.tablename}"`).join(', ');
  await context.execute(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
