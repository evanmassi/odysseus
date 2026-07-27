/**
 * Reagent Barcode Mapper
 *
 * Converts reagent barcode PostgreSQL rows into the domain row interface.
 */

import type { ReagentBarcodeRow } from '@domain/repositories/ReagentItemRepository';

export interface ReagentBarcodeDbRow {
  id: string;
  item_id: string;
  lot_id: string | null;
  barcode_value: string;
  barcode_type: string;
  is_primary: boolean;
  label: string | null;
}

export class ReagentBarcodeMapper {
  static fromRow(row: ReagentBarcodeDbRow): ReagentBarcodeRow {
    return {
      id: row.id,
      itemId: row.item_id,
      lotId: row.lot_id ?? undefined,
      barcodeValue: row.barcode_value,
      barcodeType: row.barcode_type,
      isPrimary: row.is_primary,
      label: row.label ?? undefined,
    };
  }

  static fromRows(rows: ReagentBarcodeDbRow[]): ReagentBarcodeRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
