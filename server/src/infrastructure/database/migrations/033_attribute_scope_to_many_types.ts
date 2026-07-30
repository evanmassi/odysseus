/**
 * Migration 033 — Attribute Scoping to Many Types
 *
 * `applies_to_type` held one reagent type or NULL for all, which left no way to say an attribute
 * belongs on antibodies and buffers but not kits — so anything in between had to be scoped to
 * everything. The array carries the same information plus that middle: empty means all, which is
 * what NULL meant, and NOT NULL keeps "applies to everything" to a single representation.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration033: Migration = {
  id: 33,
  name: 'attribute_scope_to_many_types',
  async up(pool: Pool): Promise<void> {
    await pool.query(
      `ALTER TABLE attribute_definitions ADD COLUMN applies_to_types TEXT[] NOT NULL DEFAULT '{}'`
    );

    await pool.query(
      `UPDATE attribute_definitions
       SET applies_to_types = ARRAY[applies_to_type]
       WHERE applies_to_type IS NOT NULL AND applies_to_type <> ''`
    );

    await pool.query(`ALTER TABLE attribute_definitions DROP COLUMN applies_to_type`);
  },
};
