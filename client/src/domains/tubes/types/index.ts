/**
 * Tubes Domain Types
 *
 * Local bulk/color-coding types and re-exports from shared schemas.
 */

export type LockVariant = 'own' | 'shared' | 'admin-override' | 'other';

export * from './bulkUpdateTypes';
export * from './clipboardTypes';
export * from './gridSelectionTypes';
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
} from '@odysseus/shared-schemas';

export { UNKNOWN_RESEARCHER } from '@odysseus/shared-schemas';
