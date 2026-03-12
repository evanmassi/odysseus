/**
 * HTTP Input Validation Schemas
 *
 * Uses shared schemas from @odysseus/shared-schemas to avoid duplication.
 */
import { z } from 'zod';
import {
  createTubeRequestSchema,
  updateTubeRequestSchema,
  tubeLocationSchema,
  createResearcherProfileSchema,
  lockTubesRequestSchema,
  unlockTubesRequestSchema,
  shareTubeAccessRequestSchema,
  revokeTubeAccessRequestSchema
} from '@odysseus/shared-schemas';

// Supports both single tube creation and bulk paste operations (copy/cut)
export const CreateTubeHttpSchema = z.union([
  createTubeRequestSchema,
  z.array(createTubeRequestSchema)
]);

export const UpdateTubeHttpSchema = updateTubeRequestSchema;

export const CreateResearcherHttpSchema = createResearcherProfileSchema;

// Omits position from shared location schema
export const LocationQuerySchema = tubeLocationSchema.omit({ position: true });

export const BulkUpdateHttpSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1),
    updates: UpdateTubeHttpSchema
  })).min(1, "At least one update is required")
});

export const BulkDeleteHttpSchema = z.object({
  tubeIds: z.array(z.string().min(1)).min(1, "At least one tube ID is required")
});

export const LockTubesHttpSchema = lockTubesRequestSchema;
export const UnlockTubesHttpSchema = unlockTubesRequestSchema;
export const ShareTubeAccessHttpSchema = shareTubeAccessRequestSchema;
export const RevokeTubeAccessHttpSchema = revokeTubeAccessRequestSchema;
