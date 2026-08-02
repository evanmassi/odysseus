/**
 * Supply Item Repository Interface
 *
 * Unified data access contract for supply items, documents, barcodes,
 * stock levels, transactions, and lookup value support.
 */

import type { DocumentPatch } from '@domain/entities/Document';
import type { SupplyDocument } from '@domain/entities/SupplyDocument';
import type { SupplyItem } from '@domain/entities/SupplyItem';
import type { AttributeValueRow } from '@domain/repositories/AttributeRepository';

export interface SupplyStockRow {
  id: string;
  itemId: string;
  locationId: string;
  quantity: number;
  updatedAt: Date | string;
}

export interface SupplyBarcodeRow {
  id: string;
  itemId: string;
  barcodeValue: string;
  barcodeType: string;
  isPrimary: boolean;
  label?: string;
}

export interface SupplyTransactionRow {
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
  createdAt: Date | string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  relatedTransactionId?: string;
}

export interface VoidTransactionData {
  transactionId: string;
  labId: string;
  voidedBy: string;
  voidReason: string;
}

export interface ItemWithStock {
  item: SupplyItem;
  totalStock: number;
  locationNames: string[];
}

export interface RecordTransactionData {
  itemId: string;
  locationId: string;
  labId: string;
  type: string;
  quantityChange: number;
  performedBy: string;
  lotNumber?: string;
  expirationDate?: string;
  poNumber?: string;
  cost?: number;
  notes?: string;
}

export interface SupplyPackagingLevelRow {
  id: string;
  itemId: string;
  unitName: string;
  quantity: number;
  parentUnit: string | undefined;
}

export interface SupplyItemRepository {
  // Items

  findById(id: string, labId: string): Promise<SupplyItem | null>;
  findByLabIdWithStock(labId: string): Promise<ItemWithStock[]>;
  save(item: SupplyItem): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;
  hasTransactions(id: string): Promise<boolean>;

  // Documents

  findDocumentsByItemId(itemId: string): Promise<SupplyDocument[]>;
  saveDocument(document: SupplyDocument): Promise<void>;
  updateDocument(id: string, itemId: string, fields: DocumentPatch): Promise<SupplyDocument | null>;
  deleteDocument(id: string, itemId: string): Promise<boolean>;

  // Barcodes

  findBarcodesByItemId(itemId: string): Promise<SupplyBarcodeRow[]>;
  findPrimaryBarcodesByItemIds(itemIds: string[], labId: string): Promise<SupplyBarcodeRow[]>;
  findByBarcodeValue(barcodeValue: string): Promise<SupplyBarcodeRow | null>;
  saveBarcode(barcode: SupplyBarcodeRow): Promise<void>;
  updateBarcode(
    id: string,
    itemId: string,
    fields: { label?: string | null; isPrimary?: boolean }
  ): Promise<SupplyBarcodeRow | null>;
  deleteBarcode(id: string, itemId: string): Promise<boolean>;

  // Stock

  findStockByItemId(itemId: string): Promise<SupplyStockRow[]>;

  // Transactions — recordTransaction is atomic: UPSERT stock RETURNING → INSERT transaction

  findTransactionsByItemId(itemId: string, limit?: number): Promise<SupplyTransactionRow[]>;
  findTransactionById(id: string, labId: string): Promise<SupplyTransactionRow | null>;
  recordTransaction(data: RecordTransactionData): Promise<SupplyTransactionRow>;
  voidTransaction(
    data: VoidTransactionData
  ): Promise<{ original: SupplyTransactionRow; reversal: SupplyTransactionRow }>;

  // Reorder

  findItemsAtOrBelowThreshold(labId: string): Promise<ItemWithStock[]>;

  // Lookup support — for supply lookup category rename/delete cascading

  countItemsUsingVendor(value: string, labId: string): Promise<number>;
  renameVendor(oldValue: string, newValue: string, labId: string): Promise<number>;
  countItemsUsingManufacturer(value: string, labId: string): Promise<number>;
  renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number>;

  // Attribute values

  findAttributeValuesByItemId(itemId: string): Promise<AttributeValueRow[]>;
  findAttributeValuesByLabId(labId: string): Promise<AttributeValueRow[]>;
  replaceAttributeValues(
    itemId: string,
    definitionId: string,
    values: AttributeValueRow[]
  ): Promise<void>;

  // Packaging levels

  findPackagingLevelsByItemId(itemId: string): Promise<SupplyPackagingLevelRow[]>;
  savePackagingLevel(level: SupplyPackagingLevelRow): Promise<void>;
  deletePackagingLevel(id: string): Promise<boolean>;
}
