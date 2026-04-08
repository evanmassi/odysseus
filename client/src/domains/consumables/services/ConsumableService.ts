/**
 * Consumable Data Service
 *
 * HTTP operations for consumable categories, locations, products, documents,
 * barcodes, stock transactions, and bulk actions.
 */

import {
  type ConsumableCategory,
  type ConsumableProductWithStock,
  type ConsumableProductDetail,
  type ConsumableProduct,
  type ConsumableLocation,
  type ConsumableDocument,
  type ConsumableBarcode,
  type ConsumableTransaction,
  type ConsumableBulkResponse,
  type CreateConsumableCategoryRequest,
  type UpdateConsumableCategoryRequest,
  type CreateConsumableLocationRequest,
  type UpdateConsumableLocationRequest,
  type CreateConsumableProductRequest,
  type UpdateConsumableProductRequest,
  type CreateConsumableBarcodeRequest,
  type CreateConsumableDocumentRequest,
  type RecordConsumableTransactionRequest,
  type RecordConsumableStockCountRequest,
  type ConsumableBulkReceiveRequest,
  type ConsumableBulkConsumeRequest,
  type ConsumableUnitConversion,
  type CreateConsumableUnitConversionRequest,
  consumableCategoryResponseSchema,
  consumableCategoryListResponseSchema,
  consumableLocationResponseSchema,
  consumableLocationListResponseSchema,
  consumableProductResponseSchema,
  consumableProductListResponseSchema,
  consumableProductDetailResponseSchema,
  consumableDocumentResponseSchema,
  consumableBarcodeResponseSchema,
  consumableTransactionResponseSchema,
  consumableTransactionListResponseSchema,
  consumableBulkResponseSchema,
  consumableReorderListResponseSchema,
  consumableUnitConversionResponseSchema,
  messageResponseSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class ConsumableService {
  private static readonly BASE_PATH = '/consumables';

  // Categories

  static async listCategories(): Promise<ConsumableCategory[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/categories`,
      consumableCategoryListResponseSchema
    );
    return response.categories;
  }

  static async createCategory(data: CreateConsumableCategoryRequest): Promise<ConsumableCategory> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/categories`,
      data,
      consumableCategoryResponseSchema
    );
    return response.category;
  }

  static async updateCategory(
    id: string,
    data: UpdateConsumableCategoryRequest
  ): Promise<ConsumableCategory> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/categories/${id}`,
      data,
      consumableCategoryResponseSchema
    );
    return response.category;
  }

  static async deleteCategory(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/categories/${id}`);
  }

  // Locations

  static async listLocations(): Promise<ConsumableLocation[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/locations`,
      consumableLocationListResponseSchema
    );
    return response.locations;
  }

  static async createLocation(data: CreateConsumableLocationRequest): Promise<ConsumableLocation> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/locations`,
      data,
      consumableLocationResponseSchema
    );
    return response.location;
  }

  static async updateLocation(
    id: string,
    data: UpdateConsumableLocationRequest
  ): Promise<ConsumableLocation> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/locations/${id}`,
      data,
      consumableLocationResponseSchema
    );
    return response.location;
  }

  static async deleteLocation(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/locations/${id}`);
  }

  // Products

  static async listProducts(): Promise<ConsumableProductWithStock[]> {
    const response = await httpClient.getData(this.BASE_PATH, consumableProductListResponseSchema);
    return response.products;
  }

  static async getById(id: string): Promise<ConsumableProductDetail> {
    return await httpClient.getData(
      `${this.BASE_PATH}/${id}`,
      consumableProductDetailResponseSchema
    );
  }

  static async createProduct(data: CreateConsumableProductRequest): Promise<ConsumableProduct> {
    const response = await httpClient.postData(
      this.BASE_PATH,
      data,
      consumableProductResponseSchema
    );
    return response.product;
  }

  static async updateProduct(
    id: string,
    data: UpdateConsumableProductRequest
  ): Promise<ConsumableProduct> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${id}`,
      data,
      consumableProductResponseSchema
    );
    return response.product;
  }

  static async archiveProduct(id: string): Promise<void> {
    await httpClient.postData(`${this.BASE_PATH}/${id}/archive`, {}, messageResponseSchema);
  }

  static async deleteProduct(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${id}`);
  }

  // Documents

  static async addDocument(
    productId: string,
    data: CreateConsumableDocumentRequest
  ): Promise<ConsumableDocument> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${productId}/documents`,
      data,
      consumableDocumentResponseSchema
    );
    return response.document;
  }

  static async removeDocument(productId: string, docId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${productId}/documents/${docId}`);
  }

  // Barcodes

  static async addBarcode(
    productId: string,
    data: CreateConsumableBarcodeRequest
  ): Promise<ConsumableBarcode> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${productId}/barcodes`,
      data,
      consumableBarcodeResponseSchema
    );
    return response.barcode;
  }

  static async removeBarcode(productId: string, barcodeId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${productId}/barcodes/${barcodeId}`);
  }

  // Unit conversions

  static async addConversion(
    productId: string,
    data: CreateConsumableUnitConversionRequest
  ): Promise<ConsumableUnitConversion> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${productId}/conversions`,
      data,
      consumableUnitConversionResponseSchema
    );
    return response.conversion;
  }

  static async removeConversion(productId: string, conversionId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${productId}/conversions/${conversionId}`);
  }

  /** Skips Zod validation — server may return null product for unresolved barcodes */
  static async resolveBarcode(value: string): Promise<ConsumableProduct | null> {
    const response = await httpClient.get(
      `${this.BASE_PATH}/barcodes/resolve?value=${encodeURIComponent(value)}`
    );
    const data = response.data as { success: boolean; data: { product: ConsumableProduct | null } };
    return data.data.product;
  }

  // Stock operations

  static async recordTransaction(
    data: RecordConsumableTransactionRequest
  ): Promise<ConsumableTransaction> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/transactions`,
      data,
      consumableTransactionResponseSchema
    );
    return response.transaction;
  }

  static async recordStockCount(
    data: RecordConsumableStockCountRequest
  ): Promise<ConsumableTransaction> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/stock-counts`,
      data,
      consumableTransactionResponseSchema
    );
    return response.transaction;
  }

  static async getTransactionHistory(productId: string): Promise<ConsumableTransaction[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/${productId}/transactions`,
      consumableTransactionListResponseSchema
    );
    return response.transactions;
  }

  // Bulk operations

  static async bulkReceive(data: ConsumableBulkReceiveRequest): Promise<ConsumableBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/receive`,
      data,
      consumableBulkResponseSchema
    );
  }

  static async bulkConsume(data: ConsumableBulkConsumeRequest): Promise<ConsumableBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/consume`,
      data,
      consumableBulkResponseSchema
    );
  }

  static async bulkReassignCategory(
    productIds: string[],
    categoryId: string
  ): Promise<ConsumableBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/reassign-category`,
      { productIds, categoryId },
      consumableBulkResponseSchema
    );
  }

  static async bulkArchive(productIds: string[]): Promise<ConsumableBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/archive`,
      { productIds },
      consumableBulkResponseSchema
    );
  }

  // Reorder list

  static async getReorderList(): Promise<ConsumableProductWithStock[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/reorder-list`,
      consumableReorderListResponseSchema
    );
    return response.products;
  }
}
