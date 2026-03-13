/**
 * Migration 005 — Flatten Media JSON
 *
 * Extracts `tubes.media` JSON into `media_type`, `media_supplements`, `media_selection` columns.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';


export const migration005: Migration = {
  id: 5,
  name: 'flatten_media_json',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'media'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tubes' AND column_name = 'media_type'
          ) THEN
            ALTER TABLE tubes ADD COLUMN media_type TEXT;
            ALTER TABLE tubes ADD COLUMN media_supplements TEXT;
            ALTER TABLE tubes ADD COLUMN media_selection TEXT;
          END IF;

          UPDATE tubes SET
            media_type = media::jsonb->>'type',
            media_supplements = media::jsonb->>'supplements',
            media_selection = media::jsonb->>'selection'
          WHERE media IS NOT NULL AND media_type IS NULL;

          ALTER TABLE tubes DROP COLUMN media;
        ELSE
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tubes' AND column_name = 'media_type'
          ) THEN
            ALTER TABLE tubes ADD COLUMN media_type TEXT;
            ALTER TABLE tubes ADD COLUMN media_supplements TEXT;
            ALTER TABLE tubes ADD COLUMN media_selection TEXT;
          END IF;
        END IF;
      END $$
    `);
  }
};
