/**
 * Document Mapper
 *
 * Converts between Document entities and PostgreSQL rows. The concrete document is supplied by the
 * caller, so both catalogs share this one mapping.
 */

import type { Document, DocumentFactory } from '@domain/entities/Document';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface DocumentRow {
  id: string;
  item_id: string;
  label: string;
  url: string;
  notes: string | null;
  created_at: Date | string;
}

export class DocumentMapper {
  static toRow(document: Document): DocumentRow {
    return {
      id: document.id,
      item_id: document.itemId,
      label: document.label,
      url: document.url,
      notes: document.notes ?? null,
      created_at: document.createdAt,
    };
  }

  static fromRow<T extends Document>(row: DocumentRow, fromData: DocumentFactory<T>): T {
    return fromData({
      id: row.id,
      itemId: row.item_id,
      label: row.label,
      url: row.url,
      notes: row.notes ?? undefined,
      createdAt: toISOString(row.created_at),
    });
  }

  static fromRows<T extends Document>(rows: DocumentRow[], fromData: DocumentFactory<T>): T[] {
    return rows.map(row => this.fromRow(row, fromData));
  }
}
