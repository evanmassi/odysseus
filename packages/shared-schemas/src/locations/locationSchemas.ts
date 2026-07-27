/**
 * Location Schemas
 *
 * Validation and types for the lab-wide location tree — named places, nestable up to three tiers,
 * shared by every catalog.
 */

import { z } from 'zod';

import { dateField } from '../utils/dateFields';
import { optionalText, patchText } from '../utils/stringFields';

export const LOCATION_MAX_DEPTH = 3;

export const locationSchema = z.object({
  id: z.string(),
  labId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  parentId: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const createLocationRequestSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(200),
  description: optionalText(500),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateLocationRequestSchema = z.object({
  name: z.string().min(1).max(200).nullish(),
  description: patchText(500),
  parentId: z.string().nullish(),
  sortOrder: z.number().int().nullish(),
});

export const locationResponseSchema = z.object({
  location: locationSchema,
});

export const locationListResponseSchema = z.object({
  locations: z.array(locationSchema),
});

export type Location = z.infer<typeof locationSchema>;
export type CreateLocationRequest = z.infer<typeof createLocationRequestSchema>;
export type UpdateLocationRequest = z.infer<typeof updateLocationRequestSchema>;
