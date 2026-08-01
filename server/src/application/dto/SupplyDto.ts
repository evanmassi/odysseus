/**
 * Supply Data Transfer Objects
 *
 * Maps between supply domain entities, row interfaces, and HTTP response shapes.
 */

import type { SupplyCategory } from '@domain/entities/SupplyCategory';
import type { SupplyDocument } from '@domain/entities/SupplyDocument';
import type { SupplyItem } from '@domain/entities/SupplyItem';
import type {
  SupplyStockRow,
  SupplyBarcodeRow,
  SupplyTransactionRow,
  SupplyPackagingLevelRow,
  SupplyAttributeValueRow,
} from '@domain/repositories/SupplyItemRepository';

import type {
  BarcodeType,
  SupplyTransactionType,
  SupplyCategory as SupplyCategoryData,
  SupplyItem as SupplyItemData,
  SupplyItemWithStock,
  SupplyDocument as SupplyDocumentData,
  SupplyBarcode,
  SupplyPackagingLevel,
  SupplyTransaction as SupplyTransactionData,
  SupplyItemDetail as SupplyItemDetailData,
  SupplyAttributeSummary,
  SupplyAttributeValue,
} from '@odysseus/shared-schemas';

export type SupplyCategoryResponse = SupplyCategoryData;

export type SupplyItemResponse = SupplyItemData;

export type SupplyItemWithStockResponse = SupplyItemWithStock;

export type SupplyPackagingLevelResponse = SupplyPackagingLevel;

export type SupplyItemDetailResponse = SupplyItemDetailData;


export type SupplyDocumentResponse = SupplyDocumentData;

export type SupplyBarcodeResponse = SupplyBarcode;

// Hand-rolled: SupplyStock has no domain entity; shape matches supplyStockSchema.
export interface SupplyStockResponse {
  id: string;
  itemId: string;
  locationId: string;
  quantity: number;
  updatedAt: Date;
}

export type SupplyTransactionResponse = SupplyTransactionData;

export class SupplyDto {
  static categoryToResponse(category: SupplyCategory): SupplyCategoryResponse {
    return {
      id: category.id,
      labId: category.labId,
      name: category.name,
      parentId: category.parentId ?? null,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  static itemToResponse(item: SupplyItem): SupplyItemResponse {
    return {
      id: item.id,
      labId: item.labId,
      categoryId: item.categoryId,
      name: item.name,
      manufacturer: item.manufacturer,
      catalogNumber: item.catalogNumber,
      vendorName: item.vendorName,
      vendorCatalogNumber: item.vendorCatalogNumber,
      stockUnit: item.stockUnit,
      baseItemName: item.baseItemName,
      reorderThreshold: item.reorderThreshold,
      reorderThresholdUnit: item.reorderThresholdUnit,
      reorderQuantity: item.reorderQuantity,
      reorderUnit: item.reorderUnit,
      unitPrice: item.unitPrice,
      properties: item.properties,
      currentLotNumber: item.currentLotNumber,
      description: item.description,
      notes: item.notes,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  static attributeValueToResponse(row: SupplyAttributeValueRow): SupplyAttributeValue {
    return {
      id: row.id,
      itemId: row.itemId,
      definitionId: row.definitionId,
      valueOptionId: row.valueOptionId ?? null,
      valueText: row.valueText ?? null,
      valueNumber: row.valueNumber ?? null,
    };
  }

  static attributeSummaryToResponse(row: SupplyAttributeValueRow): SupplyAttributeSummary {
    return {
      definitionId: row.definitionId,
      valueOptionId: row.valueOptionId ?? null,
      valueText: row.valueText ?? null,
      valueNumber: row.valueNumber ?? null,
    };
  }

  static itemWithStockToResponse(
    item: SupplyItem,
    totalStock: number,
    locationNames: string[],
    attributeValues: SupplyAttributeSummary[]
  ): SupplyItemWithStockResponse {
    return {
      ...this.itemToResponse(item),
      totalStock,
      locationNames,
      attributeValues,
    };
  }

  static itemDetailToResponse(
    item: SupplyItem,
    documents: SupplyDocument[],
    barcodes: SupplyBarcodeRow[],
    stock: SupplyStockRow[],
    recentTransactions: SupplyTransactionRow[],
    packagingLevels: SupplyPackagingLevelRow[],
    attributeValues: SupplyAttributeValue[]
  ): SupplyItemDetailResponse {
    return {
      item: this.itemToResponse(item),
      documents: documents.map(d => this.documentToResponse(d)),
      barcodes: barcodes.map(b => this.barcodeToResponse(b)),
      stock: stock.map(s => this.stockToResponse(s)),
      recentTransactions: recentTransactions.map(t => this.transactionToResponse(t)),
      packagingLevels: packagingLevels.map(l => this.packagingLevelToResponse(l)),
      attributeValues,
    };
  }

  static documentToResponse(document: SupplyDocument): SupplyDocumentResponse {
    return {
      id: document.id,
      itemId: document.itemId,
      label: document.label,
      url: document.url,
      notes: document.notes,
      createdAt: document.createdAt,
    };
  }

  static barcodeToResponse(barcode: SupplyBarcodeRow): SupplyBarcodeResponse {
    return {
      id: barcode.id,
      itemId: barcode.itemId,
      barcodeValue: barcode.barcodeValue,
      barcodeType: barcode.barcodeType as BarcodeType,
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
      updatedAt: new Date(stock.updatedAt),
    };
  }

  static transactionToResponse(txn: SupplyTransactionRow): SupplyTransactionResponse {
    return {
      id: txn.id,
      itemId: txn.itemId,
      locationId: txn.locationId,
      labId: txn.labId,
      type: txn.type as SupplyTransactionType,
      quantityChange: txn.quantityChange,
      quantityAfter: txn.quantityAfter,
      lotNumber: txn.lotNumber,
      expirationDate: txn.expirationDate,
      poNumber: txn.poNumber,
      cost: txn.cost,
      performedBy: txn.performedBy,
      notes: txn.notes,
      createdAt: new Date(txn.createdAt),
      voidedAt: txn.voidedAt ? new Date(txn.voidedAt) : undefined,
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
