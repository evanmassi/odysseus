import type { DocumentPatch } from '@domain/entities/Document';
import type { ReagentDocument } from '@domain/entities/ReagentDocument';
import type { ReagentItem } from '@domain/entities/ReagentItem';
import type { AttributeValueRow } from '@domain/repositories/AttributeRepository';

export interface ReagentLotRow {
  id: string;
  itemId: string;
  locationId: string;
  lotNumber?: string;
  quantity: number;
  expirationDate?: string;
  openedDate?: string;
  receivedDate?: string;
  concentration?: number;
  concentrationUnit?: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ReagentBarcodeRow {
  id: string;
  itemId: string;
  lotId?: string;
  barcodeValue: string;
  barcodeType: string;
  isPrimary: boolean;
  label?: string;
}

export interface ReagentLotLabelRow {
  itemId: string;
  lotId: string;
  lotNumber?: string;
  expirationDate?: string;
  locationId: string;
  barcodeValue: string;
}

export interface ReagentTransactionRow {
  id: string;
  itemId: string;
  lotId?: string;
  locationId: string;
  labId: string;
  type: string;
  quantityChange: number;
  quantityAfter: number;
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

export interface ReagentPackagingLevelRow {
  id: string;
  itemId: string;
  unitName: string;
  quantity: number;
  parentUnit: string | undefined;
}

export interface VoidTransactionData {
  transactionId: string;
  labId: string;
  voidedBy: string;
  voidReason: string;
}

export interface LotExpiration {
  id: string;
  locationId: string;
  lotNumber?: string;
  quantity: number;
  expirationDate: string;
}

export interface ItemWithStock {
  item: ReagentItem;
  totalStock: number;
  lotCount: number;
  locationNames: string[];
  lotExpirations: LotExpiration[];
}

// PITFALL: received uses quantity + lot metadata; issued/disposed use quantity (+ optional lotId / includeExpired); count_adjustment uses actualCount + lotId.
export interface RecordTransactionData {
  itemId: string;
  locationId: string;
  labId: string;
  type: 'received' | 'issued' | 'disposed' | 'count_adjustment';
  performedBy: string;
  quantity?: number;
  actualCount?: number;
  lotId?: string;
  lotNumber?: string;
  expirationDate?: string;
  openedDate?: string;
  receivedDate?: string;
  concentration?: number;
  concentrationUnit?: string;
  includeExpired?: boolean;
  poNumber?: string;
  cost?: number;
  notes?: string;
}

export interface ReagentItemRepository {
  findById(id: string, labId: string): Promise<ReagentItem | null>;
  findByLabIdWithStock(labId: string): Promise<ItemWithStock[]>;
  save(item: ReagentItem): Promise<void>;
  delete(id: string, labId: string): Promise<boolean>;
  hasTransactions(id: string): Promise<boolean>;
  // PITFALL: visitor-created rows only; seeded rows must not consume the demo creation caps.
  countNonSeededByLabId(labId: string): Promise<number>;
  deleteAllForLab(labId: string): Promise<number>;

  findDocumentsByItemId(itemId: string): Promise<ReagentDocument[]>;
  saveDocument(document: ReagentDocument): Promise<void>;
  updateDocument(
    id: string,
    itemId: string,
    fields: DocumentPatch
  ): Promise<ReagentDocument | null>;
  deleteDocument(id: string, itemId: string): Promise<boolean>;

  findBarcodesByItemId(itemId: string): Promise<ReagentBarcodeRow[]>;
  findPrimaryBarcodesByItemIds(itemIds: string[], labId: string): Promise<ReagentBarcodeRow[]>;
  findLotLabelsByItemIds(itemIds: string[], labId: string): Promise<ReagentLotLabelRow[]>;
  findByBarcodeValue(barcodeValue: string): Promise<ReagentBarcodeRow | null>;
  saveBarcode(barcode: ReagentBarcodeRow): Promise<void>;
  updateBarcode(
    id: string,
    itemId: string,
    fields: { label?: string | null; isPrimary?: boolean }
  ): Promise<ReagentBarcodeRow | null>;
  deleteBarcode(id: string, itemId: string): Promise<boolean>;

  findLotsByItemId(itemId: string): Promise<ReagentLotRow[]>;
  updateLot(
    id: string,
    itemId: string,
    fields: { openedDate?: string | null; expirationDate?: string | null }
  ): Promise<ReagentLotRow | null>;

  // PITFALL: recordTransaction is atomic and a FEFO issue returns one transaction row per lot moved.

  findTransactionsByItemId(itemId: string): Promise<ReagentTransactionRow[]>;
  findTransactionById(id: string, labId: string): Promise<ReagentTransactionRow | null>;
  recordTransaction(data: RecordTransactionData): Promise<ReagentTransactionRow[]>;
  voidTransaction(
    data: VoidTransactionData
  ): Promise<{ original: ReagentTransactionRow; reversal: ReagentTransactionRow }>;

  findAttributeValuesByItemId(itemId: string): Promise<AttributeValueRow[]>;
  findAttributeValuesByLabId(labId: string): Promise<AttributeValueRow[]>;
  replaceAttributeValues(
    itemId: string,
    definitionId: string,
    values: AttributeValueRow[]
  ): Promise<void>;

  countItemsUsingReagentType(value: string, labId: string): Promise<number>;
  renameReagentType(oldValue: string, newValue: string, labId: string): Promise<number>;
  countItemsUsingVendor(value: string, labId: string): Promise<number>;
  renameVendor(oldValue: string, newValue: string, labId: string): Promise<number>;
  countItemsUsingManufacturer(value: string, labId: string): Promise<number>;
  renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number>;

  findPackagingLevelsByItemId(itemId: string): Promise<ReagentPackagingLevelRow[]>;
  savePackagingLevel(level: ReagentPackagingLevelRow): Promise<void>;
  deletePackagingLevel(id: string): Promise<boolean>;
}
