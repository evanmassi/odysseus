/**
 * Migration 037 — Per-Row Seed Flag on Visitor-Writable Content
 *
 * The public demo needs seeded records a visitor can edit but not delete, so every table a visitor
 * writes to carries its own flag. Child records (lots, maintenance entries) aren't lab-scoped and
 * take their protection from the parent item.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

const SEEDED_CONTENT_TABLES = [
  'tubes',
  'donors',
  'reagent_items',
  'supply_items',
  'equipment_items',
  'reagent_transactions',
  'supply_transactions',
];

export const migration037: Migration = {
  id: 37,
  name: 'add_is_seeded_to_content',
  async up(pool: Pool): Promise<void> {
    for (const table of SEEDED_CONTENT_TABLES) {
      await pool.query(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS is_seeded BOOLEAN NOT NULL DEFAULT FALSE`
      );
    }
  },
};
