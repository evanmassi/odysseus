/**
 * HTTP Input Validation Schemas for API requests
 *
 * Uses shared schemas from @odysseus/shared-schemas to avoid duplication.
 * Keep this file thin - just wiring to shared schemas.
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
  revokeTubeAccessRequestSchema,
  type CreateResearcherProfile
} from '@odysseus/shared-schemas';

// Accept both single object and array for POST /tubes
// Supports ergonomic single tube creation AND bulk paste operations (copy/cut)
export const CreateTubeHttpSchema = z.union([
  createTubeRequestSchema,              // Single tube
  z.array(createTubeRequestSchema)      // Array of tubes (paste operation)
]);

export const UpdateTubeHttpSchema = updateTubeRequestSchema;

// Use shared profile schema directly
// Eliminates duplication and ensures compile-time alignment with DTOs
export const CreateResearcherHttpSchema = createResearcherProfileSchema;

// TypeScript compile-time assertion to ensure types stay aligned
// If CreateResearcherHttpData and CreateResearcherProfile ever drift,
// this will cause a TypeScript compilation error
type AssertHttpSchemaMatchesProfile = CreateResearcherHttpData extends CreateResearcherProfile
  ? CreateResearcherProfile extends CreateResearcherHttpData
    ? true
    : never
  : never;
const _typeCheck: AssertHttpSchemaMatchesProfile = true;

// Location query validation - reuses shared location schema (omits position)
export const LocationQuerySchema = tubeLocationSchema.omit({ position: true });

export const BulkUpdateHttpSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1),
    updates: UpdateTubeHttpSchema
  })).min(1, "At least one update is required")
});

// Tube Lock HTTP Schemas
export const LockTubesHttpSchema = lockTubesRequestSchema;
export const UnlockTubesHttpSchema = unlockTubesRequestSchema;
export const ShareTubeAccessHttpSchema = shareTubeAccessRequestSchema;
export const RevokeTubeAccessHttpSchema = revokeTubeAccessRequestSchema;

// Export HTTP validation types only
export type CreateTubeHttpData = z.infer<typeof CreateTubeHttpSchema>;
export type UpdateTubeHttpData = z.infer<typeof UpdateTubeHttpSchema>;
export type CreateResearcherHttpData = z.infer<typeof CreateResearcherHttpSchema>;
export type BulkUpdateHttpData = z.infer<typeof BulkUpdateHttpSchema>;
export type LocationQueryData = z.infer<typeof LocationQuerySchema>;
export type LockTubesHttpData = z.infer<typeof LockTubesHttpSchema>;
export type UnlockTubesHttpData = z.infer<typeof UnlockTubesHttpSchema>;
export type ShareTubeAccessHttpData = z.infer<typeof ShareTubeAccessHttpSchema>;
export type RevokeTubeAccessHttpData = z.infer<typeof RevokeTubeAccessHttpSchema>;
