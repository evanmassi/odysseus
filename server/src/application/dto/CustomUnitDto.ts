/**
 * Custom Unit DTO
 *
 * Maps custom-unit rows to API response shapes.
 */

import type {
  CustomUnitRow,
  CustomUnitUsageRow,
} from '@domain/repositories/CustomUnitRepository';

import type { CustomUnit, CustomUnitWithUsage } from '@odysseus/shared-schemas';

export type CustomUnitResponse = CustomUnit;
export type CustomUnitWithUsageResponse = CustomUnitWithUsage;

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
