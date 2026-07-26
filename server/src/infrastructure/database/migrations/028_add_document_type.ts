/**
 * Migration 028 — Document Type Classification
 *
 * Adds an optional `doc_type` column to the existing equipment and supply
 * document tables, matching the reagent documents created alongside it, so an
 * attachment can be classified (SDS, spec sheet, CoA, protocol) in every catalog.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

const DOC_TYPE_CHECK = `CHECK (doc_type IN ('sds', 'spec_sheet', 'coa', 'protocol', 'other'))`;

export const migration028: Migration = {
  id: 28,
  name: 'add_document_type',
  async up(pool: Pool): Promise<void> {
    await pool.query(`ALTER TABLE equipment_documents ADD COLUMN doc_type TEXT ${DOC_TYPE_CHECK}`);
    await pool.query(`ALTER TABLE supply_documents ADD COLUMN doc_type TEXT ${DOC_TYPE_CHECK}`);
  },
};
