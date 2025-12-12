/**
 * Tubes Domain Types
 * All types from shared schemas
 */

export * from './FieldResolver';
export * from './colorSystemTypes';

// Re-export ALL tube types from shared schemas (single source of truth)
export type {
  TubeData,
  TubeLocation,
  TubeSample,
  TubeUpdateSample,
  TubeTimestamps,
  TubeMedia,
  CreateTubeRequest,
  UpdateTubeRequest,
  ConcentrationUnit,
} from '@shared/types/tubeTypes';

// Re-export domain constants
export { UNKNOWN_RESEARCHER } from '@shared/types/tubeTypes';
