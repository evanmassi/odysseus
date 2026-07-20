/**
 * Lookup Value Schemas
 *
 * Validation for admin-managed dropdown values; LOOKUP_CATEGORIES is the canonical category list.
 */

import { z } from 'zod';
import { dateField } from '../utils/dateFields';

export const LOOKUP_CATEGORIES = [
  'species',
  'source',
  'media',
  'specimen_type',
  'equipment_maintenance_type',
  'supply_item_property',
  'supply_stock_unit',
  'supply_vendor',
  'supply_manufacturer',
] as const;
export type LookupCategory = (typeof LOOKUP_CATEGORIES)[number];

export const lookupValueSchema = z.object({
  id: z.string().min(1),
  category: z.enum(LOOKUP_CATEGORIES),
  value: z.string().min(1).max(200),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  createdAt: dateField,
  updatedAt: dateField,
  labId: z.string().optional(),
});

export const lookupValueWithCountSchema = lookupValueSchema.extend({
  usageCount: z.number().int().min(0),
});

export const createLookupValueRequestSchema = z.object({
  category: z.enum(LOOKUP_CATEGORIES),
  value: z.string().min(1, 'Value is required').max(200, 'Value cannot exceed 200 characters'),
  sortOrder: z.number().int().optional(),
});

export const renameLookupValueRequestSchema = z.object({
  newValue: z
    .string()
    .min(1, 'New value is required')
    .max(200, 'Value cannot exceed 200 characters'),
});

export type LookupValue = z.infer<typeof lookupValueSchema>;
export type LookupValueWithCount = z.infer<typeof lookupValueWithCountSchema>;
