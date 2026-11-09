import { Client } from 'pg';

import { PostgresContext } from '@infrastructure/database/PostgresContext';

const TEST_DB_NAME = 'odysseus_test';
// PITFALL: not localhost — Node tries ::1 first, and Docker's WSL relay on ::1:5432 can hang until timeout.
const DEFAULT_HOST = 'postgres://postgres:devpassword@127.0.0.1:5432';

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

export async function setupTestDatabase(): Promise<PostgresContext> {
  await ensureTestDatabase();
  const context = createTestContext();
  await context.initialize();
  return context;
}

// PITFALL: repositories query the pool directly, so a wrapping transaction would miss their connections; cleanup must TRUNCATE.
export async function truncateAll(context: PostgresContext): Promise<void> {
  const tables = await context.queryMany<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`
  );
  if (tables.length === 0) return;
  const list = tables.map(t => `"${t.tablename}"`).join(', ');
  await context.execute(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
