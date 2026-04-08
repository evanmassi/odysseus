/**
 * Consumables Inventory Schemas
 *
 * Validation and types for consumable categories, products, locations, stock,
 * barcodes, transactions, and documents.
 */

import { z } from 'zod';
import { dateField, optionalDateField } from '../utils/dateFields';

// Enums

export const consumableProductStatusValues = ['active', 'discontinued', 'archived'] as const;
export const consumableProductStatusSchema = z.enum(consumableProductStatusValues);

export const consumableTransactionTypeValues = ['received', 'consumed', 'count_adjustment', 'disposed'] as const;
export const consumableTransactionTypeSchema = z.enum(consumableTransactionTypeValues);

export const consumableBarcodeTypeValues = ['internal', 'manufacturer_sku', 'upc'] as const;
export const consumableBarcodeTypeSchema = z.enum(consumableBarcodeTypeValues);

// Category schemas

export const consumableCategorySchema = z.object({
  id: z.string(),
  labId: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createConsumableCategoryRequestSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(200),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateConsumableCategoryRequestSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  parentId: z.string().nullish(),
  sortOrder: z.number().int().nullish(),
});

export const consumableCategoryResponseSchema = z.object({
  category: consumableCategorySchema,
});

export const consumableCategoryListResponseSchema = z.object({
  categories: z.array(consumableCategorySchema),
});

// Location schemas

export const consumableLocationSchema = z.object({
  id: z.string(),
  labId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  sortOrder: z.number().int(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createConsumableLocationRequestSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(200),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateConsumableLocationRequestSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  description: z.string().max(500).nullish(),
  sortOrder: z.number().int().nullish(),
});

export const consumableLocationResponseSchema = z.object({
  location: consumableLocationSchema,
});

export const consumableLocationListResponseSchema = z.object({
  locations: z.array(consumableLocationSchema),
});

// Product schemas

export const consumableProductSchema = z.object({
  id: z.string(),
  labId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  manufacturer: z.string().optional(),
  catalogNumber: z.string().optional(),
  vendorName: z.string().optional(),
  vendorCatalogNumber: z.string().optional(),
  stockUnit: z.string().optional(),
  unitsPerStockUnit: z.number().int().optional(),
  reorderThreshold: z.number().optional(),
  reorderQuantity: z.number().optional(),
  reorderUnit: z.string().optional(),
  unitPrice: z.number().optional(),
  properties: z.array(z.string()),
  currentLotNumber: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: consumableProductStatusSchema,
  createdAt: dateField,
  updatedAt: dateField,
});

export const consumableProductWithStockSchema = consumableProductSchema.extend({
  totalStock: z.number(),
});

export const createConsumableProductRequestSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Product name is required').max(200),
  manufacturer: z.string().max(200).optional(),
  catalogNumber: z.string().max(200).optional(),
  vendorName: z.string().max(200).optional(),
  vendorCatalogNumber: z.string().max(200).optional(),
  stockUnit: z.string().max(100).optional(),
  unitsPerStockUnit: z.number().int().min(1).optional(),
  reorderThreshold: z.number().min(0).optional(),
  reorderQuantity: z.number().min(0).optional(),
  reorderUnit: z.string().max(100).optional(),
  unitPrice: z.number().min(0).optional(),
  properties: z.array(z.string().max(200)).optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateConsumableProductRequestSchema = z.object({
  categoryId: z.string().min(1).nullish(),
  name: z.string().min(1).max(200).nullish(),
  manufacturer: z.string().max(200).nullish(),
  catalogNumber: z.string().max(200).nullish(),
  vendorName: z.string().max(200).nullish(),
  vendorCatalogNumber: z.string().max(200).nullish(),
  stockUnit: z.string().max(100).nullish(),
  unitsPerStockUnit: z.number().int().min(1).nullish(),
  reorderThreshold: z.number().min(0).nullish(),
  reorderQuantity: z.number().min(0).nullish(),
  reorderUnit: z.string().max(100).nullish(),
  unitPrice: z.number().min(0).nullish(),
  properties: z.array(z.string().max(200)).nullish(),
  description: z.string().max(2000).nullish(),
  notes: z.string().max(5000).nullish(),
});

export const consumableProductResponseSchema = z.object({
  product: consumableProductSchema,
});

export const consumableProductListResponseSchema = z.object({
  products: z.array(consumableProductWithStockSchema),
});

// Stock schemas

export const consumableStockSchema = z.object({
  id: z.string(),
  productId: z.string(),
  locationId: z.string(),
  quantity: z.number(),
  updatedAt: dateField,
});

// Barcode schemas

export const consumableBarcodeSchema = z.object({
  id: z.string(),
  productId: z.string(),
  barcodeValue: z.string(),
  barcodeType: consumableBarcodeTypeSchema,
  isPrimary: z.boolean(),
  label: z.string().optional(),
});

export const createConsumableBarcodeRequestSchema = z.object({
  barcodeValue: z.string().min(1, 'Barcode value is required').max(500),
  barcodeType: consumableBarcodeTypeSchema,
  isPrimary: z.boolean().optional(),
  label: z.string().max(200).optional(),
});

export const consumableBarcodeResponseSchema = z.object({
  barcode: consumableBarcodeSchema,
});

// Transaction schemas

export const consumableTransactionSchema = z.object({
  id: z.string(),
  productId: z.string(),
  locationId: z.string(),
  labId: z.string(),
  type: consumableTransactionTypeSchema,
  quantityChange: z.number(),
  quantityAfter: z.number(),
  lotNumber: z.string().optional(),
  expirationDate: optionalDateField,
  poNumber: z.string().optional(),
  cost: z.number().optional(),
  performedBy: z.string(),
  notes: z.string().optional(),
  createdAt: dateField,
});

export const recordConsumableTransactionRequestSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  locationId: z.string().min(1, 'Location is required'),
  type: consumableTransactionTypeSchema,
  quantity: z.number().min(0, 'Quantity must be non-negative'),
  lotNumber: z.string().max(200).optional(),
  expirationDate: z.string().optional(),
  poNumber: z.string().max(200).optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  receivingUnit: z.string().optional(),
});

export const recordConsumableStockCountRequestSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  locationId: z.string().min(1, 'Location is required'),
  actualCount: z.number().min(0, 'Count must be non-negative'),
  lotNumber: z.string().max(200).optional(),
  expirationDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const consumableTransactionResponseSchema = z.object({
  transaction: consumableTransactionSchema,
});

export const consumableTransactionListResponseSchema = z.object({
  transactions: z.array(consumableTransactionSchema),
});

// Document schemas

export const consumableDocumentSchema = z.object({
  id: z.string(),
  productId: z.string(),
  label: z.string(),
  url: z.string(),
  notes: z.string().optional(),
  createdAt: dateField,
});

export const createConsumableDocumentRequestSchema = z.object({
  label: z.string().min(1, 'Document label is required').max(200),
  url: z.string().min(1, 'Document URL is required').max(2000),
  notes: z.string().max(500).optional(),
});

export const consumableDocumentResponseSchema = z.object({
  document: consumableDocumentSchema,
});

export const consumableDocumentListResponseSchema = z.object({
  documents: z.array(consumableDocumentSchema),
});

// Unit conversion schemas

export const consumableUnitConversionSchema = z.object({
  id: z.string(),
  productId: z.string(),
  unitName: z.string(),
  multiplier: z.number(),
});

export const createConsumableUnitConversionRequestSchema = z.object({
  unitName: z.string().min(1, 'Unit name is required').max(100),
  multiplier: z.number().positive('Multiplier must be greater than 0'),
});

export const consumableUnitConversionResponseSchema = z.object({
  conversion: consumableUnitConversionSchema,
});

// Composed detail response

export const consumableProductDetailResponseSchema = z.object({
  product: consumableProductSchema,
  documents: z.array(consumableDocumentSchema),
  barcodes: z.array(consumableBarcodeSchema),
  stock: z.array(consumableStockSchema),
  recentTransactions: z.array(consumableTransactionSchema),
  unitConversions: z.array(consumableUnitConversionSchema),
});

// Bulk operation schemas

const productIdsField = z.array(z.string().min(1)).min(1, 'At least one product is required').max(100);

export const consumableBulkReceiveRequestSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    locationId: z.string().min(1),
    quantity: z.number().min(0),
    lotNumber: z.string().max(200).optional(),
    expirationDate: z.string().optional(),
    poNumber: z.string().max(200).optional(),
    cost: z.number().min(0).optional(),
    receivingUnit: z.string().optional(),
  })).min(1, 'At least one item is required').max(100),
});

export const consumableBulkConsumeRequestSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    locationId: z.string().min(1),
    quantity: z.number().min(0),
  })).min(1, 'At least one item is required').max(100),
});

export const consumableBulkReassignCategoryRequestSchema = z.object({
  productIds: productIdsField,
  categoryId: z.string().min(1, 'Target category is required'),
});

export const consumableBulkArchiveRequestSchema = z.object({
  productIds: productIdsField,
});

export const consumableBulkResponseSchema = z.object({
  succeeded: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), error: z.string() })),
});

// Reorder list response

export const consumableReorderListResponseSchema = z.object({
  products: z.array(consumableProductWithStockSchema),
});

// Type exports

export type ConsumableProductStatus = z.infer<typeof consumableProductStatusSchema>;
export type ConsumableTransactionType = z.infer<typeof consumableTransactionTypeSchema>;
export type ConsumableBarcodeType = z.infer<typeof consumableBarcodeTypeSchema>;
export type ConsumableCategory = z.infer<typeof consumableCategorySchema>;
export type ConsumableProduct = z.infer<typeof consumableProductSchema>;
export type ConsumableProductWithStock = z.infer<typeof consumableProductWithStockSchema>;
export type ConsumableLocation = z.infer<typeof consumableLocationSchema>;
export type ConsumableStock = z.infer<typeof consumableStockSchema>;
export type ConsumableBarcode = z.infer<typeof consumableBarcodeSchema>;
export type ConsumableTransaction = z.infer<typeof consumableTransactionSchema>;
export type ConsumableDocument = z.infer<typeof consumableDocumentSchema>;
export type ConsumableProductDetail = z.infer<typeof consumableProductDetailResponseSchema>;
export type CreateConsumableCategoryRequest = z.infer<typeof createConsumableCategoryRequestSchema>;
export type UpdateConsumableCategoryRequest = z.infer<typeof updateConsumableCategoryRequestSchema>;
export type CreateConsumableLocationRequest = z.infer<typeof createConsumableLocationRequestSchema>;
export type UpdateConsumableLocationRequest = z.infer<typeof updateConsumableLocationRequestSchema>;
export type CreateConsumableProductRequest = z.infer<typeof createConsumableProductRequestSchema>;
export type UpdateConsumableProductRequest = z.infer<typeof updateConsumableProductRequestSchema>;
export type CreateConsumableBarcodeRequest = z.infer<typeof createConsumableBarcodeRequestSchema>;
export type RecordConsumableTransactionRequest = z.infer<typeof recordConsumableTransactionRequestSchema>;
export type RecordConsumableStockCountRequest = z.infer<typeof recordConsumableStockCountRequestSchema>;
export type CreateConsumableDocumentRequest = z.infer<typeof createConsumableDocumentRequestSchema>;
export type ConsumableBulkReceiveRequest = z.infer<typeof consumableBulkReceiveRequestSchema>;
export type ConsumableBulkConsumeRequest = z.infer<typeof consumableBulkConsumeRequestSchema>;
export type ConsumableBulkReassignCategoryRequest = z.infer<typeof consumableBulkReassignCategoryRequestSchema>;
export type ConsumableBulkArchiveRequest = z.infer<typeof consumableBulkArchiveRequestSchema>;
export type ConsumableBulkResponse = z.infer<typeof consumableBulkResponseSchema>;
export type ConsumableUnitConversion = z.infer<typeof consumableUnitConversionSchema>;
export type CreateConsumableUnitConversionRequest = z.infer<typeof createConsumableUnitConversionRequestSchema>;
