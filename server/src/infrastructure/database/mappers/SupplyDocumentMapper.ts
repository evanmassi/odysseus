/**
 * Supply Document Mapper
 *
 * Converts between SupplyDocument domain entities and PostgreSQL rows.
 */

import { SupplyDocument } from '@domain/entities/SupplyDocument';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface SupplyDocumentRow {
  id: string;
  item_id: string;
  label: string;
  url: string;
  notes: string | null;
  created_at: Date | string;
}

export class SupplyDocumentMapper {

  static toRow(document: SupplyDocument): SupplyDocumentRow {
    return {
      id: document.id,
      item_id: document.itemId,
      label: document.label,
      url: document.url,
      notes: document.notes ?? null,
      created_at: document.createdAt,
    };
  }

  static fromRow(row: SupplyDocumentRow): SupplyDocument {
    return SupplyDocument.fromData({
      id: row.id,
      itemId: row.item_id,
      label: row.label,
      url: row.url,
      notes: row.notes ?? undefined,
      createdAt: toISOString(row.created_at),
    });
  }

  static fromRows(rows: SupplyDocumentRow[]): SupplyDocument[] {
    return rows.map(row => this.fromRow(row));
  }
}
