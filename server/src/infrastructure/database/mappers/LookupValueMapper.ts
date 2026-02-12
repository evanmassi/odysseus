/**
 * Lookup Value Mapper
 *
 * Converts between domain entity and database row for lookup_values table.
 */

import { LookupValue, LookupCategory } from '@domain/entities/LookupValue';

export interface LookupValueRow {
  id: string;
  category: string;
  value: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export class LookupValueMapper {
  static toRow(entity: LookupValue): LookupValueRow {
    return {
      id: entity.id,
      category: entity.category,
      value: entity.value,
      sort_order: entity.sortOrder,
      is_active: entity.isActive,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  static fromRow(row: LookupValueRow): LookupValue {
    return LookupValue.fromData({
      id: row.id,
      category: row.category as LookupCategory,
      value: row.value,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  static fromRows(rows: LookupValueRow[]): LookupValue[] {
    return rows.map(row => this.fromRow(row));
  }
}
