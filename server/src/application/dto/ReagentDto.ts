/**
 * Reagent Data Transfer Objects
 *
 * Maps between reagent domain entities, row interfaces, and HTTP response shapes.
 */

import type { ReagentCategory } from '@domain/entities/ReagentCategory';
import type { ReagentDocument } from '@domain/entities/ReagentDocument';
import type { ReagentItem } from '@domain/entities/ReagentItem';
import type { ReagentLocation } from '@domain/entities/ReagentLocation';
import type {
  ReagentLotRow,
  ReagentBarcodeRow,
  ReagentTransactionRow,
  ReagentPackagingLevelRow,
} from '@domain/repositories/ReagentItemRepository';

import type {
  ReagentBarcodeType,
  ReagentTransactionType,
  ReagentLotStatus,
  ReagentCategory as ReagentCategoryData,
  ReagentItem as ReagentItemData,
  ReagentItemWithStock,
  ReagentLot as ReagentLotData,
  ReagentLocation as ReagentLocationData,
  ReagentDocument as ReagentDocumentData,
  ReagentBarcode,
  ReagentPackagingLevel,
  ReagentTransaction as ReagentTransactionData,
  ReagentItemDetail as ReagentItemDetailData,
  ReagentAttributeValue,
  ReagentAttributeSummary,
} from '@odysseus/shared-schemas';

export type ReagentCategoryResponse = ReagentCategoryData;
export type ReagentItemResponse = ReagentItemData;
export type ReagentItemWithStockResponse = ReagentItemWithStock;
export type ReagentLotResponse = ReagentLotData;
export type ReagentPackagingLevelResponse = ReagentPackagingLevel;
export type ReagentItemDetailResponse = ReagentItemDetailData;
export type ReagentLocationResponse = ReagentLocationData;
export type ReagentDocumentResponse = ReagentDocumentData;
export type ReagentBarcodeResponse = ReagentBarcode;
export type ReagentTransactionResponse = ReagentTransactionData;

export class ReagentDto {
  static categoryToResponse(category: ReagentCategory): ReagentCategoryResponse {
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

  static itemToResponse(item: ReagentItem): ReagentItemResponse {
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
      reagentType: item.reagentType,
      casNumber: item.casNumber,
      concentration: item.concentration,
      concentrationUnit: item.concentrationUnit,
      expiryWarningDays: item.expiryWarningDays,
      reorderThreshold: item.reorderThreshold,
      reorderThresholdUnit: item.reorderThresholdUnit,
      reorderQuantity: item.reorderQuantity,
      reorderUnit: item.reorderUnit,
      unitPrice: item.unitPrice,
      description: item.description,
      notes: item.notes,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  static itemWithStockToResponse(
    item: ReagentItem,
    totalStock: number,
    locationNames: string[],
    soonestExpiration: string | undefined,
    attributeValues: ReagentAttributeSummary[]
  ): ReagentItemWithStockResponse {
    return {
      ...this.itemToResponse(item),
      totalStock,
      locationNames,
      soonestExpiration,
      attributeValues,
    };
  }

  static lotToResponse(lot: ReagentLotRow): ReagentLotResponse {
    return {
      id: lot.id,
      itemId: lot.itemId,
      locationId: lot.locationId,
      lotNumber: lot.lotNumber,
      quantity: lot.quantity,
      expirationDate: lot.expirationDate,
      openedDate: lot.openedDate,
      receivedDate: lot.receivedDate,
      concentration: lot.concentration,
      concentrationUnit: lot.concentrationUnit,
      status: lot.status as ReagentLotStatus,
      createdAt: new Date(lot.createdAt),
      updatedAt: new Date(lot.updatedAt),
    };
  }

  static itemDetailToResponse(
    item: ReagentItem,
    lots: ReagentLotRow[],
    documents: ReagentDocument[],
    barcodes: ReagentBarcodeRow[],
    recentTransactions: ReagentTransactionRow[],
    packagingLevels: ReagentPackagingLevelRow[],
    attributeValues: ReagentAttributeValue[]
  ): ReagentItemDetailResponse {
    return {
      item: this.itemToResponse(item),
      lots: lots.map(l => this.lotToResponse(l)),
      documents: documents.map(d => this.documentToResponse(d)),
      barcodes: barcodes.map(b => this.barcodeToResponse(b)),
      recentTransactions: recentTransactions.map(t => this.transactionToResponse(t)),
      packagingLevels: packagingLevels.map(l => this.packagingLevelToResponse(l)),
      attributeValues,
    };
  }

  static locationToResponse(location: ReagentLocation): ReagentLocationResponse {
    return {
      id: location.id,
      labId: location.labId,
      name: location.name,
      description: location.description,
      sortOrder: location.sortOrder,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }

  static documentToResponse(document: ReagentDocument): ReagentDocumentResponse {
    return {
      id: document.id,
      itemId: document.itemId,
      label: document.label,
      url: document.url,
      notes: document.notes,
      docType: document.docType,
      createdAt: document.createdAt,
    };
  }

  static barcodeToResponse(barcode: ReagentBarcodeRow): ReagentBarcodeResponse {
    return {
      id: barcode.id,
      itemId: barcode.itemId,
      lotId: barcode.lotId ?? null,
      barcodeValue: barcode.barcodeValue,
      barcodeType: barcode.barcodeType as ReagentBarcodeType,
      isPrimary: barcode.isPrimary,
      label: barcode.label,
    };
  }

  static transactionToResponse(txn: ReagentTransactionRow): ReagentTransactionResponse {
    return {
      id: txn.id,
      itemId: txn.itemId,
      lotId: txn.lotId ?? null,
      locationId: txn.locationId,
      labId: txn.labId,
      type: txn.type as ReagentTransactionType,
      quantityChange: txn.quantityChange,
      quantityAfter: txn.quantityAfter,
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

  static packagingLevelToResponse(level: ReagentPackagingLevelRow): ReagentPackagingLevelResponse {
    return {
      id: level.id,
      itemId: level.itemId,
      unitName: level.unitName,
      quantity: level.quantity,
      parentUnit: level.parentUnit ?? null,
    };
  }
}
