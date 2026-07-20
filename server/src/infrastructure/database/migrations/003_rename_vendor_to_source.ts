/**
 * Migration 003 — Rename Vendor to Source
 *
 * Renames `tubes.vendor` column to `source` and updates the `lookup_values` category constraint.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration003: Migration = {
  id: 3,
  name: 'rename_vendor_to_source',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'vendor'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'source'
        ) THEN
          ALTER TABLE tubes RENAME COLUMN vendor TO source;
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'vendor'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'source'
        ) THEN
          UPDATE tubes SET source = vendor WHERE vendor IS NOT NULL AND source IS NULL;
          ALTER TABLE tubes DROP COLUMN vendor;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tubes_vendor'
        ) THEN
          ALTER INDEX idx_tubes_vendor RENAME TO idx_tubes_source;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      DECLARE
        constraint_name TEXT;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'lookup_values'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%vendor%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE lookup_values DROP CONSTRAINT ' || constraint_name;
          UPDATE lookup_values SET category = 'source' WHERE category = 'vendor';
          ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
            CHECK (category IN ('species', 'source', 'media'));
        END IF;
      END $$
    `);
  },
};
