/**
 * Migration 029 — Shared Vendor and Manufacturer Vocabularies
 *
 * Collapses the per-catalog vendor and manufacturer lookup categories into one lab-wide list each,
 * and gives equipment the vendor fields supplies and reagents already carry. A lab buys from one set
 * of companies; splitting the vocabulary per catalog only made an admin type each name twice.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

// Reagents never had their own vendor vocabulary — 027's category CHECK admits only `reagent_type`.
const MERGES: { from: string; to: string }[] = [
  { from: 'supply_vendor', to: 'vendor' },
  { from: 'supply_manufacturer', to: 'manufacturer' },
];

export const migration029: Migration = {
  id: 29,
  name: 'merge_vendor_manufacturer',
  async up(pool: Pool): Promise<void> {
    // The CHECK has to accept both old and new names while rows are being moved.
    await pool.query(`ALTER TABLE lookup_values DROP CONSTRAINT IF EXISTS lookup_values_category_check`);

    for (const { from, to } of MERGES) {
      // UNIQUE(lab_id, category, value) — drop rows the target already has, then move the rest.
      await pool.query(
        `DELETE FROM lookup_values a
         WHERE a.category = $1
           AND EXISTS (
             SELECT 1 FROM lookup_values b
             WHERE b.category = $2 AND b.lab_id = a.lab_id AND b.value = a.value
           )`,
        [from, to]
      );
      await pool.query(`UPDATE lookup_values SET category = $2 WHERE category = $1`, [from, to]);
    }

    // Equipment's manufacturer was free text with no vocabulary behind it; seed the merged list with
    // what labs already typed so existing items resolve against their own dropdown.
    await pool.query(`
      INSERT INTO lookup_values (id, category, value, sort_order, is_active, lab_id, created_at, updated_at)
      SELECT 'lkp_' || substr(md5(e.lab_id || ':' || e.manufacturer), 1, 21),
             'manufacturer', e.manufacturer, 0, TRUE, e.lab_id, NOW(), NOW()
      FROM (
        SELECT DISTINCT lab_id, manufacturer
        FROM equipment_items
        WHERE manufacturer IS NOT NULL AND manufacturer <> ''
      ) e
      WHERE NOT EXISTS (
        SELECT 1 FROM lookup_values lv
        WHERE lv.category = 'manufacturer' AND lv.lab_id = e.lab_id AND lv.value = e.manufacturer
      )
    `);

    await pool.query(`ALTER TABLE equipment_items ADD COLUMN vendor_name TEXT`);
    await pool.query(`ALTER TABLE equipment_items ADD COLUMN vendor_catalog_number TEXT`);

    await pool.query(`
      ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
      CHECK (category IN (
        'species', 'source', 'media', 'specimen_type', 'equipment_maintenance_type',
        'supply_item_property', 'supply_stock_unit', 'reagent_type',
        'vendor', 'manufacturer'
      ))
    `);
  },
};
