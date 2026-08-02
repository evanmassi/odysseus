/**
 * Supply Inventory Schemas
 *
 * Validation and types for supply categories, items, locations, stock,
 * barcodes, transactions, and documents.
 */

import { z } from 'zod';
import { barcodeTypeSchema } from '../barcodes';
import { documentTypeSchema } from '../documents';
import { dateField, optionalDateField, optionalDateOnlyField } from '../utils/dateFields';
import { optionalText, patchText } from '../utils/stringFields';

// Enums

export const supplyItemStatusValues = ['active', 'discontinued', 'archived'] as const;
export const supplyItemStatusSchema = z.enum(supplyItemStatusValues);

const supplyTransactionTypeValues = [
  'received',
  'issued',
  'count_adjustment',
  'disposed',
  'void_reversal',
] as const;
export const supplyTransactionTypeSchema = z.enum(supplyTransactionTypeValues);

// Category schemas

export const supplyCategorySchema = z.object({
  id: z.string(),
  labId: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createSupplyCategoryRequestSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(200),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateSupplyCategoryRequestSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  parentId: z.string().nullish(),
  sortOrder: z.number().int().nullish(),
});

export const supplyCategoryResponseSchema = z.object({
  category: supplyCategorySchema,
});

export const supplyCategoryListResponseSchema = z.object({
  categories: z.array(supplyCategorySchema),
});

// Item schemas

// Attribute value summary — compact per-item attribute values for list filtering.

export const supplyAttributeSummarySchema = z.object({
  definitionId: z.string(),
  valueOptionId: z.string().nullable(),
  valueText: z.string().nullable(),
  valueNumber: z.number().nullable(),
});

export const supplyItemSchema = z.object({
  id: z.string(),
  labId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  manufacturer: z.string().optional(),
  catalogNumber: z.string().optional(),
  vendorName: z.string().optional(),
  vendorCatalogNumber: z.string().optional(),
  stockUnit: z.string().optional(),
  baseItemName: z.string().optional(),
  reorderThreshold: z.number().optional(),
  reorderThresholdUnit: z.string().optional(),
  reorderQuantity: z.number().optional(),
  reorderUnit: z.string().optional(),
  unitPrice: z.number().optional(),
  currentLotNumber: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: supplyItemStatusSchema,
  createdAt: dateField,
  updatedAt: dateField,
});

export const supplyItemWithStockSchema = supplyItemSchema.extend({
  totalStock: z.number(),
  locationNames: z.array(z.string()),
  attributeValues: z.array(supplyAttributeSummarySchema),
});

export const createSupplyItemRequestSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Item name is required').max(200),
  manufacturer: optionalText(200),
  catalogNumber: optionalText(200),
  vendorName: optionalText(200),
  vendorCatalogNumber: optionalText(200),
  stockUnit: optionalText(100),
  baseItemName: optionalText(100),
  reorderThreshold: z.number().min(0).optional(),
  reorderThresholdUnit: optionalText(100),
  reorderQuantity: z.number().min(0).optional(),
  reorderUnit: optionalText(100),
  unitPrice: z.number().min(0).optional(),
  description: optionalText(2000),
  notes: optionalText(5000),
});

export const updateSupplyItemRequestSchema = z.object({
  categoryId: z.string().min(1).nullish(),
  name: z.string().min(1).max(200).nullish(),
  manufacturer: patchText(200),
  catalogNumber: patchText(200),
  vendorName: patchText(200),
  vendorCatalogNumber: patchText(200),
  stockUnit: patchText(100),
  baseItemName: patchText(100),
  reorderThreshold: z.number().min(0).nullish(),
  reorderThresholdUnit: patchText(100),
  reorderQuantity: z.number().min(0).nullish(),
  reorderUnit: patchText(100),
  unitPrice: z.number().min(0).nullish(),
  description: patchText(2000),
  notes: patchText(5000),
});

export const supplyItemResponseSchema = z.object({
  item: supplyItemSchema,
});

export const supplyItemListResponseSchema = z.object({
  items: z.array(supplyItemWithStockSchema),
});

// Stock schemas

export const supplyStockSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  locationId: z.string(),
  quantity: z.number(),
  updatedAt: dateField,
});

// Barcode schemas

export const supplyBarcodeSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  barcodeValue: z.string(),
  barcodeType: barcodeTypeSchema,
  isPrimary: z.boolean(),
  label: z.string().optional(),
});

export const createSupplyBarcodeRequestSchema = z.object({
  barcodeValue: z.string().min(1, 'Barcode value is required').max(500),
  barcodeType: barcodeTypeSchema,
  isPrimary: z.boolean().optional(),
  label: z.string().max(200).optional(),
});

export const updateSupplyBarcodeRequestSchema = z.object({
  label: z.string().max(200).nullish(),
  isPrimary: z.boolean().optional(),
});

export const supplyBarcodeResponseSchema = z.object({
  barcode: supplyBarcodeSchema,
});

// Transaction schemas

export const supplyTransactionSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  locationId: z.string(),
  labId: z.string(),
  type: supplyTransactionTypeSchema,
  quantityChange: z.number(),
  quantityAfter: z.number(),
  lotNumber: z.string().optional(),
  expirationDate: optionalDateOnlyField,
  poNumber: z.string().optional(),
  cost: z.number().optional(),
  performedBy: z.string(),
  notes: z.string().optional(),
  createdAt: dateField,
  voidedAt: optionalDateField,
  voidedBy: z.string().optional(),
  voidReason: z.string().optional(),
  relatedTransactionId: z.string().optional(),
});

export const recordSupplyTransactionRequestSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  locationId: z.string().min(1, 'Location is required'),
  type: z.enum(['received', 'issued', 'disposed']),
  quantity: z.number().positive('Quantity must be greater than 0'),
  lotNumber: z.string().max(200).optional(),
  expirationDate: z.string().optional(),
  poNumber: z.string().max(200).optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  receivingUnit: z.string().optional(),
});

export const recordSupplyStockCountRequestSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  locationId: z.string().min(1, 'Location is required'),
  actualCount: z.number().min(0, 'Count must be non-negative'),
  lotNumber: z.string().max(200).optional(),
  expirationDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const voidSupplyTransactionRequestSchema = z.object({
  reason: z.string().min(1, 'Void reason is required').max(2000),
});

export const supplyBulkVoidRequestSchema = z.object({
  transactionIds: z
    .array(z.string().min(1))
    .min(1, 'At least one transaction is required')
    .max(100),
  reason: z.string().min(1, 'Void reason is required').max(2000),
});

export const supplyTransactionResponseSchema = z.object({
  transaction: supplyTransactionSchema,
});

export const supplyVoidTransactionResponseSchema = z.object({
  original: supplyTransactionSchema,
  reversal: supplyTransactionSchema,
});

export const supplyTransactionListResponseSchema = z.object({
  transactions: z.array(supplyTransactionSchema),
});

// Document schemas

export const supplyDocumentSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  label: z.string(),
  url: z.string(),
  notes: z.string().optional(),
  docType: documentTypeSchema.optional(),
  createdAt: dateField,
});

export const createSupplyDocumentRequestSchema = z.object({
  label: z.string().min(1, 'Document label is required').max(200),
  url: z.string().min(1, 'Document URL is required').max(2000),
  notes: z.string().max(500).optional(),
  docType: documentTypeSchema.optional(),
});

export const updateSupplyDocumentRequestSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  url: z.string().min(1).max(2000).optional(),
  notes: z.string().max(500).nullish(),
  docType: documentTypeSchema.nullish(),
});

export const supplyDocumentResponseSchema = z.object({
  document: supplyDocumentSchema,
});

// Packaging level schemas

export const supplyPackagingLevelSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  unitName: z.string(),
  quantity: z.number(),
  parentUnit: z.string().nullable(),
});

export const createSupplyPackagingLevelRequestSchema = z.object({
  unitName: z.string().min(1, 'Unit name is required').max(100),
  quantity: z.number().positive('Quantity must be greater than 0'),
  parentUnit: z.string().nullable(),
});

export const supplyPackagingLevelResponseSchema = z.object({
  packagingLevel: supplyPackagingLevelSchema,
});

// Attribute values — per-item, keyed to the lab-wide definitions in `../attributes`.

export const supplyAttributeValueSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  definitionId: z.string(),
  valueOptionId: z.string().nullable(),
  valueText: z.string().nullable(),
  valueNumber: z.number().nullable(),
});

// The write replaces a definition's values wholesale, so the response is that definition's
// rows after the fact — the caller sends one request per attribute it changed.
export const supplyAttributeValueListResponseSchema = z.object({
  attributeValues: z.array(supplyAttributeValueSchema),
});

export const setSupplyAttributeValueRequestSchema = z.object({
  definitionId: z.string().min(1, 'Attribute is required'),
  valueOptionIds: z.array(z.string().min(1)).optional(),
  valueText: optionalText(2000),
  valueNumber: z.number().optional(),
});

// Composed detail response

export const supplyItemDetailResponseSchema = z.object({
  item: supplyItemSchema,
  documents: z.array(supplyDocumentSchema),
  barcodes: z.array(supplyBarcodeSchema),
  stock: z.array(supplyStockSchema),
  recentTransactions: z.array(supplyTransactionSchema),
  packagingLevels: z.array(supplyPackagingLevelSchema),
  attributeValues: z.array(supplyAttributeValueSchema),
});

// Bulk operation schemas

const itemIdsField = z.array(z.string().min(1)).min(1, 'At least one item is required').max(100);

export const supplyBulkReceiveRequestSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        locationId: z.string().min(1),
        quantity: z.number().min(0),
        lotNumber: z.string().max(200).optional(),
        expirationDate: z.string().optional(),
        poNumber: z.string().max(200).optional(),
        cost: z.number().min(0).optional(),
        receivingUnit: z.string().optional(),
      })
    )
    .min(1, 'At least one item is required')
    .max(100),
});

export const supplyBulkIssueRequestSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        locationId: z.string().min(1),
        quantity: z.number().min(0),
      })
    )
    .min(1, 'At least one item is required')
    .max(100),
});

export const supplyBulkReassignCategoryRequestSchema = z.object({
  itemIds: itemIdsField,
  categoryId: z.string().min(1, 'Target category is required'),
});

export const supplyBulkArchiveRequestSchema = z.object({
  itemIds: itemIdsField,
});

export const supplyBulkResponseSchema = z.object({
  succeeded: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), error: z.string() })),
});

export const supplyBulkBarcodesRequestSchema = z.object({
  itemIds: itemIdsField,
});

export const supplyBulkBarcodesResponseSchema = z.object({
  barcodes: z.array(
    z.object({
      itemId: z.string(),
      barcodeValue: z.string().nullable(),
    })
  ),
});

// Type exports

export type SupplyItemStatus = z.infer<typeof supplyItemStatusSchema>;
export type SupplyTransactionType = z.infer<typeof supplyTransactionTypeSchema>;
export type SupplyCategory = z.infer<typeof supplyCategorySchema>;
export type SupplyItem = z.infer<typeof supplyItemSchema>;
export type SupplyItemWithStock = z.infer<typeof supplyItemWithStockSchema>;
export type SupplyBarcode = z.infer<typeof supplyBarcodeSchema>;
export type SupplyTransaction = z.infer<typeof supplyTransactionSchema>;
export type SupplyVoidTransactionResponse = z.infer<typeof supplyVoidTransactionResponseSchema>;
export type SupplyDocument = z.infer<typeof supplyDocumentSchema>;
export type SupplyItemDetail = z.infer<typeof supplyItemDetailResponseSchema>;
export type SupplyAttributeSummary = z.infer<typeof supplyAttributeSummarySchema>;
export type SupplyAttributeValue = z.infer<typeof supplyAttributeValueSchema>;
export type SetSupplyAttributeValueRequest = z.infer<typeof setSupplyAttributeValueRequestSchema>;
export type CreateSupplyCategoryRequest = z.infer<typeof createSupplyCategoryRequestSchema>;
export type UpdateSupplyCategoryRequest = z.infer<typeof updateSupplyCategoryRequestSchema>;
export type CreateSupplyItemRequest = z.infer<typeof createSupplyItemRequestSchema>;
export type UpdateSupplyItemRequest = z.infer<typeof updateSupplyItemRequestSchema>;
export type CreateSupplyBarcodeRequest = z.infer<typeof createSupplyBarcodeRequestSchema>;
export type UpdateSupplyBarcodeRequest = z.infer<typeof updateSupplyBarcodeRequestSchema>;
export type RecordSupplyTransactionRequest = z.infer<typeof recordSupplyTransactionRequestSchema>;
export type RecordSupplyStockCountRequest = z.infer<typeof recordSupplyStockCountRequestSchema>;
export type VoidSupplyTransactionRequest = z.infer<typeof voidSupplyTransactionRequestSchema>;
export type SupplyBulkVoidRequest = z.infer<typeof supplyBulkVoidRequestSchema>;
export type CreateSupplyDocumentRequest = z.infer<typeof createSupplyDocumentRequestSchema>;
export type UpdateSupplyDocumentRequest = z.infer<typeof updateSupplyDocumentRequestSchema>;
export type SupplyBulkReceiveRequest = z.infer<typeof supplyBulkReceiveRequestSchema>;
export type SupplyBulkIssueRequest = z.infer<typeof supplyBulkIssueRequestSchema>;
export type SupplyBulkResponse = z.infer<typeof supplyBulkResponseSchema>;
export type SupplyBulkBarcodesResponse = z.infer<typeof supplyBulkBarcodesResponseSchema>;
export type SupplyPackagingLevel = z.infer<typeof supplyPackagingLevelSchema>;
export type CreateSupplyPackagingLevelRequest = z.infer<
  typeof createSupplyPackagingLevelRequestSchema
>;
