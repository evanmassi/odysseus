/**
 * Migration 035 — Supply Item Property onto Attributes
 *
 * `supply_item_property` was a degenerate attribute system — a flat lookup written into a
 * `text[]`. Now that supplies carry real attribute values, each lab's vocabulary becomes a
 * multi-select definition, each item's entries become value rows against it, and both the lookup
 * category and the column retire.
 */

import { generateId } from '@domain/utils/generateId';

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration035: Migration = {
  id: 35,
  name: 'retire_supply_item_property',
  async up(pool: Pool): Promise<void> {
    const { rows } = await pool.query<{ lab_id: string; value: string; sort_order: number }>(
      `SELECT lab_id, value, sort_order FROM lookup_values
       WHERE category = 'supply_item_property'
       ORDER BY lab_id, sort_order, value`
    );

    const valuesByLab = new Map<string, { value: string; sortOrder: number }[]>();
    for (const row of rows) {
      const bucket = valuesByLab.get(row.lab_id) ?? [];
      bucket.push({ value: row.value, sortOrder: row.sort_order });
      valuesByLab.set(row.lab_id, bucket);
    }

    for (const [labId, values] of valuesByLab) {
      const definitionId = generateId('adef');
      await pool.query(
        `INSERT INTO attribute_definitions
           (id, lab_id, name, value_type, applies_to_catalog, applies_to_types, sort_order,
            is_system, system_key, prompt_on_form)
         VALUES ($1, $2, 'Product Property', 'multi_select', 'supply', '{}', 0, false, NULL, false)`,
        [definitionId, labId]
      );

      for (const { value, sortOrder } of values) {
        await pool.query(
          `INSERT INTO attribute_options (id, definition_id, value, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [generateId('aopt'), definitionId, value, sortOrder]
        );
      }

      // One row per item per property it held. A property an item carries that never made it into
      // the lookup has no option to point at and is dropped — it had no dropdown entry either.
      await pool.query(
        `INSERT INTO supply_attribute_values (id, item_id, definition_id, value_option_id)
         SELECT 'satv_' || substr(md5(i.id || ':' || o.id), 1, 21), i.id, $1, o.id
         FROM supply_items i
         JOIN LATERAL unnest(i.properties) AS prop(value) ON TRUE
         JOIN attribute_options o ON o.definition_id = $1 AND o.value = prop.value
         WHERE i.lab_id = $2`,
        [definitionId, labId]
      );
    }

    await pool.query(`DELETE FROM lookup_values WHERE category = 'supply_item_property'`);

    await pool.query(
      `ALTER TABLE lookup_values DROP CONSTRAINT IF EXISTS lookup_values_category_check`
    );
    await pool.query(`
      ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
      CHECK (category IN (
        'species', 'source', 'media', 'specimen_type', 'equipment_maintenance_type',
        'reagent_type', 'vendor', 'manufacturer'
      ))
    `);

    await pool.query(`ALTER TABLE supply_items DROP COLUMN properties`);
  },
};
