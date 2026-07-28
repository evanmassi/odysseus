/**
 * Reagent Data Service
 *
 * HTTP operations for the reagent catalog: categories and the item list.
 */

import {
  messageResponseSchema,
  reagentCategoryResponseSchema,
  reagentCategoryListResponseSchema,
  reagentDocumentResponseSchema,
  reagentItemDetailResponseSchema,
  reagentItemListResponseSchema,
  type ReagentCategory,
  type ReagentDocument,
  type ReagentItemDetail,
  type ReagentItemWithStock,
  type CreateReagentCategoryRequest,
  type UpdateReagentCategoryRequest,
  type CreateReagentDocumentRequest,
  type UpdateReagentDocumentRequest,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class ReagentService {
  private static readonly BASE_PATH = '/reagents';

  // Categories

  static async listCategories(): Promise<ReagentCategory[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/categories`,
      reagentCategoryListResponseSchema
    );
    return response.categories;
  }

  static async createCategory(data: CreateReagentCategoryRequest): Promise<ReagentCategory> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/categories`,
      data,
      reagentCategoryResponseSchema
    );
    return response.category;
  }

  static async updateCategory(
    id: string,
    data: UpdateReagentCategoryRequest
  ): Promise<ReagentCategory> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/categories/${id}`,
      data,
      reagentCategoryResponseSchema
    );
    return response.category;
  }

  static async deleteCategory(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/categories/${id}`);
  }

  // Items

  static async listItems(): Promise<ReagentItemWithStock[]> {
    const response = await httpClient.getData(this.BASE_PATH, reagentItemListResponseSchema);
    return response.items;
  }

  static async getById(id: string): Promise<ReagentItemDetail> {
    return await httpClient.getData(`${this.BASE_PATH}/${id}`, reagentItemDetailResponseSchema);
  }

  static async archiveItem(id: string): Promise<void> {
    await httpClient.postData(`${this.BASE_PATH}/${id}/archive`, {}, messageResponseSchema);
  }

  static async deleteItem(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }

  // Documents

  static async addDocument(
    itemId: string,
    data: CreateReagentDocumentRequest
  ): Promise<ReagentDocument> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${itemId}/documents`,
      data,
      reagentDocumentResponseSchema
    );
    return response.document;
  }

  static async updateDocument(
    itemId: string,
    docId: string,
    data: UpdateReagentDocumentRequest
  ): Promise<ReagentDocument> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${itemId}/documents/${docId}`,
      data,
      reagentDocumentResponseSchema
    );
    return response.document;
  }

  static async removeDocument(itemId: string, docId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${itemId}/documents/${docId}`);
  }
}
