/**
 * Donor Registry Schemas
 *
 * Validation and types for donor records and collection history.
 */

import { z } from 'zod';
import { dateField } from '../utils/dateFields';

// Entity schema

export const donorSchema = z.object({
  id: z.string(),
  labId: z.string(),
  donorSourceId: z.string().optional(),
  donorInternalId: z.string().optional(),
  species: z.string().optional(),
  age: z.string().optional(),
  sex: z.string().optional(),
  ethnicity: z.string().optional(),
  clinicalStatus: z.string().optional(),
  diagnosis: z.string().optional(),
  diseaseStage: z.string().optional(),
  notes: z.string().optional(),
  isCurated: z.boolean(),
  createdAt: dateField,
  updatedAt: dateField,
});

export const donorWithTubeCountSchema = donorSchema.extend({
  tubeCount: z.number().int().min(0),
});

export const donorCollectionHistorySchema = z.object({
  id: z.string(),
  donorId: z.string(),
  // Date-only string, not a Date — coercing to a Date shifts the day across timezones.
  collectionDate: z.string().optional(),
  specimenType: z.string().optional(),
  source: z.string().optional(),
  createdAt: dateField,
});

// Request schemas

export const createDonorRequestSchema = z.object({
  donorSourceId: z.string().max(200).optional(),
  donorInternalId: z.string().max(200).optional(),
  species: z.string().max(200).optional(),
  age: z.string().max(50).optional(),
  sex: z.string().max(50).optional(),
  ethnicity: z.string().max(200).optional(),
  clinicalStatus: z.string().max(50).optional(),
  diagnosis: z.string().max(500).optional(),
  diseaseStage: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => data.donorSourceId || data.donorInternalId,
  { message: 'At least one donor ID (source or internal) is required' }
);

export const updateDonorRequestSchema = z.object({
  donorSourceId: z.string().max(200).nullish(),
  donorInternalId: z.string().max(200).nullish(),
  species: z.string().max(200).nullish(),
  age: z.string().max(50).nullish(),
  sex: z.string().max(50).nullish(),
  ethnicity: z.string().max(200).nullish(),
  clinicalStatus: z.string().max(50).nullish(),
  diagnosis: z.string().max(500).nullish(),
  diseaseStage: z.string().max(200).nullish(),
  notes: z.string().max(2000).nullish(),
}).refine(
  (data) => {
    const sourceCleared = data.donorSourceId === null;
    const internalCleared = data.donorInternalId === null;
    if (sourceCleared && internalCleared) return false;
    return true;
  },
  { message: 'Cannot clear both donor IDs — at least one must remain' }
);

export const createCollectionHistoryRequestSchema = z.object({
  collectionDate: z.string().optional(),
  specimenType: z.string().max(200).optional(),
  source: z.string().max(200).optional(),
}).refine(
  (data) => data.collectionDate || data.specimenType || data.source,
  { message: 'At least one field (date, specimen type, or source) is required' }
);

export const updateCollectionHistoryRequestSchema = z.object({
  collectionDate: z.string().nullish(),
  specimenType: z.string().max(200).nullish(),
  source: z.string().max(200).nullish(),
}).refine(
  (data) => data.collectionDate !== undefined || data.specimenType !== undefined || data.source !== undefined,
  { message: 'At least one field must be provided' }
);

// Response schemas

export const donorsResponseSchema = z.object({
  donors: z.array(donorWithTubeCountSchema),
});

export const donorResponseSchema = z.object({
  donor: donorWithTubeCountSchema,
});

export const donorCollectionHistoryResponseSchema = z.object({
  history: z.array(donorCollectionHistorySchema),
});

export const donorCollectionHistoryEntryResponseSchema = z.object({
  entry: donorCollectionHistorySchema,
});

export const donorSearchResultSchema = donorSchema.pick({
  id: true,
  donorSourceId: true,
  donorInternalId: true,
});

export const donorSearchResponseSchema = z.object({
  results: z.array(donorSearchResultSchema),
});

// Type exports

export type Donor = z.infer<typeof donorSchema>;
export type DonorWithTubeCount = z.infer<typeof donorWithTubeCountSchema>;
export type DonorCollectionHistory = z.infer<typeof donorCollectionHistorySchema>;
export type CreateDonorRequest = z.infer<typeof createDonorRequestSchema>;
export type UpdateDonorRequest = z.infer<typeof updateDonorRequestSchema>;
export type CreateCollectionHistoryRequest = z.infer<typeof createCollectionHistoryRequestSchema>;
export type UpdateCollectionHistoryRequest = z.infer<typeof updateCollectionHistoryRequestSchema>;
export type DonorSearchResult = z.infer<typeof donorSearchResultSchema>;
