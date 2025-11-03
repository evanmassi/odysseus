/**
 * HTTP Input Validation Schemas for API requests
 * Uses shared schemas from @odysseus/shared-schemas for consistency
 *
 * Single Source of Truth principle:
 * - HTTP validation schemas should mirror DTOs exactly
 * - Import from shared-schemas when possible to avoid duplication
 * - Keep this file as thin as possible - just wiring
 */
import { z } from 'zod';
import {
  createTubeRequestSchema,
  updateTubeRequestSchema,
  tubeLocationSchema,
  createResearcherProfileSchema,
  type CreateResearcherProfile
} from '@odysseus/shared-schemas';

// Accept both single object and array for POST /tubes
// Supports ergonomic single tube creation AND bulk paste operations (copy/cut)
export const CreateTubeHttpSchema = z.union([
  createTubeRequestSchema,              // Single tube
  z.array(createTubeRequestSchema)      // Array of tubes (paste operation)
]);

export const UpdateTubeHttpSchema = updateTubeRequestSchema;

// Use shared profile schema directly - single source of truth
// This eliminates duplication and ensures compile-time alignment with DTOs
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

// ❌ SIMPLIFIED: HTTP validation for bulk updates
export const BulkUpdateHttpSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1),
    updates: UpdateTubeHttpSchema
  })).min(1, "At least one update is required")
});

// Business validation functions moved to domain layer
// Business rules constants moved to domain value objects
// Complex data type definitions handled by domain entities

// Export HTTP validation types only
export type CreateTubeHttpData = z.infer<typeof CreateTubeHttpSchema>;
export type UpdateTubeHttpData = z.infer<typeof UpdateTubeHttpSchema>;
export type CreateResearcherHttpData = z.infer<typeof CreateResearcherHttpSchema>;
export type BulkUpdateHttpData = z.infer<typeof BulkUpdateHttpSchema>;
export type LocationQueryData = z.infer<typeof LocationQuerySchema>;
