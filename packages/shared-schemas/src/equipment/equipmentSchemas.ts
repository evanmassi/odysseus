/**
 * Equipment Inventory Schemas
 *
 * Validation and types for equipment categories, items, documents, and maintenance logs.
 */

import { z } from 'zod';
import { attributeSummarySchema, attributeValueSchema } from '../attributes';
import { documentTypeSchema } from '../documents';
import { dateField, dateOnlyField, optionalDateOnlyField } from '../utils/dateFields';
import { optionalText, patchText } from '../utils/stringFields';

// Status enum

export const equipmentStatusValues = [
  'active',
  'inactive',
  'under_maintenance',
  'out_of_service',
  'decommissioned',
] as const;

export const equipmentStatusSchema = z.enum(equipmentStatusValues);

// Category schemas

export const equipmentCategorySchema = z.object({
  id: z.string(),
  labId: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createEquipmentCategoryRequestSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(200),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateEquipmentCategoryRequestSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  parentId: z.string().nullish(),
  sortOrder: z.number().int().nullish(),
});

export const equipmentCategoryResponseSchema = z.object({
  category: equipmentCategorySchema,
});

export const equipmentCategoryListResponseSchema = z.object({
  categories: z.array(equipmentCategorySchema),
});

// Item schemas

export const equipmentItemSchema = z.object({
  id: z.string(),
  labId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  vendorName: z.string().optional(),
  vendorCatalogNumber: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  locationId: z.string().optional(),
  status: equipmentStatusSchema,
  conditionNotes: z.string().optional(),
  purchaseDate: optionalDateOnlyField,
  warrantyExpiration: optionalDateOnlyField,
  purchaseCost: z.number().optional(),
  assetTag: z.string().optional(),
  nextMaintenanceDate: optionalDateOnlyField,
  decommissionDate: optionalDateOnlyField,
  decommissionReason: z.string().optional(),
  disposalMethod: z.string().optional(),
  notes: z.string().optional(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createEquipmentItemRequestSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Equipment name is required').max(200),
  serialNumber: optionalText(200),
  manufacturer: optionalText(200),
  vendorName: optionalText(200),
  vendorCatalogNumber: optionalText(200),
  model: optionalText(200),
  description: optionalText(2000),
  locationId: z.string().nullish(),
  status: equipmentStatusSchema.default('active'),
  conditionNotes: optionalText(2000),
  purchaseDate: optionalText(),
  warrantyExpiration: optionalText(),
  purchaseCost: z.number().min(0).optional(),
  assetTag: optionalText(200),
  nextMaintenanceDate: optionalText(),
  notes: optionalText(5000),
});

export const updateEquipmentItemRequestSchema = z.object({
  categoryId: z.string().min(1, 'Category is required').nullish(),
  name: z.string().min(1, 'Equipment name is required').max(200).nullish(),
  serialNumber: patchText(200),
  manufacturer: patchText(200),
  vendorName: patchText(200),
  vendorCatalogNumber: patchText(200),
  model: patchText(200),
  description: patchText(2000),
  locationId: z.string().nullish(),
  status: equipmentStatusSchema.nullish(),
  conditionNotes: patchText(2000),
  purchaseDate: patchText(),
  warrantyExpiration: patchText(),
  purchaseCost: z.number().min(0).nullish(),
  assetTag: patchText(200),
  nextMaintenanceDate: patchText(),
  notes: patchText(5000),
});

export const decommissionEquipmentItemRequestSchema = z.object({
  decommissionDate: z.string().min(1, 'Decommission date is required'),
  decommissionReason: z.string().max(2000).optional(),
  disposalMethod: z.string().max(500).optional(),
});

export const equipmentItemResponseSchema = z.object({
  item: equipmentItemSchema,
});

// Only the list row carries attributes: a create/update response has none loaded, and the
// detail aggregate carries the full value rows instead.
export const equipmentItemWithAttributesSchema = equipmentItemSchema.extend({
  attributeValues: z.array(attributeSummarySchema),
});

export const equipmentItemListResponseSchema = z.object({
  items: z.array(equipmentItemWithAttributesSchema),
});

// Document schemas

export const equipmentDocumentSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  label: z.string(),
  url: z.string(),
  notes: z.string().optional(),
  docType: documentTypeSchema.optional(),
  createdAt: dateField,
});

export const createEquipmentDocumentRequestSchema = z.object({
  label: z.string().min(1, 'Document label is required').max(200),
  url: z.string().min(1, 'Document URL is required').max(2000),
  notes: z.string().max(500).optional(),
  docType: documentTypeSchema.optional(),
});

export const updateEquipmentDocumentRequestSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  url: z.string().min(1).max(2000).optional(),
  notes: z.string().max(500).nullish(),
  docType: documentTypeSchema.nullish(),
});

export const equipmentDocumentResponseSchema = z.object({
  document: equipmentDocumentSchema,
});

// Maintenance log schemas

export const equipmentMaintenanceLogSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  datePerformed: dateOnlyField,
  maintenanceType: z.string(),
  performedBy: z.string().optional(),
  technician: z.string().optional(),
  description: z.string().optional(),
  nextScheduledDate: optionalDateOnlyField,
  cost: z.number().optional(),
  notes: z.string().optional(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createEquipmentMaintenanceLogRequestSchema = z.object({
  datePerformed: z.string().min(1, 'Date performed is required'),
  maintenanceType: z.string().min(1, 'Maintenance type is required').max(200),
  performedBy: optionalText(200),
  technician: optionalText(200),
  description: optionalText(5000),
  nextScheduledDate: optionalText(),
  cost: z.number().min(0).optional(),
  notes: optionalText(5000),
});

export const updateEquipmentMaintenanceLogRequestSchema = z.object({
  datePerformed: z.string().min(1, 'Date performed is required').nullish(),
  maintenanceType: z.string().min(1, 'Maintenance type is required').max(200).nullish(),
  performedBy: patchText(200),
  technician: patchText(200),
  description: patchText(5000),
  nextScheduledDate: patchText(),
  cost: z.number().min(0).nullish(),
  notes: patchText(5000),
});

export const equipmentMaintenanceLogEntryResponseSchema = z.object({
  entry: equipmentMaintenanceLogSchema,
});

// Composed detail response — item with its documents and maintenance log

export const equipmentItemDetailResponseSchema = z.object({
  item: equipmentItemSchema,
  documents: z.array(equipmentDocumentSchema),
  maintenanceLog: z.array(equipmentMaintenanceLogSchema),
  attributeValues: z.array(attributeValueSchema),
});

// Bulk operation schemas

const itemIdsField = z.array(z.string().min(1)).min(1, 'At least one item is required').max(100);

export const equipmentBulkMaintenanceRequestSchema = z.object({
  itemIds: itemIdsField,
  data: createEquipmentMaintenanceLogRequestSchema,
});

export const equipmentBulkStatusSchema = equipmentStatusSchema.exclude(['decommissioned']);
export const equipmentBulkStatusValues = equipmentBulkStatusSchema.options;

export const equipmentBulkStatusRequestSchema = z.object({
  itemIds: itemIdsField,
  data: z.object({
    status: equipmentBulkStatusSchema,
    conditionNotes: z.string().max(2000).optional(),
  }),
});

export const equipmentBulkRelocateRequestSchema = z.object({
  itemIds: itemIdsField,
  data: z.object({
    categoryId: z.string().min(1, 'Target category is required'),
  }),
});

export const equipmentBulkResponseSchema = z.object({
  succeeded: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), error: z.string() })),
});

// Type exports

export type EquipmentStatus = z.infer<typeof equipmentStatusSchema>;
export type EquipmentCategory = z.infer<typeof equipmentCategorySchema>;
export type EquipmentItem = z.infer<typeof equipmentItemSchema>;
export type EquipmentItemWithAttributes = z.infer<typeof equipmentItemWithAttributesSchema>;
export type EquipmentDocument = z.infer<typeof equipmentDocumentSchema>;
export type EquipmentMaintenanceLog = z.infer<typeof equipmentMaintenanceLogSchema>;
export type EquipmentItemDetail = z.infer<typeof equipmentItemDetailResponseSchema>;
export type CreateEquipmentCategoryRequest = z.infer<typeof createEquipmentCategoryRequestSchema>;
export type UpdateEquipmentCategoryRequest = z.infer<typeof updateEquipmentCategoryRequestSchema>;
export type CreateEquipmentItemRequest = z.infer<typeof createEquipmentItemRequestSchema>;
export type UpdateEquipmentItemRequest = z.infer<typeof updateEquipmentItemRequestSchema>;
export type DecommissionEquipmentItemRequest = z.infer<
  typeof decommissionEquipmentItemRequestSchema
>;
export type CreateEquipmentDocumentRequest = z.infer<typeof createEquipmentDocumentRequestSchema>;
export type UpdateEquipmentDocumentRequest = z.infer<typeof updateEquipmentDocumentRequestSchema>;
export type CreateEquipmentMaintenanceLogRequest = z.infer<
  typeof createEquipmentMaintenanceLogRequestSchema
>;
export type UpdateEquipmentMaintenanceLogRequest = z.infer<
  typeof updateEquipmentMaintenanceLogRequestSchema
>;
export type EquipmentBulkStatusRequest = z.infer<typeof equipmentBulkStatusRequestSchema>;
export type EquipmentBulkRelocateRequest = z.infer<typeof equipmentBulkRelocateRequestSchema>;
export type EquipmentBulkResponse = z.infer<typeof equipmentBulkResponseSchema>;
