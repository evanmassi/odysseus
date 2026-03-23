/**
 * Migration 018 — Invite Code Researcher Flag and Deactivation Reason
 *
 * Adds create_researcher column so invite codes control whether the registering
 * user gets a researcher profile. Also persists deactivation_reason which the
 * entity already tracked in-memory but was never stored to the database.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration018: Migration = {
  id: 18,
  name: '018_add_invite_code_columns',
  up: async (pool: Pool) => {
    await pool.query(`
      ALTER TABLE invite_codes
        ADD COLUMN IF NOT EXISTS create_researcher BOOLEAN NOT NULL DEFAULT TRUE
    `);

    await pool.query(`
      ALTER TABLE invite_codes
        ADD COLUMN IF NOT EXISTS deactivation_reason TEXT
          CHECK (deactivation_reason IN ('used', 'expired', 'manual'))
    `);
  },
};
