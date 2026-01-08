/**
 * Tube types - Re-exported from shared schemas
 *
 * All tube types come from @odysseus/shared-schemas to ensure
 * client and server use identical type definitions.
 */

// Domain types (strict - for API responses, domain logic)
export type {
  TubeData,
  TubeLocation,
  TubeSample,
  TubeUpdateSample,
  TubeMedia,
  TubeTimestamps,
  CreateTubeRequest,
  UpdateTubeRequest,
  TubeQueryFilters,
  BatchTubeOperation,
  TubeValidationResult,
  ConcentrationUnit,
} from '@odysseus/shared-schemas';

// Deprecated input types (kept for backward compatibility during Phase 2)
export type { TubeFormSampleInput, TubeFormDataInput } from '@odysseus/shared-schemas';

// Constants
export { UNKNOWN_RESEARCHER } from '@odysseus/shared-schemas';
