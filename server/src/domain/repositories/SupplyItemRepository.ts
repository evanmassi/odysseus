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
  isSeeded: boolean;
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
  occurredAt?: Date;
}

export interface SupplyPackagingLevelRow {
  id: string;
  itemId: string;
  unitName: string;
  quantity: number;
  parentUnit: string | undefined;
}

export interface SupplyItemRepository {
  findById(id: string, labId: string): Promise<SupplyItem | null>;
  findByLabIdWithStock(labId: string): Promise<ItemWithStock[]>;
  save(item: SupplyItem): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;
  hasTransactions(id: string): Promise<boolean>;
  countNonSeededByLabId(labId: string): Promise<number>;
  deleteAllForLab(labId: string): Promise<number>;

  findDocumentsByItemId(itemId: string): Promise<SupplyDocument[]>;
  saveDocument(document: SupplyDocument): Promise<void>;
  updateDocument(id: string, itemId: string, fields: DocumentPatch): Promise<SupplyDocument | null>;
  deleteDocument(id: string, itemId: string): Promise<boolean>;

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

  findStockByItemId(itemId: string): Promise<SupplyStockRow[]>;

  findTransactionsByItemId(itemId: string, limit?: number): Promise<SupplyTransactionRow[]>;
  findTransactionById(id: string, labId: string): Promise<SupplyTransactionRow | null>;
  recordTransaction(data: RecordTransactionData): Promise<SupplyTransactionRow>;
  voidTransaction(
    data: VoidTransactionData
  ): Promise<{ original: SupplyTransactionRow; reversal: SupplyTransactionRow }>;

  findItemsAtOrBelowThreshold(labId: string): Promise<ItemWithStock[]>;

  countItemsUsingVendor(value: string, labId: string): Promise<number>;
  renameVendor(oldValue: string, newValue: string, labId: string): Promise<number>;
  countItemsUsingManufacturer(value: string, labId: string): Promise<number>;
  renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number>;

  findAttributeValuesByItemId(itemId: string): Promise<AttributeValueRow[]>;
  findAttributeValuesByLabId(labId: string): Promise<AttributeValueRow[]>;
  replaceAttributeValues(
    itemId: string,
    definitionId: string,
    values: AttributeValueRow[]
  ): Promise<void>;

  findPackagingLevelsByItemId(itemId: string): Promise<SupplyPackagingLevelRow[]>;
  savePackagingLevel(level: SupplyPackagingLevelRow): Promise<void>;
  deletePackagingLevel(id: string): Promise<boolean>;
}
