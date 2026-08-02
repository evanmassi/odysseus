/**
 * Migration 032 — Supplies onto the Shared Unit Registry
 *
 * Retires the `supply_stock_unit` lookup in favour of the dimension-tagged registry every other
 * catalog already uses. A free-text lookup can't offer `mg/mL` without also offering `mL`, and it
 * happily holds "ug", "µg" and "mcg" as three separate units.
 *
 * Unit names are matched by string equality across five columns — the packaging chain walks
 * `parent_unit` to `unit_name` to `stock_unit` — so every column is rewritten together or the
 * conversions silently detach. Values the registry doesn't know become lab custom units, which
 * render verbatim.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

const UNIT_COLUMNS: { table: string; columns: string[] }[] = [
  { table: 'supply_items', columns: ['stock_unit', 'reorder_unit', 'reorder_threshold_unit'] },
  { table: 'supply_packaging_levels', columns: ['unit_name', 'parent_unit'] },
];

/** Countable registry ids — the only kind a supply stock unit was ever set to. */
const REGISTRY_COUNT_UNITS = ['vial', 'tube', 'each', 'box', 'pack', 'case'];

export const migration032: Migration = {
  id: 32,
  name: 'supplies_onto_unit_registry',
  async up(pool: Pool): Promise<void> {
    // Case-insensitive match onto the registry id: "Box" and "BOX" are both `box`.
    for (const { table, columns } of UNIT_COLUMNS) {
      for (const column of columns) {
        await pool.query(
          `UPDATE ${table} SET ${column} = LOWER(${column})
           WHERE ${column} IS NOT NULL AND LOWER(${column}) = ANY($1)`,
          [REGISTRY_COUNT_UNITS]
        );
      }
    }

    // Anything the registry doesn't cover stays as written and becomes a lab custom unit, so the
    // dropdown can still offer it once custom-unit management ships.
    for (const { table, columns } of UNIT_COLUMNS) {
      const labJoin =
        table === 'supply_items'
          ? `SELECT DISTINCT lab_id, ${columns.join(', ')} FROM supply_items`
          : `SELECT DISTINCT i.lab_id, ${columns.map(c => `p.${c}`).join(', ')}
             FROM supply_packaging_levels p JOIN supply_items i ON i.id = p.item_id`;

      for (const column of columns) {
        await pool.query(
          `INSERT INTO custom_units (id, lab_id, label, kind, sort_order, created_at, updated_at)
           SELECT 'cunit_' || substr(md5(random()::text), 1, 21), src.lab_id, src.${column}, 'count', 0, NOW(), NOW()
           FROM (${labJoin}) src
           WHERE src.${column} IS NOT NULL
             AND src.${column} <> ''
             AND NOT (src.${column} = ANY($1))
             AND NOT EXISTS (
               SELECT 1 FROM custom_units cu
               WHERE cu.lab_id = src.lab_id AND cu.label = src.${column}
             )`,
          [REGISTRY_COUNT_UNITS]
        );
      }
    }

    await pool.query(`DELETE FROM lookup_values WHERE category = 'supply_stock_unit'`);

    await pool.query(
      `ALTER TABLE lookup_values DROP CONSTRAINT IF EXISTS lookup_values_category_check`
    );
    await pool.query(`
      ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
      CHECK (category IN (
        'species', 'source', 'media', 'specimen_type', 'equipment_maintenance_type',
        'supply_item_property', 'reagent_type', 'vendor', 'manufacturer'
      ))
    `);
  },
};
