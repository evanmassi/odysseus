/**
 * Supply Barcode Mapper
 *
 * Converts between supply barcode PostgreSQL rows and the domain row interface.
 */

import type { SupplyBarcodeRow } from '@domain/repositories/SupplyItemRepository';

export interface SupplyBarcodeDbRow {
  id: string;
  item_id: string;
  barcode_value: string;
  barcode_type: string;
  is_primary: boolean;
  label: string | null;
}

export class SupplyBarcodeMapper {
  static fromRow(row: SupplyBarcodeDbRow): SupplyBarcodeRow {
    return {
      id: row.id,
      itemId: row.item_id,
      barcodeValue: row.barcode_value,
      barcodeType: row.barcode_type,
      isPrimary: row.is_primary,
      label: row.label ?? undefined,
    };
  }

  static fromRows(rows: SupplyBarcodeDbRow[]): SupplyBarcodeRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
