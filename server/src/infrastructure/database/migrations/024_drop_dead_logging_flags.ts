/**
 * Migration 024 — Drop Dead Logging Flags
 *
 * enable_detailed_logging and log_failed_attempts were persisted but never read: no logging path
 * consulted either one. Failed logins are audited unconditionally, and SecurityMonitoringApplicationService
 * depends on those rows, so honouring log_failed_attempts would have blinded lockout detection.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration024: Migration = {
  id: 24,
  name: '024_drop_dead_logging_flags',
  up: async (pool: Pool) => {
    await pool.query(`ALTER TABLE security_config DROP COLUMN IF EXISTS enable_detailed_logging`);
    await pool.query(`ALTER TABLE security_config DROP COLUMN IF EXISTS log_failed_attempts`);
  },
};
