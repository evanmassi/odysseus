/**
 * Tubes Domain Types
 * All types from shared schemas
 */

export * from './bulkOperationTypes';
export * from './colorSystemTypes';

// Re-export tube types from shared schemas
export type {
  TubeData,
  TubeLocation,
  TubeSample,
  TubeUpdateSample,
  TubeTimestamps,
  CreateTubeRequest,
  UpdateTubeRequest,
  ConcentrationUnit,
} from '@shared/types/Tube';

// Re-export domain constants
export { UNKNOWN_RESEARCHER } from '@shared/types/Tube';
