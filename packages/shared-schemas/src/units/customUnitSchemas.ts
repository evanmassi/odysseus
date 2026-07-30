/**
 * Custom Unit Schemas
 *
 * Lab-scoped supplement to the fixed unit registry: units a lab adds for the
 * oddball tail (e.g. `beads/50 µL`) the registry does not enumerate. Rendered
 * verbatim, never auto-converted.
 */

import { z } from 'zod';

import { dateField } from '../utils/dateFields';
import { UNIT_KINDS } from './unitRegistry';

export const unitKindSchema = z.enum(UNIT_KINDS);

export const customUnitSchema = z.object({
  id: z.string(),
  labId: z.string(),
  label: z.string(),
  kind: unitKindSchema,
  sortOrder: z.number().int(),
  createdAt: dateField,
  updatedAt: dateField,
});

// A unit is referenced by label across every column that stores one, so the count gates
// deletion: dropping a unit in use would leave a label no dropdown offers.
export const customUnitWithUsageSchema = customUnitSchema.extend({
  usageCount: z.number().int().min(0),
});

export const createCustomUnitRequestSchema = z.object({
  label: z.string().min(1, 'Unit label is required').max(50),
  kind: unitKindSchema,
});

// The dimension is fixed at creation: changing it would re-point the unit at fields
// holding incompatible quantities.
export const renameCustomUnitRequestSchema = z.object({
  label: z.string().min(1, 'Unit label is required').max(50),
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
export type RenameCustomUnitRequest = z.infer<typeof renameCustomUnitRequestSchema>;
