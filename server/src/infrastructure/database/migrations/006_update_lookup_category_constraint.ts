/**
 * Migration 006 — Update Lookup Category Constraint
 *
 * Replaces the `lookup_values` category CHECK constraint to include `'media'`.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';


export const migration006: Migration = {
  id: 6,
  name: 'update_lookup_category_constraint',
  async up(pool: Pool): Promise<void> {
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
          AND pg_get_constraintdef(con.oid) LIKE '%category%'
          AND pg_get_constraintdef(con.oid) NOT LIKE '%media%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE lookup_values DROP CONSTRAINT ' || constraint_name;
          ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
            CHECK (category IN ('species', 'source', 'media'));
        END IF;
      END $$
    `);
  }
};
