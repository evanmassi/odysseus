/**
 * Reagent Packaging Level Mapper
 *
 * Converts reagent packaging level PostgreSQL rows into the domain row interface.
 * Handles NUMERIC → number conversion for quantity.
 */

import type { ReagentPackagingLevelRow } from '@domain/repositories/ReagentItemRepository';

export interface ReagentPackagingLevelDbRow {
  id: string;
  item_id: string;
  unit_name: string;
  quantity: string;
  parent_unit: string | null;
}

export class ReagentPackagingLevelMapper {
  static fromRow(row: ReagentPackagingLevelDbRow): ReagentPackagingLevelRow {
    return {
      id: row.id,
      itemId: row.item_id,
      unitName: row.unit_name,
      quantity: parseFloat(row.quantity),
      parentUnit: row.parent_unit ?? undefined,
    };
  }

  static fromRows(rows: ReagentPackagingLevelDbRow[]): ReagentPackagingLevelRow[] {
    return rows.map(row => this.fromRow(row));
  }
}
