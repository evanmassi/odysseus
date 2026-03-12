/**
 * Migration 004 — Add Tube Columns
 *
 * Adds `species`, `source`, `catalog_number`, and `passage_number` columns to the `tubes` table.
 */

import { Pool } from 'pg';
import type { Migration } from './migrationRunner';

export const migration004: Migration = {
  id: 4,
  name: 'add_tube_columns',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'species'
        ) THEN
          ALTER TABLE tubes ADD COLUMN species TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'source'
        ) THEN
          ALTER TABLE tubes ADD COLUMN source TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'catalog_number'
        ) THEN
          ALTER TABLE tubes ADD COLUMN catalog_number TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'passage_number'
        ) THEN
          ALTER TABLE tubes ADD COLUMN passage_number INTEGER CHECK (passage_number >= 0 AND passage_number <= 999);
        END IF;
      END $$
    `);
  }
};
