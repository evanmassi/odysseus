/**
 * Reagent Data Service
 *
 * HTTP operations for reagent categories, items, documents, lots, stock
 * transactions, packaging levels, and attribute values.
 */

import {
  messageResponseSchema,
  reagentCategoryResponseSchema,
  reagentCategoryListResponseSchema,
  reagentBarcodeResponseSchema,
  reagentDocumentResponseSchema,
  reagentItemDetailResponseSchema,
  reagentItemListResponseSchema,
  reagentItemResponseSchema,
  reagentLotResponseSchema,
  reagentPackagingLevelResponseSchema,
  reagentAttributeValueListResponseSchema,
  reagentBulkResponseSchema,
  reagentTransactionListResponseSchema,
  reagentVoidTransactionResponseSchema,
  type ReagentCategory,
  type ReagentBarcode,
  type ReagentDocument,
  type ReagentItem,
  type ReagentItemDetail,
  type ReagentItemWithStock,
  type ReagentLot,
  type ReagentPackagingLevel,
  type ReagentAttributeValue,
  type ReagentTransaction,
  type ReagentVoidTransactionResponse,
  type ReagentBulkResponse,
  type CreateReagentCategoryRequest,
  type UpdateReagentCategoryRequest,
  type CreateReagentItemRequest,
  type UpdateReagentItemRequest,
  type CreateReagentBarcodeRequest,
  type UpdateReagentBarcodeRequest,
  type CreateReagentDocumentRequest,
  type UpdateReagentDocumentRequest,
  type CreateReagentPackagingLevelRequest,
  type SetReagentAttributeValueRequest,
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

  // Barcodes

  static async addBarcode(
    itemId: string,
    data: CreateReagentBarcodeRequest
  ): Promise<ReagentBarcode> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${itemId}/barcodes`,
      data,
      reagentBarcodeResponseSchema
    );
    return response.barcode;
  }

  static async updateBarcode(
    itemId: string,
    barcodeId: string,
    data: UpdateReagentBarcodeRequest
  ): Promise<ReagentBarcode> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${itemId}/barcodes/${barcodeId}`,
      data,
      reagentBarcodeResponseSchema
    );
    return response.barcode;
  }

  static async removeBarcode(itemId: string, barcodeId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${itemId}/barcodes/${barcodeId}`);
  }

  static async regenerateInternalBarcode(itemId: string): Promise<ReagentBarcode> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${itemId}/barcodes/regenerate-internal`,
      {},
      reagentBarcodeResponseSchema
    );
    return response.barcode;
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

  static async bulkReassignCategory(
    itemIds: string[],
    categoryId: string
  ): Promise<ReagentBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/reassign-category`,
      { itemIds, categoryId },
      reagentBulkResponseSchema
    );
  }

  static async bulkArchive(itemIds: string[]): Promise<ReagentBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/archive`,
      { itemIds },
      reagentBulkResponseSchema
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

  // Attribute values

  static async setAttributeValue(
    itemId: string,
    data: SetReagentAttributeValueRequest
  ): Promise<ReagentAttributeValue[]> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${itemId}/attributes`,
      data,
      reagentAttributeValueListResponseSchema
    );
    return response.attributeValues;
  }
}
