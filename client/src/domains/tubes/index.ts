/**
 * Public API for Tubes Domain
 * 
 * This file exports the public interface for the tubes domain,
 * following the principle of encapsulation where internal
 * implementation details are hidden.
 */

// UI Components - Public exports only
export { TubeInfoPanel } from './ui/components/grid/TubeInfoPanel';

// Store
export { useTubeStore } from './stores/tubeStore';

// Types - Re-export all domain types
export type { FieldResolver } from './types/FieldResolver';
export type { 
  TubeData, 
  TubeLocation, 
  TubeSample, 
  TubeTimestamps,
  TubeMedia,
  CreateTubeRequest,
  UpdateTubeRequest
} from './types';
export { UNKNOWN_RESEARCHER } from './types';

// React Query Hooks
export * from './hooks/useTubesQuery';
export {
  useCreateTubeForm,
  useEditTubeForm,
  useTubeFormTransform
} from './hooks/useTubeForm';

// Schemas
export * from '@odysseus/shared-schemas';
