/**
 * Reagent Location Mapper
 *
 * Converts between ReagentLocation domain entities and PostgreSQL rows.
 */

import { ReagentLocation } from '@domain/entities/ReagentLocation';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface ReagentLocationRow {
  id: string;
  lab_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export class ReagentLocationMapper {
  static toRow(location: ReagentLocation): ReagentLocationRow {
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

  static fromRow(row: ReagentLocationRow): ReagentLocation {
    return ReagentLocation.fromData({
      id: row.id,
      labId: row.lab_id,
      name: row.name,
      description: row.description ?? undefined,
      sortOrder: row.sort_order,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows(rows: ReagentLocationRow[]): ReagentLocation[] {
    return rows.map(row => this.fromRow(row));
  }
}
