/**
 * Equipment Document Mapper
 *
 * Converts between EquipmentDocument domain entities and PostgreSQL rows.
 */

import { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface EquipmentDocumentRow {
  id: string;
  item_id: string;
  label: string;
  url: string;
  notes: string | null;
  created_at: Date | string;
}

export class EquipmentDocumentMapper {

  static toRow(document: EquipmentDocument): EquipmentDocumentRow {
    return {
      id: document.id,
      item_id: document.itemId,
      label: document.label,
      url: document.url,
      notes: document.notes ?? null,
      created_at: document.createdAt,
    };
  }

  static fromRow(row: EquipmentDocumentRow): EquipmentDocument {
    return EquipmentDocument.fromData({
      id: row.id,
      itemId: row.item_id,
      label: row.label,
      url: row.url,
      notes: row.notes ?? undefined,
      createdAt: toISOString(row.created_at),
    });
  }

  static fromRows(rows: EquipmentDocumentRow[]): EquipmentDocument[] {
    return rows.map(row => this.fromRow(row));
  }
}
