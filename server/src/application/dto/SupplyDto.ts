/**
 * Supply Data Transfer Objects
 *
 * Maps between supply domain entities, row interfaces, and HTTP response shapes.
 */

import type { SupplyCategory } from '@domain/entities/SupplyCategory';
import type { SupplyDocument } from '@domain/entities/SupplyDocument';
import type { SupplyLocation } from '@domain/entities/SupplyLocation';
import type { SupplyItem } from '@domain/entities/SupplyItem';
import type {
  SupplyStockRow,
  SupplyBarcodeRow,
  SupplyTransactionRow,
  SupplyPackagingLevelRow,
} from '@domain/repositories/SupplyItemRepository';

export interface SupplyCategoryResponse {
  id: string;
  labId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyItemResponse {
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
  reorderThresholdUnit?: string;
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

export interface SupplyItemWithStockResponse extends SupplyItemResponse {
  totalStock: number;
  locationNames: string[];
}

export interface SupplyPackagingLevelResponse {
  id: string;
  itemId: string;
  unitName: string;
  quantity: number;
  parentUnit: string | null;
}

export interface SupplyItemDetailResponse {
  item: SupplyItemResponse;
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
  itemId: string;
  label: string;
  url: string;
  notes?: string;
  createdAt: string;
}

export interface SupplyBarcodeResponse {
  id: string;
  itemId: string;
  barcodeValue: string;
  barcodeType: string;
  isPrimary: boolean;
  label?: string;
}

export interface SupplyStockResponse {
  id: string;
  itemId: string;
  locationId: string;
  quantity: number;
  updatedAt: string;
}

export interface SupplyTransactionResponse {
  id: string;
  itemId: string;
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

  static itemToResponse(item: SupplyItem): SupplyItemResponse {
    return {
      id:item.id,
      labId:item.labId,
      categoryId:item.categoryId,
      name:item.name,
      manufacturer:item.manufacturer,
      catalogNumber:item.catalogNumber,
      vendorName:item.vendorName,
      vendorCatalogNumber:item.vendorCatalogNumber,
      stockUnit:item.stockUnit,
      baseItemName:item.baseItemName,
      reorderThreshold:item.reorderThreshold,
      reorderThresholdUnit:item.reorderThresholdUnit,
      reorderQuantity:item.reorderQuantity,
      reorderUnit:item.reorderUnit,
      unitPrice:item.unitPrice,
      properties:item.properties,
      currentLotNumber:item.currentLotNumber,
      description:item.description,
      notes:item.notes,
      status:item.status,
      createdAt:item.createdAt.toISOString(),
      updatedAt:item.updatedAt.toISOString(),
    };
  }

  static itemWithStockToResponse(item: SupplyItem, totalStock: number, locationNames: string[]): SupplyItemWithStockResponse {
    return {
      ...this.itemToResponse(item),
      totalStock,
      locationNames,
    };
  }

  static itemDetailToResponse(
    item: SupplyItem,
    documents: SupplyDocument[],
    barcodes: SupplyBarcodeRow[],
    stock: SupplyStockRow[],
    recentTransactions: SupplyTransactionRow[],
    packagingLevels: SupplyPackagingLevelRow[]
  ): SupplyItemDetailResponse {
    return {
      item: this.itemToResponse(item),
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
      itemId: document.itemId,
      label: document.label,
      url: document.url,
      notes: document.notes,
      createdAt: document.createdAt.toISOString(),
    };
  }

  static barcodeToResponse(barcode: SupplyBarcodeRow): SupplyBarcodeResponse {
    return {
      id: barcode.id,
      itemId: barcode.itemId,
      barcodeValue: barcode.barcodeValue,
      barcodeType: barcode.barcodeType,
      isPrimary: barcode.isPrimary,
      label: barcode.label,
    };
  }

  static stockToResponse(stock: SupplyStockRow): SupplyStockResponse {
    return {
      id: stock.id,
      itemId: stock.itemId,
      locationId: stock.locationId,
      quantity: stock.quantity,
      updatedAt: typeof stock.updatedAt === 'string' ? stock.updatedAt : (stock.updatedAt as Date).toISOString(),
    };
  }

  static transactionToResponse(txn: SupplyTransactionRow): SupplyTransactionResponse {
    return {
      id: txn.id,
      itemId: txn.itemId,
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
      itemId: level.itemId,
      unitName: level.unitName,
      quantity: level.quantity,
      parentUnit: level.parentUnit ?? null,
    };
  }
}
