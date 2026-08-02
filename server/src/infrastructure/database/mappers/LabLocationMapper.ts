/**
 * Lab Location Mapper
 *
 * Converts between location domain entities and PostgreSQL rows.
 */

import { LabLocation } from '@domain/entities/LabLocation';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface LabLocationRow {
  id: string;
  lab_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export class LabLocationMapper {
  static toRow(location: LabLocation): LabLocationRow {
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

  static fromRow(row: LabLocationRow): LabLocation {
    return LabLocation.fromData({
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

  static fromRows(rows: LabLocationRow[]): LabLocation[] {
    return rows.map(row => this.fromRow(row));
  }
}
