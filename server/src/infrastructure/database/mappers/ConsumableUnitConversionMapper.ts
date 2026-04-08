/**
 * Consumable Unit Conversion Mapper
 *
 * Converts between unit conversion PostgreSQL rows and the domain row interface.
 * Handles NUMERIC → number conversion for multiplier.
 */

import type { ConsumableUnitConversionRow } from '@domain/repositories/ConsumableProductRepository';

export interface ConsumableUnitConversionDbRow {
  id: string;
  product_id: string;
  unit_name: string;
  multiplier: string;
}

export class ConsumableUnitConversionMapper {

  static fromRow(row: ConsumableUnitConversionDbRow): ConsumableUnitConversionRow {
    return {
      id: row.id,
      productId: row.product_id,
      unitName: row.unit_name,
      multiplier: parseFloat(row.multiplier),
    };
  }

  static fromRows(rows: ConsumableUnitConversionDbRow[]): ConsumableUnitConversionRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
