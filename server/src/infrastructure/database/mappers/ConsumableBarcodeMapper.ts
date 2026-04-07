/**
 * Consumable Barcode Mapper
 *
 * Converts between consumable barcode PostgreSQL rows and the domain row interface.
 */

import type { ConsumableBarcodeRow } from '@domain/repositories/ConsumableProductRepository';

export interface ConsumableBarcodeDbRow {
  id: string;
  product_id: string;
  barcode_value: string;
  barcode_type: string;
  is_primary: boolean;
  label: string | null;
}

export class ConsumableBarcodeMapper {

  static fromRow(row: ConsumableBarcodeDbRow): ConsumableBarcodeRow {
    return {
      id: row.id,
      productId: row.product_id,
      barcodeValue: row.barcode_value,
      barcodeType: row.barcode_type,
      isPrimary: row.is_primary,
      label: row.label ?? undefined,
    };
  }

  static fromRows(rows: ConsumableBarcodeDbRow[]): ConsumableBarcodeRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
