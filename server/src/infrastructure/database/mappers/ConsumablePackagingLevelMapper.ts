/**
 * Consumable Packaging Level Mapper
 *
 * Converts between packaging level PostgreSQL rows and the domain row interface.
 * Handles NUMERIC → number conversion for quantity.
 */

import type { ConsumablePackagingLevelRow } from '@domain/repositories/ConsumableProductRepository';

export interface ConsumablePackagingLevelDbRow {
  id: string;
  product_id: string;
  unit_name: string;
  quantity: string;
  parent_unit: string | null;
}

export class ConsumablePackagingLevelMapper {

  static fromRow(row: ConsumablePackagingLevelDbRow): ConsumablePackagingLevelRow {
    return {
      id: row.id,
      productId: row.product_id,
      unitName: row.unit_name,
      quantity: parseFloat(row.quantity),
      parentUnit: row.parent_unit ?? undefined,
    };
  }

  static fromRows(rows: ConsumablePackagingLevelDbRow[]): ConsumablePackagingLevelRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
