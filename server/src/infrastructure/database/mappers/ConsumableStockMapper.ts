/**
 * Consumable Stock Mapper
 *
 * Converts between consumable stock PostgreSQL rows and the domain row interface.
 * Handles NUMERIC → number conversion for quantity.
 */

import type { ConsumableStockRow } from '@domain/repositories/ConsumableProductRepository';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface ConsumableStockDbRow {
  id: string;
  product_id: string;
  location_id: string;
  quantity: string;
  updated_at: Date | string;
}

export class ConsumableStockMapper {

  static fromRow(row: ConsumableStockDbRow): ConsumableStockRow {
    return {
      id: row.id,
      productId: row.product_id,
      locationId: row.location_id,
      quantity: parseFloat(row.quantity),
      updatedAt: toISOString(row.updated_at),
    };
  }

  static fromRows(rows: ConsumableStockDbRow[]): ConsumableStockRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
