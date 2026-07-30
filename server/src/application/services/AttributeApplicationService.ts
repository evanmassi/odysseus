/**
 * Attribute Management Service
 *
 * CRUD for the lab's attribute definitions and their option vocabularies.
 */

import {
  AttributeDto,
  type AttributeDefinitionResponse,
  type AttributeDefinitionUsageResponse,
  type AttributeOptionResponse,
  type AttributeOptionUsageResponse,
} from '@application/dto/AttributeDto';
import { AttributeDefinition } from '@domain/entities/AttributeDefinition';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type {
  AttributeRepository,
  AttributeOptionRow,
} from '@domain/repositories/AttributeRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import { generateId } from '@domain/utils/generateId';

import type {
  CreateAttributeDefinitionRequest,
  UpdateAttributeDefinitionRequest,
  CreateAttributeOptionRequest,
  UpdateAttributeOptionRequest,
} from '@odysseus/shared-schemas';

export class AttributeApplicationService {
  constructor(
    private attributeRepository: AttributeRepository,
    private accessControlService: AccessControlService
  ) {}

  async list(labId: string): Promise<{
    definitions: AttributeDefinitionUsageResponse[];
    options: AttributeOptionUsageResponse[];
  }> {
    const [definitions, options, definitionUsage, optionUsage] = await Promise.all([
      this.attributeRepository.findDefinitionsByLabId(labId),
      this.attributeRepository.findOptionsByLabId(labId),
      this.attributeRepository.countItemsByDefinition(labId),
      this.attributeRepository.countItemsByOption(labId),
    ]);
    return {
      definitions: definitions.map(definition =>
        AttributeDto.definitionToUsageResponse(definition, definitionUsage.get(definition.id) ?? 0)
      ),
      options: options.map(option =>
        AttributeDto.optionToUsageResponse(option, optionUsage.get(option.id) ?? 0)
      ),
    };
  }

  async createDefinition(
    labId: string,
    data: CreateAttributeDefinitionRequest,
    user: User
  ): Promise<AttributeDefinitionResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const existing = await this.attributeRepository.findDefinitionByName(data.name.trim(), labId);
    if (existing) {
      throw new ValidationError(`An attribute named "${data.name.trim()}" already exists`);
    }

    const definition = AttributeDefinition.create({
      labId,
      name: data.name,
      valueType: data.valueType,
      appliesToCatalog: data.appliesToCatalog,
      appliesToType: data.appliesToType,
      sortOrder: data.sortOrder,
      promptOnForm: data.promptOnForm,
    });
    await this.attributeRepository.saveDefinition(definition);
    return AttributeDto.definitionToResponse(definition);
  }

  async updateDefinition(
    labId: string,
    id: string,
    data: UpdateAttributeDefinitionRequest,
    user: User
  ): Promise<AttributeDefinitionResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const definition = await this.getDefinitionOrThrow(id, labId);

    if (data.name && data.name.trim() !== definition.name) {
      const clash = await this.attributeRepository.findDefinitionByName(data.name.trim(), labId);
      if (clash) {
        throw new ValidationError(`An attribute named "${data.name.trim()}" already exists`);
      }
    }

    definition.update({
      name: data.name,
      appliesToCatalog: data.appliesToCatalog,
      appliesToType: data.appliesToType,
      sortOrder: data.sortOrder,
      promptOnForm: data.promptOnForm,
    });
    await this.attributeRepository.saveDefinition(definition);
    return AttributeDto.definitionToResponse(definition);
  }

  async deleteDefinition(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const definition = await this.getDefinitionOrThrow(id, labId);

    if (definition.isSystem) {
      throw new ValidationError(
        `"${definition.name}" is a built-in attribute and cannot be deleted — remove its options instead`
      );
    }

    // The value rows cascade, so an unguarded delete would silently strip this field from every item.
    const usageCount = await this.attributeRepository.countItemsUsingDefinition(id);
    if (usageCount > 0) {
      throw new ValidationError(
        usageCount === 1
          ? `Cannot delete "${definition.name}" — 1 item still records a value for it`
          : `Cannot delete "${definition.name}" — ${usageCount} items still record a value for it`
      );
    }

    await this.attributeRepository.deleteDefinition(id, labId);
  }

  async createOption(
    labId: string,
    definitionId: string,
    data: CreateAttributeOptionRequest,
    user: User
  ): Promise<AttributeOptionResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const definition = await this.getDefinitionOrThrow(definitionId, labId);

    if (!definition.usesOptions) {
      throw new ValidationError(
        `"${definition.name}" is a ${definition.valueType} attribute and does not use an option list`
      );
    }

    const option: AttributeOptionRow = {
      id: generateId('aopt'),
      definitionId,
      value: data.value.trim(),
      sortOrder: data.sortOrder ?? 0,
    };
    await this.attributeRepository.saveOption(option);
    return AttributeDto.optionToResponse(option);
  }

  async updateOption(
    labId: string,
    id: string,
    data: UpdateAttributeOptionRequest,
    user: User
  ): Promise<AttributeOptionResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const option = await this.getOptionOrThrow(id, labId);

    const updated: AttributeOptionRow = {
      ...option,
      value: data.value?.trim() ?? option.value,
      sortOrder: data.sortOrder ?? option.sortOrder,
    };
    await this.attributeRepository.saveOption(updated);
    return AttributeDto.optionToResponse(updated);
  }

  async deleteOption(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const option = await this.getOptionOrThrow(id, labId);

    const usageCount = await this.attributeRepository.countItemsUsingOption(id);
    if (usageCount > 0) {
      throw new ValidationError(
        usageCount === 1
          ? `Cannot delete "${option.value}" — 1 item still uses it`
          : `Cannot delete "${option.value}" — ${usageCount} items still use it`
      );
    }

    await this.attributeRepository.deleteOption(id, labId);
  }

  private async getDefinitionOrThrow(id: string, labId: string): Promise<AttributeDefinition> {
    const definition = await this.attributeRepository.findDefinitionById(id, labId);
    if (!definition) {
      throw new NotFoundError('This attribute could not be found.', { definitionId: id });
    }
    return definition;
  }

  private async getOptionOrThrow(id: string, labId: string): Promise<AttributeOptionRow> {
    const option = await this.attributeRepository.findOptionById(id, labId);
    if (!option) {
      throw new NotFoundError('This attribute option could not be found.', { optionId: id });
    }
    return option;
  }
}
