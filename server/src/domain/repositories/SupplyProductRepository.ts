/**
 * Supply Product Repository Interface
 *
 * Unified data access contract for supply products, documents, barcodes,
 * stock levels, transactions, and lookup value support.
 */

import type { SupplyDocument } from '@domain/entities/SupplyDocument';
import type { SupplyProduct } from '@domain/entities/SupplyProduct';

export interface SupplyStockRow {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  updatedAt: Date | string;
}

export interface SupplyBarcodeRow {
  id: string;
  productId: string;
  barcodeValue: string;
  barcodeType: string;
  isPrimary: boolean;
  label?: string;
}

export interface SupplyTransactionRow {
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

export interface ProductWithStock {
  product: SupplyProduct;
  totalStock: number;
  locationNames: string[];
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

export interface SupplyPackagingLevelRow {
  id: string;
  productId: string;
  unitName: string;
  quantity: number;
  parentUnit: string | undefined;
}

export interface SupplyProductRepository {

  // Products

  findById(id: string, labId: string): Promise<SupplyProduct | null>;
  findByLabId(labId: string): Promise<SupplyProduct[]>;
  findByLabIdWithStock(labId: string): Promise<ProductWithStock[]>;
  findByCategoryId(categoryId: string, labId: string): Promise<SupplyProduct[]>;
  save(product: SupplyProduct): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;
  hasTransactions(id: string): Promise<boolean>;

  // Documents

  findDocumentsByProductId(productId: string): Promise<SupplyDocument[]>;
  saveDocument(document: SupplyDocument): Promise<void>;
  updateDocument(id: string, fields: { label?: string; url?: string; notes?: string | null }): Promise<void>;
  deleteDocument(id: string): Promise<boolean>;

  // Barcodes

  findBarcodesByProductId(productId: string): Promise<SupplyBarcodeRow[]>;
  findByBarcodeValue(barcodeValue: string): Promise<SupplyBarcodeRow | null>;
  saveBarcode(barcode: SupplyBarcodeRow): Promise<void>;
  updateBarcode(id: string, fields: { label?: string | null; isPrimary?: boolean }): Promise<void>;
  deleteBarcode(id: string): Promise<boolean>;

  // Stock

  findStockByProductId(productId: string): Promise<SupplyStockRow[]>;
  getTotalStock(productId: string): Promise<number>;

  // Transactions — recordTransaction is atomic: UPSERT stock RETURNING → INSERT transaction

  findTransactionsByProductId(productId: string, limit?: number): Promise<SupplyTransactionRow[]>;
  findTransactionById(id: string): Promise<SupplyTransactionRow | null>;
  recordTransaction(data: RecordTransactionData): Promise<SupplyTransactionRow>;
  voidTransaction(data: VoidTransactionData): Promise<{ original: SupplyTransactionRow; reversal: SupplyTransactionRow }>;

  // Reorder

  findProductsBelowThreshold(labId: string): Promise<ProductWithStock[]>;

  // Lookup support — for supply lookup category rename/delete cascading

  countProductsUsingProperty(value: string, labId: string): Promise<number>;
  renameProperty(oldValue: string, newValue: string, labId: string): Promise<number>;
  countProductsUsingVendor(value: string, labId: string): Promise<number>;
  renameVendor(oldValue: string, newValue: string, labId: string): Promise<number>;
  countProductsUsingManufacturer(value: string, labId: string): Promise<number>;
  renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number>;
  countProductsUsingStockUnit(value: string, labId: string): Promise<number>;
  renameStockUnit(oldValue: string, newValue: string, labId: string): Promise<number>;

  // Packaging levels

  findPackagingLevelsByProductId(productId: string): Promise<SupplyPackagingLevelRow[]>;
  savePackagingLevel(level: SupplyPackagingLevelRow): Promise<void>;
  updatePackagingLevel(id: string, quantity: number): Promise<void>;
  deletePackagingLevel(id: string): Promise<boolean>;
}
