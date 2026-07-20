/**
 * Supply Packaging Level Mapper
 *
 * Converts between packaging level PostgreSQL rows and the domain row interface.
 * Handles NUMERIC → number conversion for quantity.
 */

import type { SupplyPackagingLevelRow } from '@domain/repositories/SupplyItemRepository';

export interface SupplyPackagingLevelDbRow {
  id: string;
  item_id: string;
  unit_name: string;
  quantity: string;
  parent_unit: string | null;
}

export class SupplyPackagingLevelMapper {
  static fromRow(row: SupplyPackagingLevelDbRow): SupplyPackagingLevelRow {
    return {
      id: row.id,
      itemId: row.item_id,
      unitName: row.unit_name,
      quantity: parseFloat(row.quantity),
      parentUnit: row.parent_unit ?? undefined,
    };
  }

  static fromRows(rows: SupplyPackagingLevelDbRow[]): SupplyPackagingLevelRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
