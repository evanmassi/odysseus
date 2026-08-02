/**
 * Supply Data Service
 *
 * HTTP operations for supply categories, locations, items, documents,
 * barcodes, stock transactions, and bulk actions.
 */

import {
  type SupplyCategory,
  type SupplyItemWithStock,
  type SupplyItemDetail,
  type SupplyItem,
  type SupplyDocument,
  type SupplyBarcode,
  type SupplyTransaction,
  type SupplyVoidTransactionResponse,
  type SupplyBulkResponse,
  type CreateSupplyCategoryRequest,
  type UpdateSupplyCategoryRequest,
  type CreateSupplyItemRequest,
  type UpdateSupplyItemRequest,
  type CreateSupplyBarcodeRequest,
  type UpdateSupplyBarcodeRequest,
  type CreateSupplyDocumentRequest,
  type UpdateSupplyDocumentRequest,
  type RecordSupplyTransactionRequest,
  type RecordSupplyStockCountRequest,
  type SupplyBulkReceiveRequest,
  type SupplyBulkIssueRequest,
  type VoidSupplyTransactionRequest,
  type SupplyBulkVoidRequest,
  type SupplyBulkBarcodesResponse,
  type AttributeValue,
  type SetAttributeValueRequest,
  type SupplyPackagingLevel,
  type CreateSupplyPackagingLevelRequest,
  supplyCategoryResponseSchema,
  supplyCategoryListResponseSchema,
  supplyItemResponseSchema,
  supplyItemListResponseSchema,
  supplyItemDetailResponseSchema,
  supplyDocumentResponseSchema,
  supplyBarcodeResponseSchema,
  supplyTransactionResponseSchema,
  supplyTransactionListResponseSchema,
  supplyBulkResponseSchema,
  supplyBulkBarcodesResponseSchema,
  attributeValueListResponseSchema,
  supplyVoidTransactionResponseSchema,
  supplyPackagingLevelResponseSchema,
  messageResponseSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';
import { fetchInChunks } from '@shared/utils/chunkedFetch';

export class SupplyService {
  private static readonly BASE_PATH = '/supplies';

  // Categories

  static async listCategories(): Promise<SupplyCategory[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/categories`,
      supplyCategoryListResponseSchema
    );
    return response.categories;
  }

  static async createCategory(data: CreateSupplyCategoryRequest): Promise<SupplyCategory> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/categories`,
      data,
      supplyCategoryResponseSchema
    );
    return response.category;
  }

  static async updateCategory(
    id: string,
    data: UpdateSupplyCategoryRequest
  ): Promise<SupplyCategory> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/categories/${id}`,
      data,
      supplyCategoryResponseSchema
    );
    return response.category;
  }

  static async deleteCategory(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/categories/${id}`);
  }

  // Items

  static async listItems(): Promise<SupplyItemWithStock[]> {
    const response = await httpClient.getData(this.BASE_PATH, supplyItemListResponseSchema);
    return response.items;
  }

  static async getById(id: string): Promise<SupplyItemDetail> {
    return await httpClient.getData(`${this.BASE_PATH}/${id}`, supplyItemDetailResponseSchema);
  }

  static async createItem(data: CreateSupplyItemRequest): Promise<SupplyItem> {
    const response = await httpClient.postData(this.BASE_PATH, data, supplyItemResponseSchema);
    return response.item;
  }

  static async updateItem(id: string, data: UpdateSupplyItemRequest): Promise<SupplyItem> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${id}`,
      data,
      supplyItemResponseSchema
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
    data: CreateSupplyDocumentRequest
  ): Promise<SupplyDocument> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${itemId}/documents`,
      data,
      supplyDocumentResponseSchema
    );
    return response.document;
  }

  static async updateDocument(
    itemId: string,
    docId: string,
    data: UpdateSupplyDocumentRequest
  ): Promise<SupplyDocument> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${itemId}/documents/${docId}`,
      data,
      supplyDocumentResponseSchema
    );
    return response.document;
  }

  static async removeDocument(itemId: string, docId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${itemId}/documents/${docId}`);
  }

  // Barcodes

  static async addBarcode(
    itemId: string,
    data: CreateSupplyBarcodeRequest
  ): Promise<SupplyBarcode> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${itemId}/barcodes`,
      data,
      supplyBarcodeResponseSchema
    );
    return response.barcode;
  }

  static async updateBarcode(
    itemId: string,
    barcodeId: string,
    data: UpdateSupplyBarcodeRequest
  ): Promise<SupplyBarcode> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${itemId}/barcodes/${barcodeId}`,
      data,
      supplyBarcodeResponseSchema
    );
    return response.barcode;
  }

  static async removeBarcode(itemId: string, barcodeId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${itemId}/barcodes/${barcodeId}`);
  }

  static async regenerateInternalBarcode(itemId: string): Promise<SupplyBarcode> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${itemId}/barcodes/regenerate-internal`,
      {},
      supplyBarcodeResponseSchema
    );
    return response.barcode;
  }

  // Packaging levels

  static async addPackagingLevel(
    itemId: string,
    data: CreateSupplyPackagingLevelRequest
  ): Promise<SupplyPackagingLevel> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${itemId}/packaging-levels`,
      data,
      supplyPackagingLevelResponseSchema
    );
    return response.packagingLevel;
  }

  static async removePackagingLevel(itemId: string, levelId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${itemId}/packaging-levels/${levelId}`);
  }

  // Stock operations

  static async recordTransaction(data: RecordSupplyTransactionRequest): Promise<SupplyTransaction> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/transactions`,
      data,
      supplyTransactionResponseSchema
    );
    return response.transaction;
  }

  static async recordStockCount(data: RecordSupplyStockCountRequest): Promise<SupplyTransaction> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/stock-counts`,
      data,
      supplyTransactionResponseSchema
    );
    return response.transaction;
  }

  static async getTransactionHistory(itemId: string): Promise<SupplyTransaction[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/${itemId}/transactions`,
      supplyTransactionListResponseSchema
    );
    return response.transactions;
  }

  static async voidTransaction(
    transactionId: string,
    data: VoidSupplyTransactionRequest
  ): Promise<SupplyVoidTransactionResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/transactions/${transactionId}/void`,
      data,
      supplyVoidTransactionResponseSchema
    );
  }

  // Bulk operations

  static async bulkReceive(data: SupplyBulkReceiveRequest): Promise<SupplyBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/receive`,
      data,
      supplyBulkResponseSchema
    );
  }

  static async bulkIssue(data: SupplyBulkIssueRequest): Promise<SupplyBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/issue`,
      data,
      supplyBulkResponseSchema
    );
  }

  static async bulkReassignCategory(
    itemIds: string[],
    categoryId: string
  ): Promise<SupplyBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/reassign-category`,
      { itemIds, categoryId },
      supplyBulkResponseSchema
    );
  }

  static async bulkArchive(itemIds: string[]): Promise<SupplyBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/archive`,
      { itemIds },
      supplyBulkResponseSchema
    );
  }

  static async bulkVoidTransactions(data: SupplyBulkVoidRequest): Promise<SupplyBulkResponse> {
    return await httpClient.postData(`${this.BASE_PATH}/bulk/void`, data, supplyBulkResponseSchema);
  }

  static async bulkGetBarcodes(itemIds: string[]): Promise<SupplyBulkBarcodesResponse> {
    const barcodes = await fetchInChunks(itemIds, async chunk => {
      const response = await httpClient.postData(
        `${this.BASE_PATH}/bulk/barcodes`,
        { itemIds: chunk },
        supplyBulkBarcodesResponseSchema
      );
      return response.barcodes;
    });

    return { barcodes };
  }
  static async setAttributeValue(
    itemId: string,
    data: SetAttributeValueRequest
  ): Promise<AttributeValue[]> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${itemId}/attributes`,
      data,
      attributeValueListResponseSchema
    );
    return response.attributeValues;
  }
}
