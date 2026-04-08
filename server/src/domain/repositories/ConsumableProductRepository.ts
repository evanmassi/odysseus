/**
 * Consumable Product Repository Interface
 *
 * Unified data access contract for consumable products, documents, barcodes,
 * stock levels, transactions, and lookup value support.
 */

import type { ConsumableDocument } from '@domain/entities/ConsumableDocument';
import type { ConsumableProduct } from '@domain/entities/ConsumableProduct';

export interface ConsumableStockRow {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  updatedAt: Date | string;
}

export interface ConsumableBarcodeRow {
  id: string;
  productId: string;
  barcodeValue: string;
  barcodeType: string;
  isPrimary: boolean;
  label?: string;
}

export interface ConsumableTransactionRow {
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
  createdAt: Date | string;
}

export interface ProductWithStock {
  product: ConsumableProduct;
  totalStock: number;
}

export interface RecordTransactionData {
  productId: string;
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

export interface ConsumablePackagingLevelRow {
  id: string;
  productId: string;
  unitName: string;
  quantity: number;
  parentUnit: string | undefined;
}

export interface ConsumableProductRepository {

  // Products

  findById(id: string, labId: string): Promise<ConsumableProduct | null>;
  findByLabId(labId: string): Promise<ConsumableProduct[]>;
  findByLabIdWithStock(labId: string): Promise<ProductWithStock[]>;
  findByCategoryId(categoryId: string, labId: string): Promise<ConsumableProduct[]>;
  save(product: ConsumableProduct): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;
  hasTransactions(id: string): Promise<boolean>;

  // Documents

  findDocumentsByProductId(productId: string): Promise<ConsumableDocument[]>;
  saveDocument(document: ConsumableDocument): Promise<void>;
  deleteDocument(id: string): Promise<boolean>;

  // Barcodes

  findBarcodesByProductId(productId: string): Promise<ConsumableBarcodeRow[]>;
  findByBarcodeValue(barcodeValue: string): Promise<ConsumableBarcodeRow | null>;
  saveBarcode(barcode: ConsumableBarcodeRow): Promise<void>;
  deleteBarcode(id: string): Promise<boolean>;

  // Stock

  findStockByProductId(productId: string): Promise<ConsumableStockRow[]>;
  getTotalStock(productId: string): Promise<number>;

  // Transactions — recordTransaction is atomic: UPSERT stock RETURNING → INSERT transaction

  findTransactionsByProductId(productId: string, limit?: number): Promise<ConsumableTransactionRow[]>;
  recordTransaction(data: RecordTransactionData): Promise<ConsumableTransactionRow>;

  // Reorder

  findProductsBelowThreshold(labId: string): Promise<ProductWithStock[]>;

  // Lookup support — for consumable lookup category rename/delete cascading

  countProductsUsingProperty(value: string, labId: string): Promise<number>;
  renameProperty(oldValue: string, newValue: string, labId: string): Promise<number>;
  countProductsUsingVendor(value: string, labId: string): Promise<number>;
  renameVendor(oldValue: string, newValue: string, labId: string): Promise<number>;
  countProductsUsingManufacturer(value: string, labId: string): Promise<number>;
  renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number>;
  countProductsUsingStockUnit(value: string, labId: string): Promise<number>;
  renameStockUnit(oldValue: string, newValue: string, labId: string): Promise<number>;

  // Packaging levels

  findPackagingLevelsByProductId(productId: string): Promise<ConsumablePackagingLevelRow[]>;
  savePackagingLevel(level: ConsumablePackagingLevelRow): Promise<void>;
  updatePackagingLevel(id: string, quantity: number): Promise<void>;
  deletePackagingLevel(id: string): Promise<boolean>;
}
