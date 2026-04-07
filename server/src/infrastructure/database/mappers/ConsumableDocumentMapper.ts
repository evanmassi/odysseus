/**
 * Consumable Document Mapper
 *
 * Converts between ConsumableDocument domain entities and PostgreSQL rows.
 */

import { ConsumableDocument } from '@domain/entities/ConsumableDocument';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface ConsumableDocumentRow {
  id: string;
  product_id: string;
  label: string;
  url: string;
  notes: string | null;
  created_at: Date | string;
}

export class ConsumableDocumentMapper {

  static toRow(document: ConsumableDocument): ConsumableDocumentRow {
    return {
      id: document.id,
      product_id: document.productId,
      label: document.label,
      url: document.url,
      notes: document.notes ?? null,
      created_at: document.createdAt,
    };
  }

  static fromRow(row: ConsumableDocumentRow): ConsumableDocument {
    return ConsumableDocument.fromData({
      id: row.id,
      productId: row.product_id,
      label: row.label,
      url: row.url,
      notes: row.notes ?? undefined,
      createdAt: toISOString(row.created_at),
    });
  }

  static fromRows(rows: ConsumableDocumentRow[]): ConsumableDocument[] {
    return rows.map(row => this.fromRow(row));
  }
}
