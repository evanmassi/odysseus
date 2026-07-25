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

export const reagentCustomUnitSchema = z.object({
  id: z.string(),
  labId: z.string(),
  label: z.string(),
  kind: unitKindSchema,
  sortOrder: z.number().int(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createReagentCustomUnitRequestSchema = z.object({
  label: z.string().min(1, 'Unit label is required').max(50),
  kind: unitKindSchema,
  sortOrder: z.number().int().optional(),
});

export const updateReagentCustomUnitRequestSchema = z.object({
  label: z.string().min(1).max(50).nullish(),
  sortOrder: z.number().int().nullish(),
});

export const reagentCustomUnitResponseSchema = z.object({
  customUnit: reagentCustomUnitSchema,
});

export const reagentCustomUnitListResponseSchema = z.object({
  customUnits: z.array(reagentCustomUnitSchema),
});

export type UnitKindValue = z.infer<typeof unitKindSchema>;
export type ReagentCustomUnit = z.infer<typeof reagentCustomUnitSchema>;
export type CreateReagentCustomUnitRequest = z.infer<typeof createReagentCustomUnitRequestSchema>;
export type UpdateReagentCustomUnitRequest = z.infer<typeof updateReagentCustomUnitRequestSchema>;
