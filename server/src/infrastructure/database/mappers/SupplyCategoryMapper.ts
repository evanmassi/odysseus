/**
 * Supply Category Mapper
 *
 * Converts between SupplyCategory domain entities and PostgreSQL rows.
 */

import { SupplyCategory } from '@domain/entities/SupplyCategory';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface SupplyCategoryRow {
  id: string;
  lab_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export class SupplyCategoryMapper {

  static toRow(category: SupplyCategory): SupplyCategoryRow {
    return {
      id: category.id,
      lab_id: category.labId,
      name: category.name,
      parent_id: category.parentId ?? null,
      sort_order: category.sortOrder,
      created_at: category.createdAt,
      updated_at: category.updatedAt,
    };
  }

  static fromRow(row: SupplyCategoryRow): SupplyCategory {
    return SupplyCategory.fromData({
      id: row.id,
      labId: row.lab_id,
      name: row.name,
      parentId: row.parent_id ?? undefined,
      sortOrder: row.sort_order,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows(rows: SupplyCategoryRow[]): SupplyCategory[] {
    return rows.map(row => this.fromRow(row));
  }
}
