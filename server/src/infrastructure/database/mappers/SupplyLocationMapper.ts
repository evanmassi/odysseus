/**
 * Supply Location Mapper
 *
 * Converts between SupplyLocation domain entities and PostgreSQL rows.
 */

import { SupplyLocation } from '@domain/entities/SupplyLocation';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface SupplyLocationRow {
  id: string;
  lab_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export class SupplyLocationMapper {
  static toRow(location: SupplyLocation): SupplyLocationRow {
    return {
      id: location.id,
      lab_id: location.labId,
      name: location.name,
      description: location.description ?? null,
      sort_order: location.sortOrder,
      created_at: location.createdAt,
      updated_at: location.updatedAt,
    };
  }

  static fromRow(row: SupplyLocationRow): SupplyLocation {
    return SupplyLocation.fromData({
      id: row.id,
      labId: row.lab_id,
      name: row.name,
      description: row.description ?? undefined,
      sortOrder: row.sort_order,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows(rows: SupplyLocationRow[]): SupplyLocation[] {
    return rows.map(row => this.fromRow(row));
  }
}
