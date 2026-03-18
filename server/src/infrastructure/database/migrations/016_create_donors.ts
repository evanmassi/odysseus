/**
 * Migration 016 — Donor Registry Tables
 *
 * Adds `donors` and `donor_collection_history` tables for persistent donor records,
 * and extends the lookup category constraint to include `specimen_type`.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration016: Migration = {
  id: 16,
  name: 'create_donors',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE donors (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        donor_source_id TEXT,
        donor_internal_id TEXT,
        species TEXT,
        age TEXT,
        sex TEXT,
        ethnicity TEXT,
        clinical_status TEXT,
        diagnosis TEXT,
        disease_stage TEXT,
        notes TEXT,
        is_curated BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT donors_has_at_least_one_id
          CHECK (donor_source_id IS NOT NULL OR donor_internal_id IS NOT NULL)
      )
    `);

    await pool.query(`CREATE INDEX idx_donors_lab_id ON donors(lab_id)`);
    await pool.query(`CREATE INDEX idx_donors_source_id ON donors(lab_id, donor_source_id) WHERE donor_source_id IS NOT NULL`);
    await pool.query(`CREATE INDEX idx_donors_internal_id ON donors(lab_id, donor_internal_id) WHERE donor_internal_id IS NOT NULL`);
    await pool.query(`CREATE INDEX idx_donors_uncurated ON donors(lab_id, is_curated) WHERE is_curated = FALSE`);

    // Trigram indexes for autocomplete search (pg_trgm enabled in migration 009)
    await pool.query(`CREATE INDEX idx_donors_source_id_trgm ON donors USING gin (donor_source_id gin_trgm_ops) WHERE donor_source_id IS NOT NULL`);
    await pool.query(`CREATE INDEX idx_donors_internal_id_trgm ON donors USING gin (donor_internal_id gin_trgm_ops) WHERE donor_internal_id IS NOT NULL`);

    await pool.query(`
      CREATE TABLE donor_collection_history (
        id TEXT PRIMARY KEY,
        donor_id TEXT NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
        collection_date DATE NOT NULL,
        specimen_type TEXT,
        source TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX idx_donor_collection_history_donor_id ON donor_collection_history(donor_id)`);

    // Extend lookup category constraint to include 'specimen_type'
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
          AND pg_get_constraintdef(con.oid) NOT LIKE '%specimen_type%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE lookup_values DROP CONSTRAINT ' || constraint_name;
          ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
            CHECK (category IN ('species', 'source', 'media', 'specimen_type'));
        END IF;
      END $$
    `);

    // Backfill donor stubs from existing tube data
    await pool.query(`
      INSERT INTO donors (id, lab_id, donor_source_id, donor_internal_id, species, is_curated, created_at, updated_at)
      SELECT
        'donor_' || gen_random_uuid(),
        lab_id,
        donor_source_id,
        donor_internal_id,
        MIN(species),
        false,
        NOW(),
        NOW()
      FROM tubes
      WHERE donor_source_id IS NOT NULL OR donor_internal_id IS NOT NULL
      GROUP BY lab_id, donor_source_id, donor_internal_id
    `);
  }
};
