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
  TubeTimestamps,
  CreateTubeRequest,
  UpdateTubeRequest,
  TubeQueryFilters,
  BatchTubeOperation,
  TubeValidationResult,
  ConcentrationUnit,
} from '@odysseus/shared-schemas';

// Constants
export { UNKNOWN_RESEARCHER } from '@odysseus/shared-schemas';
