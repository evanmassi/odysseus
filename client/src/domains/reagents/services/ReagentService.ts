/**
 * Reagent Data Service
 *
 * HTTP operations for reagent categories, items, documents, lots, stock
 * transactions, and packaging levels.
 */

import {
  messageResponseSchema,
  reagentCategoryResponseSchema,
  reagentCategoryListResponseSchema,
  reagentDocumentResponseSchema,
  reagentItemDetailResponseSchema,
  reagentItemListResponseSchema,
  reagentItemResponseSchema,
  reagentLotResponseSchema,
  reagentPackagingLevelResponseSchema,
  reagentBulkResponseSchema,
  reagentTransactionListResponseSchema,
  reagentVoidTransactionResponseSchema,
  type ReagentCategory,
  type ReagentDocument,
  type ReagentItem,
  type ReagentItemDetail,
  type ReagentItemWithStock,
  type ReagentLot,
  type ReagentPackagingLevel,
  type ReagentTransaction,
  type ReagentVoidTransactionResponse,
  type ReagentBulkResponse,
  type CreateReagentCategoryRequest,
  type UpdateReagentCategoryRequest,
  type CreateReagentItemRequest,
  type UpdateReagentItemRequest,
  type CreateReagentDocumentRequest,
  type UpdateReagentDocumentRequest,
  type CreateReagentPackagingLevelRequest,
  type UpdateReagentLotRequest,
  type RecordReagentTransactionRequest,
  type RecordReagentStockCountRequest,
  type VoidReagentTransactionRequest,
  type ReagentBulkVoidRequest,
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

  static async createItem(data: CreateReagentItemRequest): Promise<ReagentItem> {
    const response = await httpClient.postData(this.BASE_PATH, data, reagentItemResponseSchema);
    return response.item;
  }

  static async updateItem(id: string, data: UpdateReagentItemRequest): Promise<ReagentItem> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${id}`,
      data,
      reagentItemResponseSchema
    );
    return response.item;
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

  // Lots

  static async updateLot(
    itemId: string,
    lotId: string,
    data: UpdateReagentLotRequest
  ): Promise<ReagentLot> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${itemId}/lots/${lotId}`,
      data,
      reagentLotResponseSchema
    );
    return response.lot;
  }

  // Stock operations

  static async recordTransaction(
    data: RecordReagentTransactionRequest
  ): Promise<ReagentTransaction[]> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/transactions`,
      data,
      reagentTransactionListResponseSchema
    );
    return response.transactions;
  }

  static async recordStockCount(
    data: RecordReagentStockCountRequest
  ): Promise<ReagentTransaction[]> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/stock-counts`,
      data,
      reagentTransactionListResponseSchema
    );
    return response.transactions;
  }

  static async voidTransaction(
    transactionId: string,
    data: VoidReagentTransactionRequest
  ): Promise<ReagentVoidTransactionResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/transactions/${transactionId}/void`,
      data,
      reagentVoidTransactionResponseSchema
    );
  }

  static async bulkVoidTransactions(data: ReagentBulkVoidRequest): Promise<ReagentBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/void`,
      data,
      reagentBulkResponseSchema
    );
  }

  // Packaging levels

  static async addPackagingLevel(
    itemId: string,
    data: CreateReagentPackagingLevelRequest
  ): Promise<ReagentPackagingLevel> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${itemId}/packaging-levels`,
      data,
      reagentPackagingLevelResponseSchema
    );
    return response.packagingLevel;
  }

  static async removePackagingLevel(itemId: string, levelId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${itemId}/packaging-levels/${levelId}`);
  }
}
