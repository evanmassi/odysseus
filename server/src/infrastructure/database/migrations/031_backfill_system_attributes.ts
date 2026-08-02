/**
 * Migration 031 — Seed System Attributes for Existing Labs
 *
 * New labs get these from CreateLabCommandHandler; labs that already exist get them here. The seed
 * list is duplicated from domain/constants/systemAttributes.ts on purpose — a migration is a
 * snapshot of intent at a point in time and must not shift when that list is later edited.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

const SEEDS: { key: string; name: string; type: string; sortOrder: number; options: string[] }[] = [
  {
    key: 'hazard_class',
    name: 'Hazard Class',
    type: 'multi_select',
    sortOrder: 1,
    options: [
      'Explosive',
      'Flammable',
      'Oxidizing',
      'Compressed Gas',
      'Corrosive',
      'Acute Toxicity',
      'Irritant',
      'Health Hazard',
      'Environmental Hazard',
    ],
  },
  {
    key: 'physical_form',
    name: 'Physical Form',
    type: 'select',
    sortOrder: 2,
    options: ['Liquid', 'Powder', 'Lyophilized', 'Solution', 'Suspension', 'Gas'],
  },
  {
    key: 'grade',
    name: 'Grade',
    type: 'select',
    sortOrder: 3,
    options: ['ACS', 'Reagent', 'HPLC', 'Molecular Biology', 'Cell Culture', 'Technical'],
  },
  {
    key: 'storage_conditions',
    name: 'Storage Conditions',
    type: 'select',
    sortOrder: 4,
    options: ['−80 °C', '−20 °C', '4 °C', 'Room Temperature', 'Desiccated', 'Protect from Light'],
  },
];

export const migration031: Migration = {
  id: 31,
  name: 'backfill_system_attributes',
  async up(pool: Pool): Promise<void> {
    const labs = await pool.query<{ id: string }>('SELECT id FROM labs');

    for (const lab of labs.rows) {
      for (const seed of SEEDS) {
        // Hash the whole key — truncating a shared prefix collides across seeds.
        const inserted = await pool.query<{ id: string }>(
          `
          INSERT INTO attribute_definitions
            (id, lab_id, name, value_type, applies_to_catalog, sort_order, is_system, system_key, prompt_on_form)
          VALUES ('adef_' || substr(md5($1 || ':' || $5), 1, 21), $1, $2, $3, 'reagent', $4::integer, TRUE, $5, FALSE)
          ON CONFLICT DO NOTHING
          RETURNING id
        `,
          [lab.id, seed.name, seed.type, seed.sortOrder, seed.key]
        );

        if (inserted.rowCount === 0) continue;
        const definitionId = inserted.rows[0].id;

        for (const [index, value] of seed.options.entries()) {
          await pool.query(
            `INSERT INTO attribute_options (id, definition_id, value, sort_order)
             VALUES ('aopt_' || substr(md5($1 || ':' || $3::text), 1, 21), $1, $2, $3::integer)
             ON CONFLICT DO NOTHING`,
            [definitionId, value, index]
          );
        }
      }
    }
  },
};
