/**
 * Tube Hooks
 *
 * React Query hooks for tube data operations.
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

// Lookup hooks
export { useLookupValuesQuery } from './useLookupValuesQuery';

// Modal utilities
export { useTubeModalFocusReturn } from './useTubeModalFocusReturn';

// Form hooks (public API - generic implementation is private)
export {
  useCreateTubeForm,
  useEditTubeForm,
  useTubeFormTransform,
  type TubeFormSubmissionResult,
  type SubmitContext,
} from './useTubeForm';
