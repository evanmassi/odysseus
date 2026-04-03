/**
 * Equipment Inventory Schemas
 *
 * Validation and types for equipment categories, items, documents, and maintenance logs.
 */

import { z } from 'zod';
import { dateField, optionalDateField } from '../utils/dateFields';

// Status and category enums

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
  model: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  status: equipmentStatusSchema,
  conditionNotes: z.string().optional(),
  purchaseDate: optionalDateField,
  warrantyExpiration: optionalDateField,
  purchaseCost: z.number().optional(),
  assetTag: z.string().optional(),
  nextMaintenanceDate: optionalDateField,
  decommissionDate: optionalDateField,
  decommissionReason: z.string().optional(),
  disposalMethod: z.string().optional(),
  notes: z.string().optional(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createEquipmentItemRequestSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Equipment name is required').max(200),
  serialNumber: z.string().max(200).optional(),
  manufacturer: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  status: equipmentStatusSchema.default('active'),
  conditionNotes: z.string().max(2000).optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiration: z.string().optional(),
  purchaseCost: z.number().min(0).optional(),
  assetTag: z.string().max(200).optional(),
  nextMaintenanceDate: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateEquipmentItemRequestSchema = z.object({
  categoryId: z.string().min(1).nullish(),
  name: z.string().min(1).max(200).nullish(),
  serialNumber: z.string().max(200).nullish(),
  manufacturer: z.string().max(200).nullish(),
  model: z.string().max(200).nullish(),
  description: z.string().max(2000).nullish(),
  location: z.string().max(500).nullish(),
  status: equipmentStatusSchema.nullish(),
  conditionNotes: z.string().max(2000).nullish(),
  purchaseDate: z.string().nullish(),
  warrantyExpiration: z.string().nullish(),
  purchaseCost: z.number().min(0).nullish(),
  assetTag: z.string().max(200).nullish(),
  nextMaintenanceDate: z.string().nullish(),
  notes: z.string().max(5000).nullish(),
});

export const decommissionEquipmentItemRequestSchema = z.object({
  decommissionDate: z.string().min(1, 'Decommission date is required'),
  decommissionReason: z.string().max(2000).optional(),
  disposalMethod: z.string().max(500).optional(),
});

export const equipmentItemResponseSchema = z.object({
  item: equipmentItemSchema,
});

export const equipmentItemListResponseSchema = z.object({
  items: z.array(equipmentItemSchema),
});

// Document schemas

export const equipmentDocumentSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  label: z.string(),
  url: z.string(),
  notes: z.string().optional(),
  createdAt: dateField,
});

export const createEquipmentDocumentRequestSchema = z.object({
  label: z.string().min(1, 'Document label is required').max(200),
  url: z.string().min(1, 'Document URL is required').max(2000),
  notes: z.string().max(500).optional(),
});

export const equipmentDocumentResponseSchema = z.object({
  document: equipmentDocumentSchema,
});

export const equipmentDocumentListResponseSchema = z.object({
  documents: z.array(equipmentDocumentSchema),
});

// Maintenance log schemas

export const equipmentMaintenanceLogSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  datePerformed: dateField,
  maintenanceType: z.string(),
  performedBy: z.string().optional(),
  technician: z.string().optional(),
  description: z.string().optional(),
  nextScheduledDate: optionalDateField,
  cost: z.number().optional(),
  notes: z.string().optional(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createEquipmentMaintenanceLogRequestSchema = z.object({
  datePerformed: z.string().min(1, 'Date performed is required'),
  maintenanceType: z.string().min(1, 'Maintenance type is required').max(200),
  performedBy: z.string().max(200).optional(),
  technician: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  nextScheduledDate: z.string().optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateEquipmentMaintenanceLogRequestSchema = z.object({
  datePerformed: z.string().min(1).nullish(),
  maintenanceType: z.string().min(1).max(200).nullish(),
  performedBy: z.string().max(200).nullish(),
  technician: z.string().max(200).nullish(),
  description: z.string().max(5000).nullish(),
  nextScheduledDate: z.string().nullish(),
  cost: z.number().min(0).nullish(),
  notes: z.string().max(5000).nullish(),
});

export const equipmentMaintenanceLogEntryResponseSchema = z.object({
  entry: equipmentMaintenanceLogSchema,
});

export const equipmentMaintenanceLogListResponseSchema = z.object({
  entries: z.array(equipmentMaintenanceLogSchema),
});

// Composed detail response — item with its documents and maintenance log

export const equipmentItemDetailResponseSchema = z.object({
  item: equipmentItemSchema,
  documents: z.array(equipmentDocumentSchema),
  maintenanceLog: z.array(equipmentMaintenanceLogSchema),
});

// Type exports

export type EquipmentStatus = z.infer<typeof equipmentStatusSchema>;
export type EquipmentCategory = z.infer<typeof equipmentCategorySchema>;
export type EquipmentItem = z.infer<typeof equipmentItemSchema>;
export type EquipmentDocument = z.infer<typeof equipmentDocumentSchema>;
export type EquipmentMaintenanceLog = z.infer<typeof equipmentMaintenanceLogSchema>;
export type EquipmentItemDetail = z.infer<typeof equipmentItemDetailResponseSchema>;
export type CreateEquipmentCategoryRequest = z.infer<typeof createEquipmentCategoryRequestSchema>;
export type UpdateEquipmentCategoryRequest = z.infer<typeof updateEquipmentCategoryRequestSchema>;
export type CreateEquipmentItemRequest = z.infer<typeof createEquipmentItemRequestSchema>;
export type UpdateEquipmentItemRequest = z.infer<typeof updateEquipmentItemRequestSchema>;
export type DecommissionEquipmentItemRequest = z.infer<typeof decommissionEquipmentItemRequestSchema>;
export type CreateEquipmentDocumentRequest = z.infer<typeof createEquipmentDocumentRequestSchema>;
export type CreateEquipmentMaintenanceLogRequest = z.infer<typeof createEquipmentMaintenanceLogRequestSchema>;
export type UpdateEquipmentMaintenanceLogRequest = z.infer<typeof updateEquipmentMaintenanceLogRequestSchema>;
