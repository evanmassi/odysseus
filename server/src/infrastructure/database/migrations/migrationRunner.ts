/**
 * Migration Runner
 *
 * Tracks and executes numbered migrations via a `schema_migrations` table.
 * Uses advisory locking to prevent concurrent runs during parallel deploys.
 */


import { logger } from '@infrastructure/logging/logger';

import { ALL_MIGRATIONS } from './index';

import type { Pool } from 'pg';

export interface Migration {
  id: number;
  name: string;
  up: (pool: Pool) => Promise<void>;
}

const MIGRATION_LOCK_ID = 839201;

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const existing = await pool.query('SELECT id FROM schema_migrations');
    if (existing.rows.length === 0) {
      const markUpTo = await detectExistingState(pool);
      for (const migration of ALL_MIGRATIONS) {
        if (migration.id <= markUpTo) {
          await pool.query(
            'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
            [migration.id, migration.name]
          );
          logger.info(`Migration ${migration.id} (${migration.name}) — marked as applied`);
        }
      }
    }

    const applied = await pool.query('SELECT id FROM schema_migrations');
    const appliedIds = new Set(applied.rows.map(r => r.id));

    for (const migration of ALL_MIGRATIONS) {
      if (appliedIds.has(migration.id)) continue;

      logger.info(`Running migration ${migration.id}: ${migration.name}...`);
      try {
        await migration.up(pool);
        await pool.query(
          'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
          [migration.id, migration.name]
        );
        logger.info(`Migration ${migration.id} (${migration.name}) — completed`);
      } catch (error) {
        logger.error(`Migration ${migration.id} (${migration.name}) failed:`, error);
        throw error;
      }
    }
  } finally {
    await pool.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
  }
}

async function detectExistingState(pool: Pool): Promise<number> {
  const hasPersons = await tableExists(pool, 'persons');
  if (!hasPersons) return 0;

  const hasLabs = await tableExists(pool, 'labs');
  if (hasLabs) return 15;

  return 1;
}

async function tableExists(pool: Pool, tableName: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return result.rows.length > 0;
}
