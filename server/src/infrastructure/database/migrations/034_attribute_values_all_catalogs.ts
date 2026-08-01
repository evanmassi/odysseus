/**
 * Migration 034 — Attribute Values for Supplies and Equipment
 *
 * The definition and option vocabulary has been lab-wide since 027, with a catalog scope that
 * already admits all three suites — but only reagents had somewhere to store a value. These two
 * tables mirror `reagent_attribute_values` exactly, each keeping a real FK to its own items,
 * which is the referential integrity the normalized model exists for.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

const CATALOGS = [
  { table: 'supply_attribute_values', items: 'supply_items', prefix: 'supply' },
  { table: 'equipment_attribute_values', items: 'equipment_items', prefix: 'equipment' },
];

export const migration034: Migration = {
  id: 34,
  name: 'attribute_values_all_catalogs',
  async up(pool: Pool): Promise<void> {
    for (const { table, items, prefix } of CATALOGS) {
      await pool.query(`
        CREATE TABLE ${table} (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL REFERENCES ${items}(id) ON DELETE CASCADE,
          definition_id TEXT NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
          value_option_id TEXT REFERENCES attribute_options(id) ON DELETE CASCADE,
          value_text TEXT,
          value_number NUMERIC
        )
      `);

      await pool.query(`CREATE INDEX idx_${prefix}_attribute_values_item ON ${table}(item_id)`);
      await pool.query(
        `CREATE INDEX idx_${prefix}_attribute_values_definition ON ${table}(definition_id)`
      );
      await pool.query(
        `CREATE INDEX idx_${prefix}_attribute_values_option ON ${table}(value_option_id) WHERE value_option_id IS NOT NULL`
      );
    }
  },
};
