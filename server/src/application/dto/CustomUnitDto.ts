/**
 * Custom Unit DTO
 *
 * Maps custom-unit rows to API response shapes.
 */

import type {
  CustomUnitRow,
  CustomUnitUsageRow,
} from '@domain/repositories/CustomUnitRepository';

import type { UnitKindValue } from '@odysseus/shared-schemas';

export interface CustomUnitResponse {
  id: string;
  labId: string;
  label: string;
  kind: UnitKindValue;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomUnitWithUsageResponse extends CustomUnitResponse {
  usageCount: number;
}

export class CustomUnitDto {
  static toResponse(unit: CustomUnitRow): CustomUnitResponse {
    return {
      id: unit.id,
      labId: unit.labId,
      label: unit.label,
      kind: unit.kind,
      sortOrder: unit.sortOrder,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }

  static toUsageResponse(unit: CustomUnitUsageRow): CustomUnitWithUsageResponse {
    return { ...CustomUnitDto.toResponse(unit), usageCount: unit.usageCount };
  }
}
