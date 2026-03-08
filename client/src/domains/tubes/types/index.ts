/**
 * Tubes Domain Types
 *
 * Local bulk/color-coding types and re-exports from shared schemas.
 */

export * from './bulkUpdateTypes';
export * from './tubeColorCodingTypes';

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

export { UNKNOWN_RESEARCHER } from '@shared/types/Tube';
