/**
 * Reagent Inventory Schemas
 *
 * Validation and types for reagent categories, items, locations, lots,
 * barcodes, transactions, documents, packaging, and lab-configurable attributes.
 */

import { z } from 'zod';

import { attributeSummarySchema, attributeValueSchema } from '../attributes';
import { barcodeTypeSchema } from '../barcodes';
import { documentTypeSchema } from '../documents';
import {
  concentrationPreprocessor,
  concentrationPreprocessorNullable,
  concentrationUnitRefinement,
} from '../units';
import { dateField, optionalDateField, optionalDateOnlyField } from '../utils/dateFields';
import { optionalText, patchText } from '../utils/stringFields';

// Enums

export const reagentItemStatusValues = ['active', 'discontinued', 'archived'] as const;
export const reagentItemStatusSchema = z.enum(reagentItemStatusValues);

const reagentTransactionTypeValues = [
  'received',
  'issued',
  'count_adjustment',
  'disposed',
  'void_reversal',
] as const;
export const reagentTransactionTypeSchema = z.enum(reagentTransactionTypeValues);

// Stored lot status; `expired` is derived at read time from the expiration date.
const reagentLotStatusValues = ['active', 'depleted', 'disposed'] as const;
export const reagentLotStatusSchema = z.enum(reagentLotStatusValues);

// Category schemas

export const reagentCategorySchema = z.object({
  id: z.string(),
  labId: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createReagentCategoryRequestSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(200),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateReagentCategoryRequestSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  parentId: z.string().nullish(),
  sortOrder: z.number().int().nullish(),
});

export const reagentCategoryResponseSchema = z.object({
  category: reagentCategorySchema,
});

export const reagentCategoryListResponseSchema = z.object({
  categories: z.array(reagentCategorySchema),
});

// Item schemas

export const reagentItemSchema = z.object({
  id: z.string(),
  labId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  manufacturer: z.string().optional(),
  catalogNumber: z.string().optional(),
  vendorName: z.string().optional(),
  vendorCatalogNumber: z.string().optional(),
  stockUnit: z.string().optional(),
  reagentType: z.string().optional(),
  casNumber: z.string().optional(),
  concentration: z.number().optional(),
  concentrationUnit: z.string().optional(),
  expiryWarningDays: z.number().int().optional(),
  reorderThreshold: z.number().optional(),
  reorderThresholdUnit: z.string().optional(),
  reorderQuantity: z.number().optional(),
  reorderUnit: z.string().optional(),
  unitPrice: z.number().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: reagentItemStatusSchema,
  isSeeded: z.boolean(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const reagentItemWithStockSchema = reagentItemSchema.extend({
  totalStock: z.number(),
  lotCount: z.number().int(),
  expiredLotCount: z.number().int(),
  locationNames: z.array(z.string()),
  soonestExpiration: optionalDateOnlyField,
  attributeValues: z.array(attributeSummarySchema),
});

export const createReagentItemRequestSchema = concentrationUnitRefinement(
  z.object({
    categoryId: z.string().min(1, 'Category is required'),
    name: z.string().min(1, 'Item name is required').max(200),
    manufacturer: optionalText(200),
    catalogNumber: optionalText(200),
    vendorName: optionalText(200),
    vendorCatalogNumber: optionalText(200),
    stockUnit: optionalText(100),
    reagentType: optionalText(200),
    casNumber: optionalText(200),
    concentration: concentrationPreprocessor,
    concentrationUnit: optionalText(100),
    expiryWarningDays: z.number().int().min(0).optional(),
    reorderThreshold: z.number().min(0).optional(),
    reorderThresholdUnit: optionalText(100),
    reorderQuantity: z.number().min(0).optional(),
    reorderUnit: optionalText(100),
    unitPrice: z.number().min(0).optional(),
    description: optionalText(2000),
    notes: optionalText(5000),
  })
);

export const updateReagentItemRequestSchema = concentrationUnitRefinement(
  z.object({
    categoryId: z.string().min(1).nullish(),
    name: z.string().min(1).max(200).nullish(),
    manufacturer: patchText(200),
    catalogNumber: patchText(200),
    vendorName: patchText(200),
    vendorCatalogNumber: patchText(200),
    stockUnit: patchText(100),
    reagentType: patchText(200),
    casNumber: patchText(200),
    concentration: concentrationPreprocessorNullable,
    concentrationUnit: patchText(100),
    expiryWarningDays: z.number().int().min(0).nullish(),
    reorderThreshold: z.number().min(0).nullish(),
    reorderThresholdUnit: patchText(100),
    reorderQuantity: z.number().min(0).nullish(),
    reorderUnit: patchText(100),
    unitPrice: z.number().min(0).nullish(),
    description: patchText(2000),
    notes: patchText(5000),
  })
);

export const reagentItemResponseSchema = z.object({
  item: reagentItemSchema,
});

export const reagentItemListResponseSchema = z.object({
  items: z.array(reagentItemWithStockSchema),
});

// Lot schemas — the stock unit of a reagent (quantity, expiry, location).

export const reagentLotSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  locationId: z.string(),
  lotNumber: z.string().optional(),
  quantity: z.number(),
  expirationDate: optionalDateOnlyField,
  openedDate: optionalDateOnlyField,
  receivedDate: optionalDateOnlyField,
  concentration: z.number().optional(),
  concentrationUnit: z.string().optional(),
  status: reagentLotStatusSchema,
  createdAt: dateField,
  updatedAt: dateField,
});

// Date corrections only: a lot leaves stock through a disposal transaction, so the
// ledger records it — status is never patched directly.
export const updateReagentLotRequestSchema = z.object({
  openedDate: patchText(),
  expirationDate: patchText(),
});

export const reagentLotResponseSchema = z.object({
  lot: reagentLotSchema,
});

// Barcode schemas — item-level (product) or lot-level (physical bottle) via lotId.

export const reagentBarcodeSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  lotId: z.string().nullable(),
  barcodeValue: z.string(),
  barcodeType: barcodeTypeSchema,
  isPrimary: z.boolean(),
  label: z.string().optional(),
});

export const createReagentBarcodeRequestSchema = z.object({
  barcodeValue: z.string().min(1, 'Barcode value is required').max(500),
  barcodeType: barcodeTypeSchema,
  lotId: optionalText(50),
  isPrimary: z.boolean().optional(),
  label: optionalText(200),
});

export const updateReagentBarcodeRequestSchema = z.object({
  label: patchText(200),
  isPrimary: z.boolean().optional(),
});

export const reagentBarcodeResponseSchema = z.object({
  barcode: reagentBarcodeSchema,
});

// Transaction schemas — append-only ledger; each row references the lot it moved.

export const reagentTransactionSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  lotId: z.string().nullable(),
  locationId: z.string(),
  labId: z.string(),
  type: reagentTransactionTypeSchema,
  quantityChange: z.number(),
  quantityAfter: z.number(),
  poNumber: z.string().optional(),
  cost: z.number().optional(),
  performedBy: z.string(),
  notes: z.string().optional(),
  createdAt: dateField,
  voidedAt: optionalDateField,
  voidedBy: z.string().optional(),
  voidReason: z.string().optional(),
  relatedTransactionId: z.string().optional(),
  isSeeded: z.boolean(),
});

export const recordReagentTransactionRequestSchema = concentrationUnitRefinement(
  z.object({
    itemId: z.string().min(1, 'Item is required'),
    locationId: z.string().min(1, 'Location is required'),
    type: z.enum(['received', 'issued', 'disposed']),
    quantity: z.number().positive('Quantity must be greater than 0'),
    // received: creates or increments a lot
    lotNumber: optionalText(200),
    expirationDate: z.string().optional(),
    openedDate: z.string().optional(),
    receivedDate: z.string().optional(),
    concentration: concentrationPreprocessor,
    concentrationUnit: optionalText(100),
    // issued/disposed: target a specific lot, else FEFO across lots
    lotId: optionalText(50),
    // acknowledge drawing from an expired lot (single issue only)
    includeExpired: z.boolean().optional(),
    poNumber: optionalText(200),
    cost: z.number().min(0).optional(),
    notes: optionalText(2000),
  })
);

// A count reconciles an existing lot, so `lotId` identifies it — new stock arrives
// through a receive, not a count.
export const recordReagentStockCountRequestSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  locationId: z.string().min(1, 'Location is required'),
  lotId: z.string().min(1, 'Lot is required'),
  actualCount: z.number().min(0, 'Count must be non-negative'),
  notes: optionalText(2000),
});

export const voidReagentTransactionRequestSchema = z.object({
  reason: z.string().min(1, 'Void reason is required').max(2000),
});

export const reagentBulkVoidRequestSchema = z.object({
  transactionIds: z
    .array(z.string().min(1))
    .min(1, 'At least one transaction is required')
    .max(100),
  reason: z.string().min(1, 'Void reason is required').max(2000),
});

export const reagentVoidTransactionResponseSchema = z.object({
  original: reagentTransactionSchema,
  reversal: reagentTransactionSchema,
});

export const reagentTransactionListResponseSchema = z.object({
  transactions: z.array(reagentTransactionSchema),
});

// Document schemas — shared Document shape plus the optional docType classification.

export const reagentDocumentSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  label: z.string(),
  url: z.string(),
  notes: z.string().optional(),
  docType: documentTypeSchema.optional(),
  createdAt: dateField,
});

export const createReagentDocumentRequestSchema = z.object({
  label: z.string().min(1, 'Document label is required').max(200),
  url: z.string().min(1, 'Document URL is required').max(2000),
  notes: optionalText(500),
  docType: documentTypeSchema.optional(),
});

export const updateReagentDocumentRequestSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  url: z.string().min(1).max(2000).optional(),
  notes: patchText(500),
  docType: documentTypeSchema.nullish(),
});

export const reagentDocumentResponseSchema = z.object({
  document: reagentDocumentSchema,
});

// Packaging level schemas — per-item hierarchical unit chain.

export const reagentPackagingLevelSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  unitName: z.string(),
  quantity: z.number(),
  parentUnit: z.string().nullable(),
});

export const createReagentPackagingLevelRequestSchema = z.object({
  unitName: z.string().min(1, 'Unit name is required').max(100),
  quantity: z.number().positive('Quantity must be greater than 0'),
  parentUnit: z.string().nullable(),
});

export const reagentPackagingLevelResponseSchema = z.object({
  packagingLevel: reagentPackagingLevelSchema,
});

// Composed detail response

export const reagentItemDetailResponseSchema = z.object({
  item: reagentItemSchema,
  lots: z.array(reagentLotSchema),
  documents: z.array(reagentDocumentSchema),
  barcodes: z.array(reagentBarcodeSchema),
  packagingLevels: z.array(reagentPackagingLevelSchema),
  attributeValues: z.array(attributeValueSchema),
});

// Bulk operation schemas

const itemIdsField = z.array(z.string().min(1)).min(1, 'At least one item is required').max(100);

export const reagentBulkReceiveRequestSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        locationId: z.string().min(1),
        quantity: z.number().positive('Quantity must be greater than 0'),
        lotNumber: optionalText(200),
        expirationDate: z.string().optional(),
        receivedDate: z.string().optional(),
        poNumber: optionalText(200),
        cost: z.number().min(0).optional(),
      })
    )
    .min(1, 'At least one item is required')
    .max(100),
});

export const reagentBulkIssueRequestSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        locationId: z.string().min(1),
        quantity: z.number().positive('Quantity must be greater than 0'),
      })
    )
    .min(1, 'At least one item is required')
    .max(100),
});

export const reagentBulkReassignCategoryRequestSchema = z.object({
  itemIds: itemIdsField,
  categoryId: z.string().min(1, 'Target category is required'),
});

export const reagentBulkArchiveRequestSchema = z.object({
  itemIds: itemIdsField,
});

export const reagentBulkResponseSchema = z.object({
  succeeded: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), error: z.string() })),
});

export const reagentBulkBarcodesRequestSchema = z.object({
  itemIds: itemIdsField,
});

export const reagentBulkBarcodesResponseSchema = z.object({
  barcodes: z.array(
    z.object({
      itemId: z.string(),
      barcodeValue: z.string().nullable(),
    })
  ),
});

// One entry per lot still holding stock — a bottle label, not a product label.
export const reagentBulkLotLabelsResponseSchema = z.object({
  lotLabels: z.array(
    z.object({
      itemId: z.string(),
      lotId: z.string(),
      lotNumber: z.string().optional(),
      expirationDate: optionalDateOnlyField,
      locationId: z.string(),
      barcodeValue: z.string(),
    })
  ),
});

// Type exports

export type ReagentItemStatus = z.infer<typeof reagentItemStatusSchema>;
export type ReagentTransactionType = z.infer<typeof reagentTransactionTypeSchema>;
export type ReagentLotStatus = z.infer<typeof reagentLotStatusSchema>;
export type ReagentCategory = z.infer<typeof reagentCategorySchema>;
export type ReagentItem = z.infer<typeof reagentItemSchema>;
export type ReagentItemWithStock = z.infer<typeof reagentItemWithStockSchema>;
export type ReagentLot = z.infer<typeof reagentLotSchema>;
export type ReagentBarcode = z.infer<typeof reagentBarcodeSchema>;
export type ReagentTransaction = z.infer<typeof reagentTransactionSchema>;
export type ReagentVoidTransactionResponse = z.infer<typeof reagentVoidTransactionResponseSchema>;
export type ReagentDocument = z.infer<typeof reagentDocumentSchema>;
export type ReagentPackagingLevel = z.infer<typeof reagentPackagingLevelSchema>;
export type ReagentItemDetail = z.infer<typeof reagentItemDetailResponseSchema>;
export type CreateReagentCategoryRequest = z.infer<typeof createReagentCategoryRequestSchema>;
export type UpdateReagentCategoryRequest = z.infer<typeof updateReagentCategoryRequestSchema>;
export type CreateReagentItemRequest = z.infer<typeof createReagentItemRequestSchema>;
export type UpdateReagentItemRequest = z.infer<typeof updateReagentItemRequestSchema>;
export type UpdateReagentLotRequest = z.infer<typeof updateReagentLotRequestSchema>;
export type CreateReagentBarcodeRequest = z.infer<typeof createReagentBarcodeRequestSchema>;
export type UpdateReagentBarcodeRequest = z.infer<typeof updateReagentBarcodeRequestSchema>;
export type RecordReagentTransactionRequest = z.infer<typeof recordReagentTransactionRequestSchema>;
export type RecordReagentStockCountRequest = z.infer<typeof recordReagentStockCountRequestSchema>;
export type VoidReagentTransactionRequest = z.infer<typeof voidReagentTransactionRequestSchema>;
export type ReagentBulkVoidRequest = z.infer<typeof reagentBulkVoidRequestSchema>;
export type CreateReagentDocumentRequest = z.infer<typeof createReagentDocumentRequestSchema>;
export type UpdateReagentDocumentRequest = z.infer<typeof updateReagentDocumentRequestSchema>;
export type CreateReagentPackagingLevelRequest = z.infer<
  typeof createReagentPackagingLevelRequestSchema
>;
export type ReagentBulkReceiveRequest = z.infer<typeof reagentBulkReceiveRequestSchema>;
export type ReagentBulkIssueRequest = z.infer<typeof reagentBulkIssueRequestSchema>;
export type ReagentBulkResponse = z.infer<typeof reagentBulkResponseSchema>;
export type ReagentBulkBarcodesResponse = z.infer<typeof reagentBulkBarcodesResponseSchema>;
export type ReagentBulkLotLabelsResponse = z.infer<typeof reagentBulkLotLabelsResponseSchema>;
