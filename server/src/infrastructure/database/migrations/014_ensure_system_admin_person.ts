/**
 * Migration 014 — Ensure System Admin Person
 *
 * Creates `persons` records for any system admin users that lack one.
 * Idempotent: skips users that already have `person_id`.
 */


import { generateId } from '@domain/utils/generateId';
import { logger } from '@infrastructure/logging/logger';

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration014: Migration = {
  id: 14,
  name: 'ensure_system_admin_person',
  async up(pool: Pool): Promise<void> {
    const result = await pool.query(
      `SELECT u.id, u.username FROM users u WHERE u.role = 'system_admin' AND u.person_id IS NULL`
    );
    if (result.rows.length === 0) return;

    for (const row of result.rows) {
      const personId = generateId('person');
      const now = new Date().toISOString();

      await pool.query(
        `INSERT INTO persons (id, first_name, last_name, email, created_at, updated_at)
         VALUES ($1, $2, 'Admin', $3, $4, $4)`,
        [personId, row.username, `${row.username}@system.local`, now]
      );
      await pool.query(
        `UPDATE users SET person_id = $1 WHERE id = $2`,
        [personId, row.id]
      );
      logger.info(`Created Person record for system admin ${row.username}`);
    }
  }
};
