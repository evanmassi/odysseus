/**
 * Supply Data Service
 *
 * HTTP operations for supply categories, locations, products, documents,
 * barcodes, stock transactions, and bulk actions.
 */

import {
  type SupplyCategory,
  type SupplyProductWithStock,
  type SupplyProductDetail,
  type SupplyProduct,
  type SupplyLocation,
  type SupplyDocument,
  type SupplyBarcode,
  type SupplyTransaction,
  type SupplyBulkResponse,
  type CreateSupplyCategoryRequest,
  type UpdateSupplyCategoryRequest,
  type CreateSupplyLocationRequest,
  type UpdateSupplyLocationRequest,
  type CreateSupplyProductRequest,
  type UpdateSupplyProductRequest,
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
  type SupplyPackagingLevel,
  type CreateSupplyPackagingLevelRequest,
  supplyCategoryResponseSchema,
  supplyCategoryListResponseSchema,
  supplyLocationResponseSchema,
  supplyLocationListResponseSchema,
  supplyProductResponseSchema,
  supplyProductListResponseSchema,
  supplyProductDetailResponseSchema,
  supplyDocumentResponseSchema,
  supplyBarcodeResponseSchema,
  supplyTransactionResponseSchema,
  supplyTransactionListResponseSchema,
  supplyBulkResponseSchema,
  supplyVoidTransactionResponseSchema,
  supplyReorderListResponseSchema,
  supplyPackagingLevelResponseSchema,
  messageResponseSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

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

  // Locations

  static async listLocations(): Promise<SupplyLocation[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/locations`,
      supplyLocationListResponseSchema
    );
    return response.locations;
  }

  static async createLocation(data: CreateSupplyLocationRequest): Promise<SupplyLocation> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/locations`,
      data,
      supplyLocationResponseSchema
    );
    return response.location;
  }

  static async updateLocation(
    id: string,
    data: UpdateSupplyLocationRequest
  ): Promise<SupplyLocation> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/locations/${id}`,
      data,
      supplyLocationResponseSchema
    );
    return response.location;
  }

  static async deleteLocation(id: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/locations/${id}`);
  }

  // Products

  static async listProducts(): Promise<SupplyProductWithStock[]> {
    const response = await httpClient.getData(this.BASE_PATH, supplyProductListResponseSchema);
    return response.products;
  }

  static async getById(id: string): Promise<SupplyProductDetail> {
    return await httpClient.getData(`${this.BASE_PATH}/${id}`, supplyProductDetailResponseSchema);
  }

  static async createProduct(data: CreateSupplyProductRequest): Promise<SupplyProduct> {
    const response = await httpClient.postData(this.BASE_PATH, data, supplyProductResponseSchema);
    return response.product;
  }

  static async updateProduct(id: string, data: UpdateSupplyProductRequest): Promise<SupplyProduct> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${id}`,
      data,
      supplyProductResponseSchema
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
    data: CreateSupplyDocumentRequest
  ): Promise<SupplyDocument> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${productId}/documents`,
      data,
      supplyDocumentResponseSchema
    );
    return response.document;
  }

  static async updateDocument(
    productId: string,
    docId: string,
    data: UpdateSupplyDocumentRequest
  ): Promise<SupplyDocument> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${productId}/documents/${docId}`,
      data,
      supplyDocumentResponseSchema
    );
    return response.document;
  }

  static async removeDocument(productId: string, docId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${productId}/documents/${docId}`);
  }

  // Barcodes

  static async addBarcode(
    productId: string,
    data: CreateSupplyBarcodeRequest
  ): Promise<SupplyBarcode> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${productId}/barcodes`,
      data,
      supplyBarcodeResponseSchema
    );
    return response.barcode;
  }

  static async updateBarcode(
    productId: string,
    barcodeId: string,
    data: UpdateSupplyBarcodeRequest
  ): Promise<SupplyBarcode> {
    const response = await httpClient.putData(
      `${this.BASE_PATH}/${productId}/barcodes/${barcodeId}`,
      data,
      supplyBarcodeResponseSchema
    );
    return response.barcode;
  }

  static async removeBarcode(productId: string, barcodeId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${productId}/barcodes/${barcodeId}`);
  }

  // Packaging levels

  static async addPackagingLevel(
    productId: string,
    data: CreateSupplyPackagingLevelRequest
  ): Promise<SupplyPackagingLevel> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${productId}/packaging-levels`,
      data,
      supplyPackagingLevelResponseSchema
    );
    return response.packagingLevel;
  }

  static async updatePackagingLevel(
    productId: string,
    levelId: string,
    quantity: number
  ): Promise<void> {
    await httpClient.putData(
      `${this.BASE_PATH}/${productId}/packaging-levels/${levelId}`,
      { quantity },
      messageResponseSchema
    );
  }

  static async regenerateInternalBarcode(productId: string): Promise<SupplyBarcode> {
    const response = await httpClient.postData(
      `${this.BASE_PATH}/${productId}/barcodes/regenerate-internal`,
      {},
      supplyBarcodeResponseSchema
    );
    return response.barcode;
  }

  static async removePackagingLevel(productId: string, levelId: string): Promise<void> {
    await httpClient.deleteData(`${this.BASE_PATH}/${productId}/packaging-levels/${levelId}`);
  }

  /** Skips Zod validation — server may return null product for unresolved barcodes */
  static async resolveBarcode(value: string): Promise<SupplyProduct | null> {
    const response = await httpClient.get(
      `${this.BASE_PATH}/barcodes/resolve?value=${encodeURIComponent(value)}`,
      { 'Cache-Control': 'no-cache' }
    );
    const data = response.data as { success: boolean; data: { product: SupplyProduct | null } };
    return data.data.product;
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

  static async getTransactionHistory(productId: string): Promise<SupplyTransaction[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/${productId}/transactions`,
      supplyTransactionListResponseSchema
    );
    return response.transactions;
  }

  static async voidTransaction(
    transactionId: string,
    data: VoidSupplyTransactionRequest
  ): Promise<{ original: SupplyTransaction; reversal: SupplyTransaction }> {
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
    productIds: string[],
    categoryId: string
  ): Promise<SupplyBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/reassign-category`,
      { productIds, categoryId },
      supplyBulkResponseSchema
    );
  }

  static async bulkArchive(productIds: string[]): Promise<SupplyBulkResponse> {
    return await httpClient.postData(
      `${this.BASE_PATH}/bulk/archive`,
      { productIds },
      supplyBulkResponseSchema
    );
  }

  static async bulkVoidTransactions(data: SupplyBulkVoidRequest): Promise<SupplyBulkResponse> {
    return await httpClient.postData(`${this.BASE_PATH}/bulk/void`, data, supplyBulkResponseSchema);
  }

  // Reorder list

  static async getReorderList(): Promise<SupplyProductWithStock[]> {
    const response = await httpClient.getData(
      `${this.BASE_PATH}/reorder-list`,
      supplyReorderListResponseSchema
    );
    return response.products;
  }
}
