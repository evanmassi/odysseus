/**
 * Optimistic Tube Mutations
 *
 * Tube mutations with instant UI feedback, rollback on error, and conflict resolution.
 */

import {
  type TubeData,
  type CreateTubeRequest,
  type UpdateTubeRequest,
  UNKNOWN_RESEARCHER,
} from '@odysseus/shared-schemas';
import { useQueryClient } from '@tanstack/react-query';

import {
  initializeOptimisticUpdates,
  ConflictResolution,
} from '@infra/optimistic/optimisticUpdates';

import { queryKeys } from '../../../infrastructure/socket/queryBridge';
import { TubeService } from '../services/TubeService';

/**
 * Enhanced create tube mutation with optimistic updates
 */
export function useOptimisticCreateTubeMutation() {
  const queryClient = useQueryClient();
  const optimisticService = initializeOptimisticUpdates(queryClient);

  return optimisticService.createOptimisticMutation<TubeData, Error, CreateTubeRequest>({
    mutationFn: async (tubeData: CreateTubeRequest) => {
      return await TubeService.createTube(tubeData);
    },

    optimisticUpdate: {
      queryKeys: [
        queryKeys.tubes.listAll() as unknown as string[],
        // Location-specific invalidation handled in updateFn
      ],
      updateFn: (variables: CreateTubeRequest, oldData: TubeData[] | undefined) => {
        const optimisticTube: TubeData = {
          ...variables,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- researcherId is required; empty string indicates missing data, use UNKNOWN_RESEARCHER
          researcherId: variables.researcherId || UNKNOWN_RESEARCHER,
          id: `temp-${Date.now()}`,
          timestamps: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          version: 1,
        };

        if (!oldData) return [optimisticTube];

        return [...oldData, optimisticTube];
      },
      generateTempId: () => `temp-tube-${Date.now()}-${Math.random()}`,
      conflictResolution: ConflictResolution.SERVER_WINS,
    },

    feedback: {
      loading: 'Creating tube...',
      success: 'Tube created successfully!',
      error: 'Failed to create tube. Please try again.',
      rollback: 'Tube creation failed. Changes have been reverted.',
    },

    onSuccess: () => {
      // Invalidate related queries to ensure consistency
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },
  });
}

/**
 * Enhanced update tube mutation with optimistic updates
 */
export function useOptimisticUpdateTubeMutation() {
  const queryClient = useQueryClient();
  const optimisticService = initializeOptimisticUpdates(queryClient);

  return optimisticService.createOptimisticMutation<
    TubeData,
    Error,
    { id: string; data: UpdateTubeRequest }
  >({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTubeRequest }) => {
      return await TubeService.updateTube(id, data);
    },

    optimisticUpdate: {
      queryKeys: [queryKeys.tubes.listAll() as unknown as string[]],
      updateFn: (
        { id, data }: { id: string; data: UpdateTubeRequest },
        oldData: TubeData[] | undefined
      ) => {
        if (!oldData) return oldData;

        return oldData.map(tube =>
          tube.id === id
            ? {
                ...tube,
                ...data,
                timestamps: {
                  ...tube.timestamps,
                  updatedAt: new Date(),
                },
              }
            : tube
        );
      },
      conflictResolution: ConflictResolution.MERGE_SMART,
    },

    feedback: {
      loading: 'Updating tube...',
      success: 'Tube updated successfully!',
      error: 'Failed to update tube. Please try again.',
      rollback: 'Update failed. Changes have been reverted.',
    },

    onSuccess: (data, variables) => {
      // Update individual tube cache
      queryClient.setQueryData(queryKeys.tubes.detail(variables.id), data);

      // Invalidate statistics if needed
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },
  });
}

/**
 * Enhanced delete tube mutation with optimistic updates
 */
export function useOptimisticDeleteTubeMutation() {
  const queryClient = useQueryClient();
  const optimisticService = initializeOptimisticUpdates(queryClient);

  return optimisticService.createOptimisticMutation<void, Error, string>({
    mutationFn: async (tubeId: string) => {
      await TubeService.deleteTube(tubeId);
    },

    optimisticUpdate: {
      queryKeys: [queryKeys.tubes.listAll() as unknown as string[]],
      updateFn: (tubeId: string, oldData: TubeData[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(tube => tube.id !== tubeId);
      },
      conflictResolution: ConflictResolution.CLIENT_WINS, // User intent to delete should be preserved
    },

    feedback: {
      loading: 'Deleting tube...',
      success: 'Tube deleted successfully!',
      error: 'Failed to delete tube. Please try again.',
      rollback: 'Delete failed. Tube has been restored.',
    },

    onSuccess: (_data, tubeId) => {
      // Remove from individual cache
      queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(tubeId) });

      // Invalidate location queries and statistics
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tubes.listAll(),
        predicate: query => {
          const key = query.queryKey as string[];
          return key.includes('location');
        },
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },
  });
}

/**
 * Enhanced batch tube operations with optimistic updates
 */
export function useOptimisticBatchTubesMutation() {
  const queryClient = useQueryClient();
  const optimisticService = initializeOptimisticUpdates(queryClient);

  return optimisticService.createOptimisticMutation<
    { success: boolean; count: number },
    Error,
    { operation: 'update' | 'delete'; tubeIds: string[]; data?: Partial<TubeData> }
  >({
    mutationFn: async ({ operation, tubeIds, data }) => {
      // Client-side batch operation using parallel execution
      if (operation === 'update' && data) {
        await Promise.all(tubeIds.map(id => TubeService.updateTube(id, data as UpdateTubeRequest)));
      } else if (operation === 'delete') {
        await Promise.all(tubeIds.map(id => TubeService.deleteTube(id)));
      } else {
        throw new Error('Invalid batch operation');
      }

      return {
        success: true,
        count: tubeIds.length,
      };
    },

    optimisticUpdate: {
      queryKeys: [queryKeys.tubes.listAll() as unknown as string[]],
      updateFn: ({ operation, tubeIds, data }, oldData: TubeData[] | undefined) => {
        if (!oldData) return oldData;

        if (operation === 'delete') {
          return oldData.filter(tube => !tubeIds.includes(tube.id));
        }

        if (operation === 'update' && data) {
          return oldData.map(tube =>
            tubeIds.includes(tube.id)
              ? {
                  ...tube,
                  ...data,
                  timestamps: {
                    ...tube.timestamps,
                    updatedAt: new Date(),
                  },
                }
              : tube
          );
        }

        return oldData;
      },
      conflictResolution: ConflictResolution.MERGE_SMART,
    },

    feedback: {
      loading: 'Processing batch operation...',
      success: 'Batch operation completed successfully!',
      error: 'Batch operation failed. Please try again.',
      rollback: 'Batch operation failed. Changes have been reverted.',
    },

    onSuccess: () => {
      // Invalidate all location queries and statistics
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tubes.listAll(),
        predicate: query => {
          const key = query.queryKey as string[];
          return key.includes('location');
        },
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },
  });
}

/**
 * Optimistic tube position move (for drag & drop)
 */
export function useOptimisticMoveTubeMutation() {
  const queryClient = useQueryClient();
  const optimisticService = initializeOptimisticUpdates(queryClient);

  return optimisticService.createOptimisticMutation<
    TubeData,
    Error,
    {
      tubeId: string;
      fromLocation: { tankId: string; rackId: string; boxId: string; position: number };
      toLocation: { tankId: string; rackId: string; boxId: string; position: number };
    }
  >({
    mutationFn: async ({ tubeId, toLocation }) => {
      return await TubeService.updateTube(tubeId, {
        location: toLocation,
      });
    },

    optimisticUpdate: {
      queryKeys: [
        queryKeys.tubes.listAll() as unknown as string[],
        // Location-specific invalidation handled in updateFn
      ],
      updateFn: ({ tubeId, toLocation }, oldData: TubeData[] | undefined) => {
        if (!oldData) return oldData;

        return oldData.map(tube =>
          tube.id === tubeId
            ? {
                ...tube,
                location: toLocation,
                timestamps: {
                  ...tube.timestamps,
                  updatedAt: new Date(),
                },
              }
            : tube
        );
      },
      conflictResolution: ConflictResolution.CLIENT_WINS, // User drag & drop intent should be preserved
    },

    feedback: {
      loading: 'Moving tube...',
      success: 'Tube moved successfully!',
      error: 'Failed to move tube. Please try again.',
      rollback: 'Move failed. Tube position has been restored.',
    },

    onSuccess: (data, variables) => {
      // Update individual tube cache
      queryClient.setQueryData(queryKeys.tubes.detail(variables.tubeId), data);
    },
  });
}

/**
 * Hook to get optimistic mutations status
 */
export function useOptimisticMutationsStatus() {
  const optimisticService = initializeOptimisticUpdates(useQueryClient());

  return {
    pendingCount: optimisticService.getPendingMutationsCount(),
    pendingMutations: optimisticService.getPendingMutations(),
    cancelAll: () => optimisticService.cancelAllOptimisticUpdates(),
  };
}
