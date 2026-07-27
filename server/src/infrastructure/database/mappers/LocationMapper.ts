/**
 * Location Mapper
 *
 * Converts between Location domain entities and PostgreSQL rows.
 */

import { Location } from '@domain/entities/Location';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface LocationRow {
  id: string;
  lab_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export class LocationMapper {
  static toRow(location: Location): LocationRow {
    return {
      id: location.id,
      lab_id: location.labId,
      name: location.name,
      description: location.description ?? null,
      parent_id: location.parentId ?? null,
      sort_order: location.sortOrder,
      created_at: location.createdAt,
      updated_at: location.updatedAt,
    };
  }

  static fromRow(row: LocationRow): Location {
    return Location.fromData({
      id: row.id,
      labId: row.lab_id,
      name: row.name,
      description: row.description ?? undefined,
      parentId: row.parent_id ?? undefined,
      sortOrder: row.sort_order,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows(rows: LocationRow[]): Location[] {
    return rows.map(row => this.fromRow(row));
  }
}
