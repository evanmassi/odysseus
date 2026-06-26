/**
 * Tube Hooks
 *
 * React Query hooks for tube data operations.
 */

// Query hooks
export {
  useTubesByLocation,
  useTubesByRack,
  useLocationCounts,
  useTube,
  useBulkTubes,
  useTubeFilterOptionsQuery,
} from './useTubeQueries';

// Mutation hooks
export {
  useCreateTubeMutation,
  useUpdateTubeMutation,
  useDeleteTubeMutation,
  useBulkUpdateTubesMutation,
  useBulkDeleteTubesMutation,
  usePasteTubesMutation,
  useMoveTubesMutation,
  type PasteTubesResult,
  type MoveTubesResult,
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

// Form hooks
export {
  useCreateTubeForm,
  useEditTubeForm,
  useTubeFormTransform,
  type TubeFormSubmissionResult,
  type SubmitContext,
} from './useTubeForm';

// Field resolver hooks
export {
  useTubeFieldResolver,
  TUBE_FIELD_PATHS,
  type FieldConflictAnalysis,
  type TubeFieldResolverResult,
} from './useTubeFieldResolver';
