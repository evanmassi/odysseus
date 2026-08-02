/**
 * Migration 027 — Reagent Inventory Tables
 *
 * Adds the reagent catalog: categories, locations, items, per-lot stock,
 * transactions, documents, barcodes, packaging levels, the lab-configurable
 * attribute system, and lab custom units. Extends the lookup category
 * constraint to include `reagent_type`.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

/** Definitions are lab-wide; values are per-catalog so each keeps a real FK to its own items. */
const ATTRIBUTE_VALUE_CATALOGS = [
  { prefix: 'reagent', items: 'reagent_items' },
  { prefix: 'supply', items: 'supply_items' },
  { prefix: 'equipment', items: 'equipment_items' },
];

export const migration027: Migration = {
  id: 27,
  name: 'create_reagents',
  async up(pool: Pool): Promise<void> {
    // Categories — two-level hierarchy (same pattern as supply_categories)

    await pool.query(`
      CREATE TABLE reagent_categories (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        name TEXT NOT NULL,
        parent_id TEXT REFERENCES reagent_categories(id) ON DELETE RESTRICT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX idx_reagent_categories_lab_id ON reagent_categories(lab_id)`);

    await pool.query(`
      CREATE UNIQUE INDEX uq_reagent_categories_top
      ON reagent_categories(lab_id, name)
      WHERE parent_id IS NULL
    `);

    await pool.query(`
      CREATE UNIQUE INDEX uq_reagent_categories_sub
      ON reagent_categories(lab_id, parent_id, name)
      WHERE parent_id IS NOT NULL
    `);

    // Locations — the lab-wide place tree, shared by every catalog (supplies migrate onto it in 030)

    await pool.query(`
      CREATE TABLE locations (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        name TEXT NOT NULL,
        description TEXT,
        parent_id TEXT REFERENCES locations(id) ON DELETE RESTRICT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(lab_id, name)
      )
    `);

    await pool.query(`CREATE INDEX idx_locations_lab_id ON locations(lab_id)`);
    await pool.query(`CREATE INDEX idx_locations_parent ON locations(parent_id)`);

    // Items — reagent definitions (SKU-level metadata + chemistry/safety columns)

    await pool.query(`
      CREATE TABLE reagent_items (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        category_id TEXT NOT NULL REFERENCES reagent_categories(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        manufacturer TEXT,
        catalog_number TEXT,
        vendor_name TEXT,
        vendor_catalog_number TEXT,
        stock_unit TEXT,
        reagent_type TEXT,
        cas_number TEXT,
        concentration NUMERIC,
        concentration_unit TEXT,
        expiry_warning_days INTEGER,
        reorder_threshold NUMERIC,
        reorder_threshold_unit TEXT,
        reorder_quantity NUMERIC,
        reorder_unit TEXT,
        unit_price NUMERIC,
        description TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (status IN ('active', 'discontinued', 'archived'))
      )
    `);

    await pool.query(`CREATE INDEX idx_reagent_items_lab_id ON reagent_items(lab_id)`);
    await pool.query(`CREATE INDEX idx_reagent_items_lab_status ON reagent_items(lab_id, status)`);
    await pool.query(`CREATE INDEX idx_reagent_items_category ON reagent_items(category_id)`);

    // Lots — the stock unit: quantity, expiry, and status per item x lot x location

    await pool.query(`
      CREATE TABLE reagent_lots (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES reagent_items(id) ON DELETE CASCADE,
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        lot_number TEXT,
        quantity NUMERIC NOT NULL DEFAULT 0,
        expiration_date DATE,
        opened_date DATE,
        received_date DATE,
        concentration NUMERIC,
        concentration_unit TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(item_id, location_id, lot_number),
        CHECK (status IN ('active', 'depleted', 'disposed'))
      )
    `);

    await pool.query(`CREATE INDEX idx_reagent_lots_item ON reagent_lots(item_id)`);
    await pool.query(`CREATE INDEX idx_reagent_lots_location ON reagent_lots(location_id)`);
    await pool.query(
      `CREATE INDEX idx_reagent_lots_expiration ON reagent_lots(expiration_date) WHERE expiration_date IS NOT NULL`
    );

    // Transactions — append-only ledger; each row references the lot it moved

    await pool.query(`
      CREATE TABLE reagent_transactions (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES reagent_items(id),
        lot_id TEXT REFERENCES reagent_lots(id) ON DELETE SET NULL,
        location_id TEXT NOT NULL REFERENCES locations(id),
        lab_id TEXT NOT NULL REFERENCES labs(id),
        type TEXT NOT NULL,
        quantity_change NUMERIC NOT NULL,
        quantity_after NUMERIC NOT NULL,
        po_number TEXT,
        cost NUMERIC,
        performed_by TEXT NOT NULL REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        voided_at TIMESTAMPTZ,
        voided_by TEXT REFERENCES users(id),
        void_reason TEXT,
        related_transaction_id TEXT REFERENCES reagent_transactions(id),
        CHECK (type IN ('received', 'issued', 'count_adjustment', 'disposed', 'void_reversal'))
      )
    `);

    await pool.query(`CREATE INDEX idx_reagent_transactions_item ON reagent_transactions(item_id)`);
    await pool.query(`CREATE INDEX idx_reagent_transactions_lab ON reagent_transactions(lab_id)`);
    await pool.query(
      `CREATE INDEX idx_reagent_transactions_lot ON reagent_transactions(lot_id) WHERE lot_id IS NOT NULL`
    );
    await pool.query(
      `CREATE INDEX idx_reagent_transactions_related ON reagent_transactions(related_transaction_id) WHERE related_transaction_id IS NOT NULL`
    );

    // Documents — linked docs, SDS/spec sheets, item page URLs

    await pool.query(`
      CREATE TABLE reagent_documents (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES reagent_items(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        url TEXT NOT NULL,
        notes TEXT,
        doc_type TEXT CHECK (doc_type IN ('sds', 'spec_sheet', 'coa', 'protocol', 'other')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX idx_reagent_documents_item ON reagent_documents(item_id)`);

    // Barcodes — item-level (product) or lot-level (physical bottle) via lot_id

    await pool.query(`
      CREATE TABLE reagent_barcodes (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES reagent_items(id) ON DELETE CASCADE,
        lot_id TEXT REFERENCES reagent_lots(id) ON DELETE CASCADE,
        barcode_value TEXT NOT NULL UNIQUE,
        barcode_type TEXT NOT NULL DEFAULT 'internal',
        is_primary BOOLEAN NOT NULL DEFAULT false,
        label TEXT,
        CHECK (barcode_type IN ('internal', 'manufacturer_sku', 'upc'))
      )
    `);

    await pool.query(`CREATE INDEX idx_reagent_barcodes_item ON reagent_barcodes(item_id)`);
    await pool.query(
      `CREATE INDEX idx_reagent_barcodes_lot ON reagent_barcodes(lot_id) WHERE lot_id IS NOT NULL`
    );

    // Packaging levels — per-item hierarchical unit chain

    await pool.query(`
      CREATE TABLE reagent_packaging_levels (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES reagent_items(id) ON DELETE CASCADE,
        unit_name TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        parent_unit TEXT,
        UNIQUE(item_id, unit_name)
      )
    `);

    await pool.query(
      `CREATE INDEX idx_reagent_packaging_levels_item ON reagent_packaging_levels(item_id)`
    );

    // Attribute system — lab-wide definitions and curated option vocabularies, scoped to a catalog
    // and, for reagents, to any number of reagent types (empty meaning all of them). Values stay
    // per-catalog so each keeps a real FK to its own items.

    await pool.query(`
      CREATE TABLE attribute_definitions (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        name TEXT NOT NULL,
        value_type TEXT NOT NULL,
        applies_to_catalog TEXT,
        applies_to_types TEXT[] NOT NULL DEFAULT '{}',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_system BOOLEAN NOT NULL DEFAULT false,
        system_key TEXT,
        prompt_on_form BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(lab_id, name),
        CHECK (value_type IN ('select', 'multi_select', 'text', 'number')),
        CHECK (applies_to_catalog IN ('reagent', 'supply', 'equipment'))
      )
    `);

    await pool.query(`CREATE INDEX idx_attribute_definitions_lab ON attribute_definitions(lab_id)`);
    await pool.query(`
      CREATE UNIQUE INDEX uq_attribute_definitions_system_key
      ON attribute_definitions(lab_id, system_key)
      WHERE system_key IS NOT NULL
    `);

    await pool.query(`
      CREATE TABLE attribute_options (
        id TEXT PRIMARY KEY,
        definition_id TEXT NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        UNIQUE(definition_id, value)
      )
    `);

    await pool.query(
      `CREATE INDEX idx_attribute_options_definition ON attribute_options(definition_id)`
    );

    for (const { prefix, items } of ATTRIBUTE_VALUE_CATALOGS) {
      const table = `${prefix}_attribute_values`;

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

    // Custom units — lab-scoped supplement to the fixed unit registry

    await pool.query(`
      CREATE TABLE custom_units (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        label TEXT NOT NULL,
        kind TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(lab_id, label),
        CHECK (kind IN (
          'mass', 'volume', 'molarity', 'mass-conc', 'count-conc', 'percent',
          'activity', 'activity-conc', 'fold', 'cell-conc', 'count'
        ))
      )
    `);

    await pool.query(`CREATE INDEX idx_custom_units_lab ON custom_units(lab_id)`);

    // Extend lookup category constraint to include reagent categories

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
          AND pg_get_constraintdef(con.oid) NOT LIKE '%reagent_type%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE lookup_values DROP CONSTRAINT ' || constraint_name;
          ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
            CHECK (category IN (
              'species', 'source', 'media', 'specimen_type', 'equipment_maintenance_type',
              'supply_item_property', 'supply_stock_unit', 'supply_vendor', 'supply_manufacturer',
              'reagent_type'
            ));
        END IF;
      END $$
    `);
  },
};
