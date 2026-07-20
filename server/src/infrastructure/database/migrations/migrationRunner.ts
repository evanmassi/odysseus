/**
 * Migration Runner
 *
 * Tracks and executes numbered migrations via a `schema_migrations` table.
 * Uses advisory locking to prevent concurrent runs during parallel deploys.
 */

import { logger } from '@infrastructure/logging/logger';

import { ALL_MIGRATIONS } from './index';

import type { Pool, PoolClient } from 'pg';

export interface Migration {
  id: number;
  name: string;
  up: (pool: Pool) => Promise<void>;
}

const MIGRATION_LOCK_ID = 839201;

export async function runMigrations(pool: Pool): Promise<void> {
  // Session advisory locks bind to a connection, so all bookkeeping (lock,
  // schema_migrations reads/writes, state detection, unlock) must run on one
  // client. Migrations themselves still get the pool.
  const client = await pool.connect();
  await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const existing = await client.query('SELECT id FROM schema_migrations');
    if (existing.rows.length === 0) {
      const markUpTo = await detectExistingState(client);
      for (const migration of ALL_MIGRATIONS) {
        if (migration.id <= markUpTo) {
          await client.query('INSERT INTO schema_migrations (id, name) VALUES ($1, $2)', [
            migration.id,
            migration.name,
          ]);
          logger.info(`Migration ${migration.id} (${migration.name}) — marked as applied`);
        }
      }
    }

    const applied = await client.query('SELECT id FROM schema_migrations');
    const appliedIds = new Set(applied.rows.map(r => r.id));

    for (const migration of ALL_MIGRATIONS) {
      if (appliedIds.has(migration.id)) continue;

      logger.info(`Running migration ${migration.id}: ${migration.name}...`);
      try {
        await migration.up(pool);
        await client.query('INSERT INTO schema_migrations (id, name) VALUES ($1, $2)', [
          migration.id,
          migration.name,
        ]);
        logger.info(`Migration ${migration.id} (${migration.name}) — completed`);
      } catch (error) {
        logger.error(`Migration ${migration.id} (${migration.name}) failed:`, error);
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    client.release();
  }
}

async function detectExistingState(client: PoolClient): Promise<number> {
  const hasPersons = await tableExists(client, 'persons');
  if (!hasPersons) return 0;

  // A labs table means this is the legacy production DB, already at migration 15 —
  // so 011-015 (multi-tenancy) are no-ops there. A persons-only DB predates
  // multi-tenancy entirely and sits at the initial-schema baseline of 1.
  const hasLabs = await tableExists(client, 'labs');
  if (hasLabs) return 15;

  return 1;
}

async function tableExists(client: PoolClient, tableName: string): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return result.rows.length > 0;
}
