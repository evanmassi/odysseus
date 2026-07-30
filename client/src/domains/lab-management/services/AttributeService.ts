/**
 * Attribute Service
 *
 * HTTP client for the lab's attribute definitions and their option vocabularies.
 */

import {
  attributeDefinitionListResponseSchema,
  attributeDefinitionResponseSchema,
  attributeOptionResponseSchema,
  type AttributeDefinition,
  type AttributeDefinitionWithUsage,
  type AttributeOption,
  type AttributeOptionWithUsage,
  type CreateAttributeDefinitionRequest,
  type CreateAttributeOptionRequest,
  type UpdateAttributeDefinitionRequest,
  type UpdateAttributeOptionRequest,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export interface AttributeCatalogData {
  definitions: AttributeDefinitionWithUsage[];
  options: AttributeOptionWithUsage[];
}

export class AttributeService {
  private static readonly BASE_PATH = '/attributes';

  static async list(): Promise<AttributeCatalogData> {
    return httpClient.getData(this.BASE_PATH, attributeDefinitionListResponseSchema);
  }

  static async createDefinition(
    data: CreateAttributeDefinitionRequest
  ): Promise<AttributeDefinition> {
    const response = await httpClient.postData(
      this.BASE_PATH,
      data,
      attributeDefinitionResponseSchema
    );
    return response.definition;
  }

  static async updateDefinition(
    id: string,
    data: UpdateAttributeDefinitionRequest
  ): Promise<AttributeDefinition> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${id}`,
      data,
      attributeDefinitionResponseSchema
    );
    return response.definition;
  }

  static async deleteDefinition(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }

  static async createOption(
    definitionId: string,
    data: CreateAttributeOptionRequest
  ): Promise<AttributeOption> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${definitionId}/options`,
      data,
      attributeOptionResponseSchema
    );
    return response.option;
  }

  static async updateOption(
    id: string,
    data: UpdateAttributeOptionRequest
  ): Promise<AttributeOption> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/options/${id}`,
      data,
      attributeOptionResponseSchema
    );
    return response.option;
  }

  static async deleteOption(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/options/${id}`);
  }
}
