/**
 * Migration 015 — Insert Default Configuration
 *
 * Seeds the first lab with a default storage configuration if none exists.
 * Non-fatal: logs errors but does not crash startup (preserves existing behavior).
 */


import { logger } from '@infrastructure/logging/logger';

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration015: Migration = {
  id: 15,
  name: 'insert_default_configuration',
  async up(pool: Pool): Promise<void> {
    try {
      const firstLab = await pool.query('SELECT id FROM labs ORDER BY created_at LIMIT 1');
      const labId = firstLab.rows[0]?.id;
      if (!labId) return;

      const existing = await pool.query(
        'SELECT lab_id FROM storage_current WHERE lab_id = $1',
        [labId]
      );

      if (existing.rows.length === 0) {
        const { Storage } = await import('../../../domain/entities/Storage');

        const defaultConfig = Storage.createDefault();
        const configJson = JSON.stringify(defaultConfig.toData());
        const now = new Date().toISOString();

        const versionResult = await pool.query(
          `INSERT INTO storage_versions (lab_id, updated_at, change_description, changed_by, config_json)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING version`,
          [labId, now, 'Initial system configuration', 'system', configJson]
        );

        const version = versionResult.rows[0].version;

        await pool.query(
          `INSERT INTO storage_current (lab_id, version, updated_at, config_json)
           VALUES ($1, $2, $3, $4)`,
          [labId, version, now, configJson]
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Failed to initialize default configuration:', { message: errorMessage, stack: errorStack });
    }
  }
};
