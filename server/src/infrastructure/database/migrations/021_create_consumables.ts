/**
 * Migration 021 — Consumables Inventory Tables
 *
 * Adds `consumable_categories`, `consumable_locations`, `consumable_products`,
 * `consumable_stock`, `consumable_barcodes`, `consumable_transactions`, and
 * `consumable_documents` tables, and extends the lookup category constraint
 * to include four consumable lookup categories.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration021: Migration = {
  id: 21,
  name: 'create_consumables',
  async up(pool: Pool): Promise<void> {

    // Categories — two-level hierarchy (same pattern as equipment_categories)

    await pool.query(`
      CREATE TABLE consumable_categories (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        name TEXT NOT NULL,
        parent_id TEXT REFERENCES consumable_categories(id) ON DELETE RESTRICT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX idx_consumable_categories_lab_id ON consumable_categories(lab_id)`);

    await pool.query(`
      CREATE UNIQUE INDEX uq_consumable_categories_top
      ON consumable_categories(lab_id, name)
      WHERE parent_id IS NULL
    `);

    await pool.query(`
      CREATE UNIQUE INDEX uq_consumable_categories_sub
      ON consumable_categories(lab_id, parent_id, name)
      WHERE parent_id IS NOT NULL
    `);

    // Locations — named storage zones

    await pool.query(`
      CREATE TABLE consumable_locations (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(lab_id, name)
      )
    `);

    await pool.query(`CREATE INDEX idx_consumable_locations_lab_id ON consumable_locations(lab_id)`);

    // Products — consumable product definitions

    await pool.query(`
      CREATE TABLE consumable_products (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        category_id TEXT NOT NULL REFERENCES consumable_categories(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        manufacturer TEXT,
        catalog_number TEXT,
        vendor_name TEXT,
        vendor_catalog_number TEXT,
        stock_unit TEXT,
        base_item_name TEXT,
        reorder_threshold NUMERIC,
        reorder_quantity NUMERIC,
        reorder_unit TEXT,
        unit_price NUMERIC,
        properties TEXT[] DEFAULT '{}',
        current_lot_number TEXT,
        description TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (status IN ('active', 'discontinued', 'archived'))
      )
    `);

    await pool.query(`CREATE INDEX idx_consumable_products_lab_id ON consumable_products(lab_id)`);
    await pool.query(`CREATE INDEX idx_consumable_products_lab_status ON consumable_products(lab_id, status)`);
    await pool.query(`CREATE INDEX idx_consumable_products_category ON consumable_products(category_id)`);

    // Stock — current quantity per product per location

    await pool.query(`
      CREATE TABLE consumable_stock (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES consumable_products(id) ON DELETE CASCADE,
        location_id TEXT NOT NULL REFERENCES consumable_locations(id) ON DELETE RESTRICT,
        quantity NUMERIC NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(product_id, location_id)
      )
    `);

    await pool.query(`CREATE INDEX idx_consumable_stock_product ON consumable_stock(product_id)`);

    // Barcodes — multiple per product, globally unique values

    await pool.query(`
      CREATE TABLE consumable_barcodes (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES consumable_products(id) ON DELETE CASCADE,
        barcode_value TEXT NOT NULL UNIQUE,
        barcode_type TEXT NOT NULL DEFAULT 'internal',
        is_primary BOOLEAN NOT NULL DEFAULT false,
        label TEXT,
        CHECK (barcode_type IN ('internal', 'manufacturer_sku', 'upc'))
      )
    `);

    await pool.query(`CREATE INDEX idx_consumable_barcodes_product ON consumable_barcodes(product_id)`);

    // Transactions — audit trail of every stock change

    await pool.query(`
      CREATE TABLE consumable_transactions (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES consumable_products(id),
        location_id TEXT NOT NULL REFERENCES consumable_locations(id),
        lab_id TEXT NOT NULL REFERENCES labs(id),
        type TEXT NOT NULL,
        quantity_change NUMERIC NOT NULL,
        quantity_after NUMERIC NOT NULL,
        lot_number TEXT,
        expiration_date DATE,
        po_number TEXT,
        cost NUMERIC,
        performed_by TEXT NOT NULL REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        voided_at TIMESTAMPTZ,
        voided_by TEXT REFERENCES users(id),
        void_reason TEXT,
        related_transaction_id TEXT REFERENCES consumable_transactions(id),
        CHECK (type IN ('received', 'consumed', 'count_adjustment', 'disposed', 'void_reversal'))
      )
    `);

    await pool.query(`CREATE INDEX idx_consumable_transactions_product ON consumable_transactions(product_id)`);
    await pool.query(`CREATE INDEX idx_consumable_transactions_lab ON consumable_transactions(lab_id)`);
    await pool.query(`CREATE INDEX idx_consumable_transactions_related ON consumable_transactions(related_transaction_id) WHERE related_transaction_id IS NOT NULL`);

    // Documents — linked docs, SOPs, product page URLs

    await pool.query(`
      CREATE TABLE consumable_documents (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES consumable_products(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        url TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX idx_consumable_documents_product ON consumable_documents(product_id)`);

    // Packaging levels — per-product hierarchical unit chain

    await pool.query(`
      CREATE TABLE consumable_packaging_levels (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES consumable_products(id) ON DELETE CASCADE,
        unit_name TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        parent_unit TEXT,
        UNIQUE(product_id, unit_name)
      )
    `);

    await pool.query(`CREATE INDEX idx_consumable_packaging_levels_product ON consumable_packaging_levels(product_id)`);

    // Extend lookup category constraint to include consumable categories

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
          AND pg_get_constraintdef(con.oid) NOT LIKE '%consumable_product_property%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE lookup_values DROP CONSTRAINT ' || constraint_name;
          ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
            CHECK (category IN (
              'species', 'source', 'media', 'specimen_type', 'equipment_maintenance_type',
              'consumable_product_property', 'consumable_stock_unit', 'consumable_vendor', 'consumable_manufacturer'
            ));
        END IF;
      END $$
    `);
  },
};
