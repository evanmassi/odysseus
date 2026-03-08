/**
 * Tube Hooks
 *
 * React Query hooks for tube data operations.
 */

// Query hooks
export { useTubes, useTubesByLocation, useTube, useBulkTubes } from './useTubeQueries';

// Mutation hooks
export {
  useCreateTubeMutation,
  useUpdateTubeMutation,
  useDeleteTubeMutation,
  useBulkUpdateTubesMutation,
  useBulkDeleteTubesMutation,
  usePasteTubesMutation,
  type PasteTubesResult,
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
export { useLookupValuesQuery } from './useTubeLookupValuesQuery';

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
