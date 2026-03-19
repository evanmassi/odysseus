/**
 * Migration 017 — Enhance Search Vector with Identifier Normalization
 *
 * Updates the tsvector trigger to index stripped/collapsed forms of identifiers
 * (e.g., "LP #8" also indexes as "lp8") so the tsvector layer catches identifier
 * searches without needing ILIKE fallback layers.
 *
 * Query-side counterpart: generateAlphanumericVariants() in searchQueryPreprocessing.ts
 * produces matching collapsed forms at query time. These must stay in sync.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration017: Migration = {
  id: 17,
  name: 'enhance_search_vector',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE OR REPLACE FUNCTION normalize_identifier(input TEXT) RETURNS TEXT AS $$
      BEGIN
        IF input IS NULL OR input = '' THEN
          RETURN '';
        END IF;
        RETURN lower(regexp_replace(input, '[^a-zA-Z0-9]', '', 'g'));
      END
      $$ LANGUAGE plpgsql IMMUTABLE
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION tubes_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.cell_type, '')), 'A') ||
          setweight(to_tsvector('simple', normalize_identifier(COALESCE(NEW.cell_type, ''))), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.donor_internal_id, '')), 'A') ||
          setweight(to_tsvector('simple', normalize_identifier(COALESCE(NEW.donor_internal_id, ''))), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.donor_source_id, '')), 'A') ||
          setweight(to_tsvector('simple', normalize_identifier(COALESCE(NEW.donor_source_id, ''))), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.species, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.lot_number, '')), 'B') ||
          setweight(to_tsvector('simple', normalize_identifier(COALESCE(NEW.lot_number, ''))), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.media_type, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.catalog_number, '')), 'B') ||
          setweight(to_tsvector('simple', normalize_identifier(COALESCE(NEW.catalog_number, ''))), 'B') ||
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

    await pool.query(`UPDATE tubes SET updated_at = updated_at`);
  }
};
