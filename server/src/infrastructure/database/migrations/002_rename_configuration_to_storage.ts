/**
 * Migration 002 — Rename Configuration Tables to Storage
 *
 * Renames legacy `configuration_*` tables, indexes, and constraints to `storage_*`.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';


export const migration002: Migration = {
  id: 2,
  name: 'rename_configuration_to_storage',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuration_versions')
           AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_versions') THEN
          ALTER TABLE configuration_versions RENAME TO storage_versions;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuration_current')
           AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_current') THEN
          ALTER TABLE configuration_current RENAME TO storage_current;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuration_snapshots')
           AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_snapshots') THEN
          ALTER TABLE configuration_snapshots RENAME TO storage_snapshots;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_configuration_versions_updated_at') THEN
          ALTER INDEX idx_configuration_versions_updated_at RENAME TO idx_storage_versions_updated_at;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_configuration_snapshots_created_at') THEN
          ALTER INDEX idx_configuration_snapshots_created_at RENAME TO idx_storage_snapshots_created_at;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_configuration_snapshots_version') THEN
          ALTER INDEX idx_configuration_snapshots_version RENAME TO idx_storage_snapshots_version;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configuration_current_lab_id_unique') THEN
          ALTER TABLE storage_current RENAME CONSTRAINT configuration_current_lab_id_unique TO storage_current_lab_id_unique;
        END IF;
      END $$
    `);
  }
};
