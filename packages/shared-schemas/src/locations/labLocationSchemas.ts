/**
 * Lab Location Schemas
 *
 * Validation and types for the lab-wide location tree — named places, nestable up to three tiers,
 * shared by every catalog.
 */

import { z } from 'zod';

import { dateField } from '../utils/dateFields';
import { optionalText, patchText } from '../utils/stringFields';

export const LAB_LOCATION_MAX_DEPTH = 3;

export const labLocationSchema = z.object({
  id: z.string(),
  labId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  parentId: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createLabLocationRequestSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(200),
  description: optionalText(500),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateLabLocationRequestSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  description: patchText(500),
  parentId: z.string().nullish(),
  sortOrder: z.number().int().nullish(),
});

export const labLocationResponseSchema = z.object({
  location: labLocationSchema,
});

export const labLocationListResponseSchema = z.object({
  locations: z.array(labLocationSchema),
});

export type LabLocation = z.infer<typeof labLocationSchema>;
export type CreateLabLocationRequest = z.infer<typeof createLabLocationRequestSchema>;
export type UpdateLabLocationRequest = z.infer<typeof updateLabLocationRequestSchema>;
