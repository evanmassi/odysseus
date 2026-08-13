/**
 * Reagent Transaction Mapper
 *
 * Converts reagent transaction PostgreSQL rows into the domain row interface.
 * Handles NUMERIC → number conversion for quantity and cost fields.
 */

import type { ReagentTransactionRow } from '@domain/repositories/ReagentItemRepository';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface ReagentTransactionDbRow {
  id: string;
  item_id: string;
  lot_id: string | null;
  location_id: string;
  lab_id: string;
  type: string;
  quantity_change: string;
  quantity_after: string;
  po_number: string | null;
  cost: string | null;
  performed_by: string;
  notes: string | null;
  created_at: Date | string;
  voided_at: Date | string | null;
  voided_by: string | null;
  void_reason: string | null;
  related_transaction_id: string | null;
  is_seeded: boolean;
}

export class ReagentTransactionMapper {
  static fromRow(row: ReagentTransactionDbRow): ReagentTransactionRow {
    return {
      id: row.id,
      itemId: row.item_id,
      lotId: row.lot_id ?? undefined,
      locationId: row.location_id,
      labId: row.lab_id,
      type: row.type,
      quantityChange: parseFloat(row.quantity_change),
      quantityAfter: parseFloat(row.quantity_after),
      poNumber: row.po_number ?? undefined,
      cost: row.cost != null ? parseFloat(row.cost) : undefined,
      performedBy: row.performed_by,
      notes: row.notes ?? undefined,
      createdAt: toISOString(row.created_at),
      voidedAt: row.voided_at ? toISOString(row.voided_at) : undefined,
      voidedBy: row.voided_by ?? undefined,
      voidReason: row.void_reason ?? undefined,
      relatedTransactionId: row.related_transaction_id ?? undefined,
      isSeeded: row.is_seeded,
    };
  }

  static fromRows(rows: ReagentTransactionDbRow[]): ReagentTransactionRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
