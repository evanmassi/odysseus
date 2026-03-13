/**
 * Migration 007 — Drop users.is_demo
 *
 * Demo status moved from `users.is_demo` to `labs.is_demo` as part of multi-tenancy.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';


export const migration007: Migration = {
  id: 7,
  name: 'drop_users_is_demo',
  async up(pool: Pool): Promise<void> {
    await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS is_demo`);
    await pool.query(`DROP INDEX IF EXISTS idx_users_is_demo`);
  }
};
