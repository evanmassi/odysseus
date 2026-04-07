/**
 * Consumable Transaction Mapper
 *
 * Converts between consumable transaction PostgreSQL rows and the domain row interface.
 * Handles NUMERIC → number conversion for quantity and cost fields.
 */

import type { ConsumableTransactionRow } from '@domain/repositories/ConsumableProductRepository';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface ConsumableTransactionDbRow {
  id: string;
  product_id: string;
  location_id: string;
  lab_id: string;
  type: string;
  quantity_change: string;
  quantity_after: string;
  lot_number: string | null;
  expiration_date: Date | string | null;
  po_number: string | null;
  cost: string | null;
  performed_by: string;
  notes: string | null;
  created_at: Date | string;
}

export class ConsumableTransactionMapper {

  static fromRow(row: ConsumableTransactionDbRow): ConsumableTransactionRow {
    return {
      id: row.id,
      productId: row.product_id,
      locationId: row.location_id,
      labId: row.lab_id,
      type: row.type,
      quantityChange: parseFloat(row.quantity_change),
      quantityAfter: parseFloat(row.quantity_after),
      lotNumber: row.lot_number ?? undefined,
      expirationDate: row.expiration_date ? toISOString(row.expiration_date) : undefined,
      poNumber: row.po_number ?? undefined,
      cost: row.cost != null ? parseFloat(row.cost) : undefined,
      performedBy: row.performed_by,
      notes: row.notes ?? undefined,
      createdAt: toISOString(row.created_at),
    };
  }

  static fromRows(rows: ConsumableTransactionDbRow[]): ConsumableTransactionRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
