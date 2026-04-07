/**
 * Consumable Data Transfer Objects
 *
 * Maps between consumable domain entities, row interfaces, and HTTP response shapes.
 */

import type { ConsumableCategory } from '@domain/entities/ConsumableCategory';
import type { ConsumableDocument } from '@domain/entities/ConsumableDocument';
import type { ConsumableLocation } from '@domain/entities/ConsumableLocation';
import type { ConsumableProduct } from '@domain/entities/ConsumableProduct';
import type {
  ConsumableStockRow,
  ConsumableBarcodeRow,
  ConsumableTransactionRow,
} from '@domain/repositories/ConsumableProductRepository';

export interface ConsumableCategoryResponse {
  id: string;
  labId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumableProductResponse {
  id: string;
  labId: string;
  categoryId: string;
  name: string;
  manufacturer?: string;
  catalogNumber?: string;
  vendorName?: string;
  vendorCatalogNumber?: string;
  stockUnit?: string;
  unitsPerStockUnit?: number;
  reorderThreshold?: number;
  reorderQuantity?: number;
  reorderUnit?: string;
  unitPrice?: number;
  properties: string[];
  currentLotNumber?: string;
  description?: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumableProductWithStockResponse extends ConsumableProductResponse {
  totalStock: number;
}

export interface ConsumableProductDetailResponse {
  product: ConsumableProductResponse;
  documents: ConsumableDocumentResponse[];
  barcodes: ConsumableBarcodeResponse[];
  stock: ConsumableStockResponse[];
  recentTransactions: ConsumableTransactionResponse[];
}

export interface ConsumableLocationResponse {
  id: string;
  labId: string;
  name: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumableDocumentResponse {
  id: string;
  productId: string;
  label: string;
  url: string;
  notes?: string;
  createdAt: string;
}

export interface ConsumableBarcodeResponse {
  id: string;
  productId: string;
  barcodeValue: string;
  barcodeType: string;
  isPrimary: boolean;
  label?: string;
}

export interface ConsumableStockResponse {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  updatedAt: string;
}

export interface ConsumableTransactionResponse {
  id: string;
  productId: string;
  locationId: string;
  labId: string;
  type: string;
  quantityChange: number;
  quantityAfter: number;
  lotNumber?: string;
  expirationDate?: string;
  poNumber?: string;
  cost?: number;
  performedBy: string;
  notes?: string;
  createdAt: string;
}

export class ConsumableDto {

  static categoryToResponse(category: ConsumableCategory): ConsumableCategoryResponse {
    return {
      id: category.id,
      labId: category.labId,
      name: category.name,
      parentId: category.parentId ?? null,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  static productToResponse(product: ConsumableProduct): ConsumableProductResponse {
    return {
      id: product.id,
      labId: product.labId,
      categoryId: product.categoryId,
      name: product.name,
      manufacturer: product.manufacturer,
      catalogNumber: product.catalogNumber,
      vendorName: product.vendorName,
      vendorCatalogNumber: product.vendorCatalogNumber,
      stockUnit: product.stockUnit,
      unitsPerStockUnit: product.unitsPerStockUnit,
      reorderThreshold: product.reorderThreshold,
      reorderQuantity: product.reorderQuantity,
      reorderUnit: product.reorderUnit,
      unitPrice: product.unitPrice,
      properties: product.properties,
      currentLotNumber: product.currentLotNumber,
      description: product.description,
      notes: product.notes,
      status: product.status,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  static productWithStockToResponse(product: ConsumableProduct, totalStock: number): ConsumableProductWithStockResponse {
    return {
      ...this.productToResponse(product),
      totalStock,
    };
  }

  static productDetailToResponse(
    product: ConsumableProduct,
    documents: ConsumableDocument[],
    barcodes: ConsumableBarcodeRow[],
    stock: ConsumableStockRow[],
    recentTransactions: ConsumableTransactionRow[]
  ): ConsumableProductDetailResponse {
    return {
      product: this.productToResponse(product),
      documents: documents.map(d => this.documentToResponse(d)),
      barcodes: barcodes.map(b => this.barcodeToResponse(b)),
      stock: stock.map(s => this.stockToResponse(s)),
      recentTransactions: recentTransactions.map(t => this.transactionToResponse(t)),
    };
  }

  static locationToResponse(location: ConsumableLocation): ConsumableLocationResponse {
    return {
      id: location.id,
      labId: location.labId,
      name: location.name,
      description: location.description,
      sortOrder: location.sortOrder,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    };
  }

  static documentToResponse(document: ConsumableDocument): ConsumableDocumentResponse {
    return {
      id: document.id,
      productId: document.productId,
      label: document.label,
      url: document.url,
      notes: document.notes,
      createdAt: document.createdAt.toISOString(),
    };
  }

  static barcodeToResponse(barcode: ConsumableBarcodeRow): ConsumableBarcodeResponse {
    return {
      id: barcode.id,
      productId: barcode.productId,
      barcodeValue: barcode.barcodeValue,
      barcodeType: barcode.barcodeType,
      isPrimary: barcode.isPrimary,
      label: barcode.label,
    };
  }

  static stockToResponse(stock: ConsumableStockRow): ConsumableStockResponse {
    return {
      id: stock.id,
      productId: stock.productId,
      locationId: stock.locationId,
      quantity: stock.quantity,
      updatedAt: typeof stock.updatedAt === 'string' ? stock.updatedAt : (stock.updatedAt as Date).toISOString(),
    };
  }

  static transactionToResponse(txn: ConsumableTransactionRow): ConsumableTransactionResponse {
    return {
      id: txn.id,
      productId: txn.productId,
      locationId: txn.locationId,
      labId: txn.labId,
      type: txn.type,
      quantityChange: txn.quantityChange,
      quantityAfter: txn.quantityAfter,
      lotNumber: txn.lotNumber,
      expirationDate: txn.expirationDate,
      poNumber: txn.poNumber,
      cost: txn.cost,
      performedBy: txn.performedBy,
      notes: txn.notes,
      createdAt: typeof txn.createdAt === 'string' ? txn.createdAt : (txn.createdAt as Date).toISOString(),
    };
  }
}
