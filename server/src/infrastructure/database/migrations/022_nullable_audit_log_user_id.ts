/**
 * Migration 022 — Nullable Audit Log User ID
 *
 * Allows audit_log rows for actor-less security events (failed logins for
 * unknown usernames) to persist without violating the users(id) foreign key.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration022: Migration = {
  id: 22,
  name: '022_nullable_audit_log_user_id',
  up: async (pool: Pool) => {
    await pool.query(`ALTER TABLE audit_log ALTER COLUMN user_id DROP NOT NULL`);
    await pool.query(`ALTER TABLE audit_log_archive ALTER COLUMN user_id DROP NOT NULL`);
  },
};
