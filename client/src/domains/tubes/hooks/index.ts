/**
 * Tube Hooks Barrel Export
 *
 * Clean barrel exports for all tube-related React Query hooks.
 * Provides a single import point for all tube domain functionality.
 */

// Query hooks (read operations)
export {
  useTubes,
  useTubesByLocation,
  useTube,
  useInfiniteTubes,
  useSearchTubes,
  useBulkTubes,
  usePrefetchTubeLocation,
  useTubeStats,
} from './useTubeQueries';

// Mutation hooks (write operations)
export {
  useCreateTubeMutation,
  useUpdateTubeMutation,
  useDeleteTubeMutation,
  useBulkUpdateTubesMutation,
  useBulkDeleteTubesMutation,
} from './useTubeMutations';

// Lock mutation hooks
export {
  useLockTubesMutation,
  useUnlockTubesMutation,
  useShareTubeAccessMutation,
  useRevokeTubeAccessMutation,
} from './useTubeLockMutations';

// Lock access control hooks
export { useTubeAccessControl } from './useTubeAccessControl';

// Performance-optimized hooks
export {
  useVirtualizedTubes,
  useEssentialTubes,
  usePrefetchAdjacentLocations,
  useSmartPrefetch,
  useBackgroundRefresh,
  useQueryPerformanceMetrics,
} from './useOptimizedTubeQueries';

// Form hooks (public API - generic implementation is private)
export {
  useCreateTubeForm,
  useEditTubeForm,
  useTubeFormTransform,
  type TubeFormSubmissionResult,
  type SubmitContext,
} from './useTubeForm';
