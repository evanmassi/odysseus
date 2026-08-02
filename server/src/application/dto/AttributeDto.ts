/**
 * Attribute DTO
 *
 * Maps attribute definitions, options and per-item values to API response shapes. The value
 * mappers serve all three catalogs — the rows differ only in which table they came from.
 */

import type { AttributeDefinition } from '@domain/entities/AttributeDefinition';
import type { AttributeOptionRow, AttributeValueRow } from '@domain/repositories/AttributeRepository';

import type {
  AttributeDefinition as AttributeDefinitionData,
  AttributeDefinitionWithUsage,
  AttributeOption as AttributeOptionData,
  AttributeOptionWithUsage,
  AttributeSummary,
  AttributeValue,
} from '@odysseus/shared-schemas';

export type AttributeDefinitionResponse = AttributeDefinitionData;
export type AttributeOptionResponse = AttributeOptionData;
export type AttributeDefinitionUsageResponse = AttributeDefinitionWithUsage;
export type AttributeOptionUsageResponse = AttributeOptionWithUsage;

export class AttributeDto {
  static definitionToResponse(definition: AttributeDefinition): AttributeDefinitionResponse {
    return {
      id: definition.id,
      labId: definition.labId,
      name: definition.name,
      valueType: definition.valueType,
      appliesToCatalog: definition.appliesToCatalog ?? null,
      appliesToTypes: definition.appliesToTypes,
      sortOrder: definition.sortOrder,
      isSystem: definition.isSystem,
      systemKey: definition.systemKey ?? null,
      promptOnForm: definition.promptOnForm,
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    };
  }

  static optionToResponse(option: AttributeOptionRow): AttributeOptionResponse {
    return {
      id: option.id,
      definitionId: option.definitionId,
      value: option.value,
      sortOrder: option.sortOrder,
    };
  }

  static definitionToUsageResponse(
    definition: AttributeDefinition,
    usageCount: number
  ): AttributeDefinitionUsageResponse {
    return { ...AttributeDto.definitionToResponse(definition), usageCount };
  }

  static optionToUsageResponse(
    option: AttributeOptionRow,
    usageCount: number
  ): AttributeOptionUsageResponse {
    return { ...AttributeDto.optionToResponse(option), usageCount };
  }

  static valueToResponse(row: AttributeValueRow): AttributeValue {
    return {
      id: row.id,
      itemId: row.itemId,
      ...AttributeDto.summaryToResponse(row),
    };
  }

  static summaryToResponse(row: AttributeValueRow): AttributeSummary {
    return {
      definitionId: row.definitionId,
      valueOptionId: row.valueOptionId ?? null,
      valueText: row.valueText ?? null,
      valueNumber: row.valueNumber ?? null,
    };
  }
}
