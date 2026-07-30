/**
 * Custom Unit Mapper
 *
 * Converts between custom-unit rows and PostgreSQL rows.
 */

import type { CustomUnitRow, CustomUnitUsageRow } from '@domain/repositories/CustomUnitRepository';
import { toDate } from '@infrastructure/database/PostgresContext';

import type { UnitKindValue } from '@odysseus/shared-schemas';

export interface CustomUnitDbRow {
  id: string;
  lab_id: string;
  label: string;
  kind: string;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CustomUnitUsageDbRow extends CustomUnitDbRow {
  usage_count: number;
}

export class CustomUnitMapper {
  static toRow(unit: CustomUnitRow): CustomUnitDbRow {
    return {
      id: unit.id,
      lab_id: unit.labId,
      label: unit.label,
      kind: unit.kind,
      sort_order: unit.sortOrder,
      created_at: unit.createdAt,
      updated_at: unit.updatedAt,
    };
  }

  static fromRow(row: CustomUnitDbRow): CustomUnitRow {
    return {
      id: row.id,
      labId: row.lab_id,
      label: row.label,
      kind: row.kind as UnitKindValue,
      sortOrder: row.sort_order,
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    };
  }

  static usageFromRow(row: CustomUnitUsageDbRow): CustomUnitUsageRow {
    return { ...this.fromRow(row), usageCount: row.usage_count };
  }
}
