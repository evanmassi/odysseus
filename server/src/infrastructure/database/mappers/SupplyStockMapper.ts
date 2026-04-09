/**
 * Supply Stock Mapper
 *
 * Converts between supply stock PostgreSQL rows and the domain row interface.
 * Handles NUMERIC → number conversion for quantity.
 */

import type { SupplyStockRow } from '@domain/repositories/SupplyProductRepository';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface SupplyStockDbRow {
  id: string;
  product_id: string;
  location_id: string;
  quantity: string;
  updated_at: Date | string;
}

export class SupplyStockMapper {

  static fromRow(row: SupplyStockDbRow): SupplyStockRow {
    return {
      id: row.id,
      productId: row.product_id,
      locationId: row.location_id,
      quantity: parseFloat(row.quantity),
      updatedAt: toISOString(row.updated_at),
    };
  }

  static fromRows(rows: SupplyStockDbRow[]): SupplyStockRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
