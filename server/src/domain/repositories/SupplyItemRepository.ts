/**
 * Supply Item Repository Interface
 *
 * Unified data access contract for supply items, documents, barcodes,
 * stock levels, transactions, and lookup value support.
 */

import type { SupplyDocument } from '@domain/entities/SupplyDocument';
import type { SupplyItem } from '@domain/entities/SupplyItem';

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
  findByLabId(labId: string): Promise<SupplyItem[]>;
  findByLabIdWithStock(labId: string): Promise<ItemWithStock[]>;
  findByCategoryId(categoryId: string, labId: string): Promise<SupplyItem[]>;
  save(item: SupplyItem): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;
  hasTransactions(id: string): Promise<boolean>;

  // Documents

  findDocumentsByItemId(itemId: string): Promise<SupplyDocument[]>;
  saveDocument(document: SupplyDocument): Promise<void>;
  updateDocument(id: string, fields: { label?: string; url?: string; notes?: string | null }): Promise<void>;
  deleteDocument(id: string): Promise<boolean>;

  // Barcodes

  findBarcodesByItemId(itemId: string): Promise<SupplyBarcodeRow[]>;
  findByBarcodeValue(barcodeValue: string): Promise<SupplyBarcodeRow | null>;
  saveBarcode(barcode: SupplyBarcodeRow): Promise<void>;
  updateBarcode(id: string, fields: { label?: string | null; isPrimary?: boolean }): Promise<void>;
  deleteBarcode(id: string): Promise<boolean>;

  // Stock

  findStockByItemId(itemId: string): Promise<SupplyStockRow[]>;
  getTotalStock(itemId: string): Promise<number>;

  // Transactions — recordTransaction is atomic: UPSERT stock RETURNING → INSERT transaction

  findTransactionsByItemId(itemId: string, limit?: number): Promise<SupplyTransactionRow[]>;
  findTransactionById(id: string): Promise<SupplyTransactionRow | null>;
  recordTransaction(data: RecordTransactionData): Promise<SupplyTransactionRow>;
  voidTransaction(data: VoidTransactionData): Promise<{ original: SupplyTransactionRow; reversal: SupplyTransactionRow }>;

  // Reorder

  findItemsBelowThreshold(labId: string): Promise<ItemWithStock[]>;

  // Lookup support — for supply lookup category rename/delete cascading

  countItemsUsingProperty(value: string, labId: string): Promise<number>;
  renameProperty(oldValue: string, newValue: string, labId: string): Promise<number>;
  countItemsUsingVendor(value: string, labId: string): Promise<number>;
  renameVendor(oldValue: string, newValue: string, labId: string): Promise<number>;
  countItemsUsingManufacturer(value: string, labId: string): Promise<number>;
  renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number>;
  countItemsUsingStockUnit(value: string, labId: string): Promise<number>;
  renameStockUnit(oldValue: string, newValue: string, labId: string): Promise<number>;

  // Packaging levels

  findPackagingLevelsByItemId(itemId: string): Promise<SupplyPackagingLevelRow[]>;
  savePackagingLevel(level: SupplyPackagingLevelRow): Promise<void>;
  updatePackagingLevel(id: string, quantity: number): Promise<void>;
  deletePackagingLevel(id: string): Promise<boolean>;
}
