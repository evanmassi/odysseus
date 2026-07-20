/**
 * Migration 009 — Create Full-Text Search
 *
 * Adds tsvector column, trigram indexes, search trigger, and rebuilds all search vectors.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration009: Migration = {
  id: 9,
  name: 'create_full_text_search',
  async up(pool: Pool): Promise<void> {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'search_vector'
        ) THEN
          ALTER TABLE tubes ADD COLUMN search_vector tsvector;
        END IF;
      END $$
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tubes_search_vector
      ON tubes USING GIN(search_vector)
    `);

    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_tubes_cell_type_trgm ON tubes USING GIN(cell_type gin_trgm_ops)'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_tubes_donor_internal_trgm ON tubes USING GIN(donor_internal_id gin_trgm_ops)'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_tubes_donor_source_trgm ON tubes USING GIN(donor_source_id gin_trgm_ops)'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_tubes_lot_number_trgm ON tubes USING GIN(lot_number gin_trgm_ops)'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_tubes_notes_trgm ON tubes USING GIN(notes gin_trgm_ops)'
    );

    await pool.query(`
      CREATE OR REPLACE FUNCTION tubes_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.cell_type, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.donor_internal_id, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.donor_source_id, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.species, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.lot_number, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.media_type, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.catalog_number, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.culture_condition, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.source, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.concentration, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.created_by_name, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.media_supplements, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.media_selection, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.passage_number::TEXT, '')), 'C');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `);

    await pool.query(`DROP TRIGGER IF EXISTS tubes_search_vector_trigger ON tubes`);
    await pool.query(`
      CREATE TRIGGER tubes_search_vector_trigger
      BEFORE INSERT OR UPDATE ON tubes
      FOR EACH ROW EXECUTE FUNCTION tubes_search_vector_update()
    `);

    await pool.query(`UPDATE tubes SET updated_at = updated_at`);
  },
};
