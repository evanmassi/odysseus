import { z } from 'zod';

import { dateField } from '../utils/dateFields';
import { INVENTORY_UNIT_KINDS } from './unitRegistry';

export const unitKindSchema = z.enum(INVENTORY_UNIT_KINDS);

export const customUnitSchema = z.object({
  id: z.string(),
  labId: z.string(),
  label: z.string(),
  kind: unitKindSchema,
  sortOrder: z.number().int(),
  createdAt: dateField,
  updatedAt: dateField,
});

// PITFALL: units are stored by label in every column that holds one, so deleting a unit in use strands that label.
export const customUnitWithUsageSchema = customUnitSchema.extend({
  usageCount: z.number().int().min(0),
});

export const createCustomUnitRequestSchema = z.object({
  label: z.string().min(1, 'Unit label is required').max(50),
  kind: unitKindSchema,
});

// PITFALL: changing kind re-points the unit at other fields; the server allows it only while the unit is unused.
export const updateCustomUnitRequestSchema = z
  .object({
    label: z.string().min(1, 'Unit label is required').max(50).optional(),
    kind: unitKindSchema.optional(),
  })
  .refine(data => data.label !== undefined || data.kind !== undefined, {
    message: 'Nothing to update',
  });

export const customUnitResponseSchema = z.object({
  customUnit: customUnitSchema,
});

export const customUnitListResponseSchema = z.object({
  customUnits: z.array(customUnitWithUsageSchema),
});

export type UnitKindValue = z.infer<typeof unitKindSchema>;
export type CustomUnit = z.infer<typeof customUnitSchema>;
export type CustomUnitWithUsage = z.infer<typeof customUnitWithUsageSchema>;
export type CreateCustomUnitRequest = z.infer<typeof createCustomUnitRequestSchema>;
export type UpdateCustomUnitRequest = z.infer<typeof updateCustomUnitRequestSchema>;
