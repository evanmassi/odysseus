/**
 * Migration 011 — User Status Constraint
 *
 * Adds `deactivated` and `suspended` to the `users.status` CHECK constraint.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration011: Migration = {
  id: 11,
  name: 'user_status_constraint',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      DO $$
      DECLARE constraint_name TEXT;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'users'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%status%'
          AND pg_get_constraintdef(con.oid) NOT LIKE '%deactivated%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || constraint_name;
          ALTER TABLE users ADD CONSTRAINT users_status_check
            CHECK (status IN ('pending', 'approved', 'rejected', 'deactivated', 'suspended'));
        END IF;
      END $$
    `);
  },
};
