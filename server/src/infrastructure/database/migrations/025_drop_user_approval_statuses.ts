/**
 * Migration 025 — Drop User Approval Statuses
 *
 * Removes the legacy 'pending' and 'rejected' user statuses, left over from the
 * register-then-await-approval flow that invite-code registration replaced.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration025: Migration = {
  id: 25,
  name: '025_drop_user_approval_statuses',
  async up(pool: Pool): Promise<void> {
    await pool.query(`UPDATE users SET status = 'approved' WHERE status = 'pending'`);
    await pool.query(`UPDATE users SET status = 'deactivated' WHERE status = 'rejected'`);

    await pool.query(`ALTER TABLE users ALTER COLUMN status SET DEFAULT 'approved'`);

    await pool.query(`
      DO $$
      DECLARE constraint_name TEXT;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'users'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%status%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || constraint_name;
        END IF;

        ALTER TABLE users ADD CONSTRAINT users_status_check
          CHECK (status IN ('approved', 'deactivated', 'suspended'));
      END $$
    `);
  },
};
