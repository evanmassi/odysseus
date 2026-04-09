/**
 * Supply Data Transfer Objects
 *
 * Maps between supply domain entities, row interfaces, and HTTP response shapes.
 */

import type { SupplyCategory } from '@domain/entities/SupplyCategory';
import type { SupplyDocument } from '@domain/entities/SupplyDocument';
import type { SupplyLocation } from '@domain/entities/SupplyLocation';
import type { SupplyProduct } from '@domain/entities/SupplyProduct';
import type {
  SupplyStockRow,
  SupplyBarcodeRow,
  SupplyTransactionRow,
  SupplyPackagingLevelRow,
} from '@domain/repositories/SupplyProductRepository';

export interface SupplyCategoryResponse {
  id: string;
  labId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyProductResponse {
  id: string;
  labId: string;
  categoryId: string;
  name: string;
  manufacturer?: string;
  catalogNumber?: string;
  vendorName?: string;
  vendorCatalogNumber?: string;
  stockUnit?: string;
  baseItemName?: string;
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

export interface SupplyProductWithStockResponse extends SupplyProductResponse {
  totalStock: number;
  locationNames: string[];
}

export interface SupplyPackagingLevelResponse {
  id: string;
  productId: string;
  unitName: string;
  quantity: number;
  parentUnit: string | null;
}

export interface SupplyProductDetailResponse {
  product: SupplyProductResponse;
  documents: SupplyDocumentResponse[];
  barcodes: SupplyBarcodeResponse[];
  stock: SupplyStockResponse[];
  recentTransactions: SupplyTransactionResponse[];
  packagingLevels: SupplyPackagingLevelResponse[];
}

export interface SupplyLocationResponse {
  id: string;
  labId: string;
  name: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyDocumentResponse {
  id: string;
  productId: string;
  label: string;
  url: string;
  notes?: string;
  createdAt: string;
}

export interface SupplyBarcodeResponse {
  id: string;
  productId: string;
  barcodeValue: string;
  barcodeType: string;
  isPrimary: boolean;
  label?: string;
}

export interface SupplyStockResponse {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  updatedAt: string;
}

export interface SupplyTransactionResponse {
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
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  relatedTransactionId?: string;
}

export class SupplyDto {

  static categoryToResponse(category: SupplyCategory): SupplyCategoryResponse {
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

  static productToResponse(product: SupplyProduct): SupplyProductResponse {
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
      baseItemName: product.baseItemName,
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

  static productWithStockToResponse(product: SupplyProduct, totalStock: number, locationNames: string[]): SupplyProductWithStockResponse {
    return {
      ...this.productToResponse(product),
      totalStock,
      locationNames,
    };
  }

  static productDetailToResponse(
    product: SupplyProduct,
    documents: SupplyDocument[],
    barcodes: SupplyBarcodeRow[],
    stock: SupplyStockRow[],
    recentTransactions: SupplyTransactionRow[],
    packagingLevels: SupplyPackagingLevelRow[]
  ): SupplyProductDetailResponse {
    return {
      product: this.productToResponse(product),
      documents: documents.map(d => this.documentToResponse(d)),
      barcodes: barcodes.map(b => this.barcodeToResponse(b)),
      stock: stock.map(s => this.stockToResponse(s)),
      recentTransactions: recentTransactions.map(t => this.transactionToResponse(t)),
      packagingLevels: packagingLevels.map(l => this.packagingLevelToResponse(l)),
    };
  }

  static locationToResponse(location: SupplyLocation): SupplyLocationResponse {
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

  static documentToResponse(document: SupplyDocument): SupplyDocumentResponse {
    return {
      id: document.id,
      productId: document.productId,
      label: document.label,
      url: document.url,
      notes: document.notes,
      createdAt: document.createdAt.toISOString(),
    };
  }

  static barcodeToResponse(barcode: SupplyBarcodeRow): SupplyBarcodeResponse {
    return {
      id: barcode.id,
      productId: barcode.productId,
      barcodeValue: barcode.barcodeValue,
      barcodeType: barcode.barcodeType,
      isPrimary: barcode.isPrimary,
      label: barcode.label,
    };
  }

  static stockToResponse(stock: SupplyStockRow): SupplyStockResponse {
    return {
      id: stock.id,
      productId: stock.productId,
      locationId: stock.locationId,
      quantity: stock.quantity,
      updatedAt: typeof stock.updatedAt === 'string' ? stock.updatedAt : (stock.updatedAt as Date).toISOString(),
    };
  }

  static transactionToResponse(txn: SupplyTransactionRow): SupplyTransactionResponse {
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
      voidedAt: txn.voidedAt,
      voidedBy: txn.voidedBy,
      voidReason: txn.voidReason,
      relatedTransactionId: txn.relatedTransactionId,
    };
  }

  static packagingLevelToResponse(level: SupplyPackagingLevelRow): SupplyPackagingLevelResponse {
    return {
      id: level.id,
      productId: level.productId,
      unitName: level.unitName,
      quantity: level.quantity,
      parentUnit: level.parentUnit ?? null,
    };
  }
}
