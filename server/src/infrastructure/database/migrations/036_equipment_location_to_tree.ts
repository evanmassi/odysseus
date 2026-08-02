/**
 * Migration 036 — Equipment Locations Join the Shared Tree
 *
 * Equipment's free-text `location` becomes a nullable FK to the lab-wide `locations` table, so a
 * rename reaches all three catalogs. Free text drifts into compound strings ("Main lab, Hood
 * X0F"), so the backfill splits on commas and reuses existing nodes by name — unique per lab.
 */

import { LAB_LOCATION_MAX_DEPTH } from '@odysseus/shared-schemas';

import { generateId } from '@domain/utils/generateId';

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

async function resolveLocationId(pool: Pool, labId: string, rawValue: string): Promise<string> {
  const parts = rawValue
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  // Deeper than the tree can hold, or nothing usable after trimming: keep the text as one node
  // rather than inventing a hierarchy the guard would refuse.
  const chain = parts.length > 0 && parts.length <= LAB_LOCATION_MAX_DEPTH ? parts : [rawValue.trim()];

  let parentId: string | null = null;
  let nodeId = '';

  for (const name of chain) {
    const existing = await pool.query<{ id: string }>(
      'SELECT id FROM locations WHERE lab_id = $1 AND name = $2',
      [labId, name]
    );

    if (existing.rows.length > 0) {
      nodeId = existing.rows[0].id;
    } else {
      nodeId = generateId('loc');
      await pool.query(
        `INSERT INTO locations (id, lab_id, name, parent_id, sort_order)
         VALUES ($1, $2, $3, $4, 0)`,
        [nodeId, labId, name, parentId]
      );
    }
    parentId = nodeId;
  }

  return nodeId;
}

export const migration036: Migration = {
  id: 36,
  name: 'equipment_location_to_tree',
  async up(pool: Pool): Promise<void> {
    await pool.query(
      `ALTER TABLE equipment_items
       ADD COLUMN location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT`
    );

    const { rows } = await pool.query<{ lab_id: string; location: string }>(
      `SELECT DISTINCT lab_id, location FROM equipment_items
       WHERE location IS NOT NULL AND btrim(location) <> ''`
    );

    for (const row of rows) {
      const locationId = await resolveLocationId(pool, row.lab_id, row.location);
      await pool.query(
        'UPDATE equipment_items SET location_id = $1 WHERE lab_id = $2 AND location = $3',
        [locationId, row.lab_id, row.location]
      );
    }

    await pool.query(`ALTER TABLE equipment_items DROP COLUMN location`);
  },
};
