/**
 * Reagent Lot Mapper
 *
 * Converts reagent lot PostgreSQL rows into the domain row interface. Lots are
 * DB rows (not entities); the repository writes them directly.
 */

import type { ReagentLotRow } from '@domain/repositories/ReagentItemRepository';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface ReagentLotDbRow {
  id: string;
  item_id: string;
  location_id: string;
  lot_number: string | null;
  quantity: string;
  expiration_date: string | null;
  opened_date: string | null;
  received_date: string | null;
  concentration: string | null;
  concentration_unit: string | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export class ReagentLotMapper {
  static fromRow(row: ReagentLotDbRow): ReagentLotRow {
    return {
      id: row.id,
      itemId: row.item_id,
      locationId: row.location_id,
      lotNumber: row.lot_number ?? undefined,
      quantity: parseFloat(row.quantity),
      expirationDate: row.expiration_date ?? undefined,
      openedDate: row.opened_date ?? undefined,
      receivedDate: row.received_date ?? undefined,
      concentration: row.concentration != null ? parseFloat(row.concentration) : undefined,
      concentrationUnit: row.concentration_unit ?? undefined,
      status: row.status,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    };
  }

  static fromRows(rows: ReagentLotDbRow[]): ReagentLotRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
