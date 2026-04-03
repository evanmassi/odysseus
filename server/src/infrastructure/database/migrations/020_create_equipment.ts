/**
 * Migration 020 — Equipment Inventory Tables
 *
 * Adds `equipment_categories`, `equipment_items`, `equipment_documents`, and
 * `equipment_maintenance_log` tables, and extends the lookup category constraint
 * to include `equipment_maintenance_type`.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration020: Migration = {
  id: 20,
  name: 'create_equipment',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE equipment_categories (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        name TEXT NOT NULL,
        parent_id TEXT REFERENCES equipment_categories(id) ON DELETE RESTRICT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX idx_equipment_categories_lab_id ON equipment_categories(lab_id)`);

    // No duplicate top-level category names per lab
    await pool.query(`
      CREATE UNIQUE INDEX uq_equipment_categories_top
      ON equipment_categories(lab_id, name)
      WHERE parent_id IS NULL
    `);

    // No duplicate subcategory names under the same parent per lab
    await pool.query(`
      CREATE UNIQUE INDEX uq_equipment_categories_sub
      ON equipment_categories(lab_id, parent_id, name)
      WHERE parent_id IS NOT NULL
    `);

    await pool.query(`
      CREATE TABLE equipment_items (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        category_id TEXT NOT NULL REFERENCES equipment_categories(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        serial_number TEXT,
        manufacturer TEXT,
        model TEXT,
        description TEXT,
        location TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        condition_notes TEXT,
        purchase_date DATE,
        warranty_expiration DATE,
        purchase_cost NUMERIC,
        asset_tag TEXT,
        next_maintenance_date DATE,
        decommission_date DATE,
        decommission_reason TEXT,
        disposal_method TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX idx_equipment_items_lab_id ON equipment_items(lab_id)`);
    await pool.query(`CREATE INDEX idx_equipment_items_lab_status ON equipment_items(lab_id, status)`);
    await pool.query(`CREATE INDEX idx_equipment_items_category ON equipment_items(category_id)`);

    // Asset tags must be unique per lab when set
    await pool.query(`
      CREATE UNIQUE INDEX uq_equipment_items_asset_tag
      ON equipment_items(lab_id, asset_tag)
      WHERE asset_tag IS NOT NULL
    `);

    await pool.query(`
      CREATE TABLE equipment_documents (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        url TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX idx_equipment_documents_item ON equipment_documents(item_id)`);

    await pool.query(`
      CREATE TABLE equipment_maintenance_log (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
        date_performed DATE NOT NULL,
        maintenance_type TEXT NOT NULL,
        performed_by TEXT,
        technician TEXT,
        description TEXT,
        next_scheduled_date DATE,
        cost NUMERIC,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX idx_equipment_maintenance_item ON equipment_maintenance_log(item_id)`);

    // Extend lookup category constraint to include 'equipment_maintenance_type'
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
          AND pg_get_constraintdef(con.oid) NOT LIKE '%equipment_maintenance_type%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE lookup_values DROP CONSTRAINT ' || constraint_name;
          ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
            CHECK (category IN ('species', 'source', 'media', 'specimen_type', 'equipment_maintenance_type'));
        END IF;
      END $$
    `);
  },
};
