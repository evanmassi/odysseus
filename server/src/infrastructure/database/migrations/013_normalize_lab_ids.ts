/**
 * Migration 013 — Normalize Lab IDs
 *
 * Replaces the `lab_default` sentinel ID with a proper generated ID.
 * Idempotent: skips if no `lab_default` row exists.
 */

import { Pool } from 'pg';
import { generateId } from '@domain/utils/generateId';
import { logger } from '@infrastructure/logging/logger';
import type { Migration } from './migrationRunner';

export const migration013: Migration = {
  id: 13,
  name: 'normalize_lab_ids',
  async up(pool: Pool): Promise<void> {
    const result = await pool.query(`SELECT id, slug FROM labs WHERE id = 'lab_default'`);
    if (result.rows.length === 0) return;

    const originalSlug = result.rows[0].slug as string;
    const newId = generateId('lab');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE labs SET slug = $1 WHERE id = 'lab_default'`,
        [`__migrating_${originalSlug}`]
      );

      await client.query(
        `INSERT INTO labs (id, name, slug, is_active, created_at, updated_at)
         SELECT $1, name, $2, is_active, created_at, updated_at FROM labs WHERE id = 'lab_default'`,
        [newId, originalSlug]
      );

      const childTables = [
        'users', 'researchers', 'tubes', 'lookup_values',
        'storage_current', 'storage_versions', 'storage_snapshots',
        'audit_log', 'audit_log_archive', 'invite_codes',
      ];
      for (const table of childTables) {
        await client.query(`UPDATE ${table} SET lab_id = $1 WHERE lab_id = 'lab_default'`, [newId]);
      }

      await client.query(`DELETE FROM labs WHERE id = 'lab_default'`);

      await client.query('COMMIT');
      logger.info(`Normalized lab_default to ${newId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};
