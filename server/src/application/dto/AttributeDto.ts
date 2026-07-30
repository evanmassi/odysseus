/**
 * Attribute DTO
 *
 * Maps attribute definitions and options to API response shapes.
 */

import type { AttributeDefinition } from '@domain/entities/AttributeDefinition';
import type { AttributeOptionRow } from '@domain/repositories/AttributeRepository';

import type {
  AttributeDefinition as AttributeDefinitionData,
  AttributeDefinitionWithUsage,
  AttributeOption as AttributeOptionData,
  AttributeOptionWithUsage,
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
      appliesToType: definition.appliesToType ?? null,
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
}
