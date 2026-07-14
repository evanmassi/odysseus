/**
 * Migration 026 — Drop Researcher Approval Status
 *
 * Removes the researchers.approval_status column, a remnant of the legacy
 * user-approval workflow. Every researcher was 'approved'; nothing read it.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration026: Migration = {
  id: 26,
  name: '026_drop_researcher_approval_status',
  async up(pool: Pool): Promise<void> {
    await pool.query(`DROP INDEX IF EXISTS idx_researchers_approval_status`);
    await pool.query(`ALTER TABLE researchers DROP COLUMN IF EXISTS approval_status`);
  }
};
