/**
 * Category Mapper
 *
 * Converts between Category entities and PostgreSQL rows. The concrete category is supplied by the
 * caller, so both catalogs share this one mapping.
 */

import type { Category, CategoryFactory } from '@domain/entities/Category';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface CategoryRow {
  id: string;
  lab_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export class CategoryMapper {

  static toRow(category: Category): CategoryRow {
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

  static fromRow<T extends Category>(row: CategoryRow, fromData: CategoryFactory<T>): T {
    return fromData({
      id: row.id,
      labId: row.lab_id,
      name: row.name,
      parentId: row.parent_id ?? undefined,
      sortOrder: row.sort_order,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows<T extends Category>(rows: CategoryRow[], fromData: CategoryFactory<T>): T[] {
    return rows.map(row => this.fromRow(row, fromData));
  }
}
