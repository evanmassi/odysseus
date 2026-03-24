/**
 * Migration 019 — Nullable Person Email
 *
 * Allows person records to exist without an email for historical researcher
 * attribution after the linked user account is deleted.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration019: Migration = {
  id: 19,
  name: '019_nullable_person_email',
  up: async (pool: Pool) => {
    await pool.query(`
      ALTER TABLE persons ALTER COLUMN email DROP NOT NULL
    `);
  },
};
