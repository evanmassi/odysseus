/**
 * Migration 030 — Supply Locations Join the Shared Tree
 *
 * Moves supply_locations rows into the lab-wide `locations` table created in 027, repoints the stock
 * and transaction foreign keys, and drops the old table. Row ids are preserved so the FKs stay valid.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration030: Migration = {
  id: 30,
  name: 'merge_supply_locations',
  async up(pool: Pool): Promise<void> {
    // A lab could already have a location of the same name from the reagent side.
    await pool.query(`
      INSERT INTO locations (id, lab_id, name, description, parent_id, sort_order, created_at, updated_at)
      SELECT sl.id, sl.lab_id, sl.name, sl.description, NULL, sl.sort_order, sl.created_at, sl.updated_at
      FROM supply_locations sl
      WHERE NOT EXISTS (
        SELECT 1 FROM locations l WHERE l.lab_id = sl.lab_id AND l.name = sl.name
      )
    `);

    // Anything skipped above already exists under a different id; repoint its children first.
    await pool.query(`
      UPDATE supply_stock s SET location_id = l.id
      FROM supply_locations sl
      JOIN locations l ON l.lab_id = sl.lab_id AND l.name = sl.name
      WHERE s.location_id = sl.id AND l.id <> sl.id
    `);
    await pool.query(`
      UPDATE supply_transactions t SET location_id = l.id
      FROM supply_locations sl
      JOIN locations l ON l.lab_id = sl.lab_id AND l.name = sl.name
      WHERE t.location_id = sl.id AND l.id <> sl.id
    `);

    await pool.query(`ALTER TABLE supply_stock DROP CONSTRAINT supply_stock_location_id_fkey`);
    await pool.query(`
      ALTER TABLE supply_stock ADD CONSTRAINT supply_stock_location_id_fkey
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT
    `);

    await pool.query(
      `ALTER TABLE supply_transactions DROP CONSTRAINT supply_transactions_location_id_fkey`
    );
    await pool.query(`
      ALTER TABLE supply_transactions ADD CONSTRAINT supply_transactions_location_id_fkey
      FOREIGN KEY (location_id) REFERENCES locations(id)
    `);

    await pool.query(`DROP TABLE supply_locations`);
  },
};
