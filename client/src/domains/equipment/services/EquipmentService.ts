/**
 * Equipment Data Service
 *
 * HTTP operations for equipment categories, items, documents, and maintenance logs.
 */

import {
  type EquipmentCategory,
  type EquipmentItem,
  type EquipmentItemDetail,
  type EquipmentDocument,
  type EquipmentMaintenanceLog,
  type CreateEquipmentCategoryRequest,
  type UpdateEquipmentCategoryRequest,
  type CreateEquipmentItemRequest,
  type UpdateEquipmentItemRequest,
  type DecommissionEquipmentItemRequest,
  type CreateEquipmentDocumentRequest,
  type UpdateEquipmentDocumentRequest,
  type CreateEquipmentMaintenanceLogRequest,
  type UpdateEquipmentMaintenanceLogRequest,
  type EquipmentItemWithAttributes,
  type EquipmentBulkResponse,
  type EquipmentBulkStatusRequest,
  type EquipmentBulkRelocateRequest,
  equipmentCategoryResponseSchema,
  equipmentCategoryListResponseSchema,
  equipmentItemResponseSchema,
  equipmentItemListResponseSchema,
  equipmentItemDetailResponseSchema,
  equipmentDocumentResponseSchema,
  equipmentMaintenanceLogEntryResponseSchema,
  equipmentBulkResponseSchema,
  equipmentAttributeValueListResponseSchema,
  type EquipmentAttributeValue,
  type SetEquipmentAttributeValueRequest,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class EquipmentService {
  private static readonly BASE_PATH = '/equipment';

  // Categories

  static async listCategories(): Promise<EquipmentCategory[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/categories`,
      equipmentCategoryListResponseSchema
    );
    return response.categories;
  }

  static async createCategory(data: CreateEquipmentCategoryRequest): Promise<EquipmentCategory> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/categories`,
      data,
      equipmentCategoryResponseSchema
    );
    return response.category;
  }

  static async updateCategory(
    id: string,
    data: UpdateEquipmentCategoryRequest
  ): Promise<EquipmentCategory> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/categories/${id}`,
      data,
      equipmentCategoryResponseSchema
    );
    return response.category;
  }

  static async deleteCategory(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/categories/${id}`);
  }

  // Items

  static async list(): Promise<EquipmentItemWithAttributes[]> {
    const response = await httpClient.getData(this.BASE_PATH, equipmentItemListResponseSchema);
    return response.items;
  }

  static async getById(id: string): Promise<EquipmentItemDetail> {
    return await httpClient.getData(`${this.BASE_PATH}/${id}`, equipmentItemDetailResponseSchema);
  }

  static async create(data: CreateEquipmentItemRequest): Promise<EquipmentItem> {
    const response = await httpClient.postData(this.BASE_PATH, data, equipmentItemResponseSchema);
    return response.item;
  }

  static async update(id: string, data: UpdateEquipmentItemRequest): Promise<EquipmentItem> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${id}`,
      data,
      equipmentItemResponseSchema
    );
    return response.item;
  }

  static async decommission(
    id: string,
    data: DecommissionEquipmentItemRequest
  ): Promise<EquipmentItem> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${id}/decommission`,
      data,
      equipmentItemResponseSchema
    );
    return response.item;
  }

  static async delete(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }

  // Documents

  static async addDocument(
    itemId: string,
    data: CreateEquipmentDocumentRequest
  ): Promise<EquipmentDocument> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${itemId}/documents`,
      data,
      equipmentDocumentResponseSchema
    );
    return response.document;
  }

  static async updateDocument(
    itemId: string,
    docId: string,
    data: UpdateEquipmentDocumentRequest
  ): Promise<EquipmentDocument> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${itemId}/documents/${docId}`,
      data,
      equipmentDocumentResponseSchema
    );
    return response.document;
  }

  static async removeDocument(itemId: string, docId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${itemId}/documents/${docId}`);
  }

  // Maintenance log

  static async addMaintenanceEntry(
    itemId: string,
    data: CreateEquipmentMaintenanceLogRequest
  ): Promise<EquipmentMaintenanceLog> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${itemId}/maintenance`,
      data,
      equipmentMaintenanceLogEntryResponseSchema
    );
    return response.entry;
  }

  static async updateMaintenanceEntry(
    itemId: string,
    entryId: string,
    data: UpdateEquipmentMaintenanceLogRequest
  ): Promise<EquipmentMaintenanceLog> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${itemId}/maintenance/${entryId}`,
      data,
      equipmentMaintenanceLogEntryResponseSchema
    );
    return response.entry;
  }

  static async deleteMaintenanceEntry(itemId: string, entryId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${itemId}/maintenance/${entryId}`);
  }

  // Bulk operations

  static async bulkLogMaintenance(
    itemIds: string[],
    data: CreateEquipmentMaintenanceLogRequest
  ): Promise<EquipmentBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/maintenance`,
      { itemIds, data },
      equipmentBulkResponseSchema
    );
  }

  static async bulkChangeStatus(
    itemIds: string[],
    data: EquipmentBulkStatusRequest['data']
  ): Promise<EquipmentBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/status`,
      { itemIds, data },
      equipmentBulkResponseSchema
    );
  }

  static async bulkRelocate(
    itemIds: string[],
    data: EquipmentBulkRelocateRequest['data']
  ): Promise<EquipmentBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/relocate`,
      { itemIds, data },
      equipmentBulkResponseSchema
    );
  }
  static async setAttributeValue(
    itemId: string,
    data: SetEquipmentAttributeValueRequest
  ): Promise<EquipmentAttributeValue[]> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${itemId}/attributes`,
      data,
      equipmentAttributeValueListResponseSchema
    );
    return response.attributeValues;
  }
}
