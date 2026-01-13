/**
 * Tube Mutation Hooks
 *
 * React Query hooks for tube write operations.
 *
 * - Uses TubeService
 * - Optimistic updates with rollback on error
 * - Smart cache invalidation and updates
 * - Consistent error handling and notifications
 */

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { TubeService } from '@domains/tubes/services/TubeService';
import { logger } from '@shared/infrastructure/logger';

import type {
  TubeData,
  CreateTubeRequest,
  UpdateTubeRequest,
  BulkUpdateResult,
} from '@domains/tubes/types';

// MUTATION HOOKS (WRITE OPERATIONS)

/**
 * Create new tube mutation
 */
export const useCreateTubeMutation = (
  options: UseMutationOptions<
    TubeData,
    Error,
    CreateTubeRequest,
    { previousTubes: unknown; newTube: CreateTubeRequest }
  > = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tubeData: CreateTubeRequest) => {
      return await TubeService.createTube(tubeData);
    },

    onMutate: async newTube => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.tubes.all });

      // Snapshot previous value for rollback
      const previousTubes = queryClient.getQueryData(queryKeys.tubes.all);

      return { previousTubes, newTube };
    },

    onSuccess: (tube, _variables, _context) => {
      // Add to individual tube cache
      queryClient.setQueryData(queryKeys.tubes.detail(tube.id), tube);

      // Invalidate and refetch tube lists to show new tube
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.lists() });

      // Invalidate location-specific queries
      if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(
            tube.location.tankId,
            tube.location.rackId,
            tube.location.boxId
          ),
        });
      }

      // Invalidate statistics
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },

    onError: (error, _variables, context) => {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('❌ [React Query] Create tube failed', { error });

      // Rollback optimistic updates if any were made
      if (context?.previousTubes) {
        queryClient.setQueryData(queryKeys.tubes.all, context.previousTubes);
      }
    },

    onSettled: () => {},

    ...options,
  });
};

/**
 * Update existing tube mutation
 */
export const useUpdateTubeMutation = (
  options: UseMutationOptions<
    TubeData,
    Error,
    { id: string; updates: UpdateTubeRequest },
    { previousTube: TubeData | undefined; id: string; updates: UpdateTubeRequest }
  > = {}
) => {
  const queryClient = useQueryClient();

  return useMutation<
    TubeData,
    Error,
    { id: string; updates: UpdateTubeRequest },
    { previousTube: TubeData | undefined; id: string; updates: UpdateTubeRequest }
  >({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTubeRequest }) => {
      return await TubeService.updateTube(id, updates);
    },

    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches for this tube
      await queryClient.cancelQueries({ queryKey: queryKeys.tubes.detail(id) });

      // Snapshot previous value for rollback
      const previousTube = queryClient.getQueryData<TubeData>(queryKeys.tubes.detail(id));

      // Skip optimistic update for PATCH operations with nullable fields
      // Server response will update cache with correct values

      return { previousTube, id, updates };
    },

    onSuccess: (tube, variables, context) => {
      // Update individual tube cache with server data
      queryClient.setQueryData(queryKeys.tubes.detail(tube.id), tube);

      // Update tube in list queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.lists() },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(t => (t.id === tube.id ? tube : t));
        }
      );

      // Update tube in location query cache for immediate feedback
      if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
        queryClient.setQueriesData(
          {
            queryKey: queryKeys.tubes.location(
              tube.location.tankId,
              tube.location.rackId,
              tube.location.boxId
            ),
          },
          (oldData: TubeData[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(t => (t.id === tube.id ? tube : t));
          }
        );
      }

      // Invalidate location queries if location changed
      const oldTube = context?.previousTube;
      if (oldTube) {
        // Invalidate old location
        if (
          oldTube.location.tankId &&
          oldTube.location.rackId !== undefined &&
          oldTube.location.boxId
        ) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.tubes.location(
              oldTube.location.tankId,
              oldTube.location.rackId,
              oldTube.location.boxId
            ),
          });
        }
      }

      // Invalidate new location
      if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(
            tube.location.tankId,
            tube.location.rackId,
            tube.location.boxId
          ),
        });
      }

      // Invalidate statistics
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },

    onError: (error, variables, context) => {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error(`❌ [React Query] Update tube ${variables.id} failed`, { error });

      // Rollback optimistic update
      if (context?.previousTube) {
        queryClient.setQueryData(queryKeys.tubes.detail(variables.id), context.previousTube);
      }
    },

    onSettled: (data, error, variables) => {
      // Always refetch the tube to ensure consistency
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.detail(variables.id) });
    },

    ...options,
  });
};

/**
 * Delete tube mutation
 */
export const useDeleteTubeMutation = (
  options: UseMutationOptions<
    void,
    Error,
    string,
    { previousTube: TubeData | undefined; id: string }
  > = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await TubeService.deleteTube(id);
    },

    onMutate: async id => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tubes.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tubes.lists() });

      // Snapshot previous tube for rollback
      const previousTube = queryClient.getQueryData<TubeData>(queryKeys.tubes.detail(id));

      // Optimistically remove from cache
      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.lists() },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(tube => tube.id !== id);
        }
      );

      return { previousTube, id };
    },

    onSuccess: (data, id, context) => {
      // Remove from all caches
      queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(id) });

      // Remove from list queries (should already be done by optimistic update)
      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.lists() },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(tube => tube.id !== id);
        }
      );

      // Invalidate location queries if we know the location
      if (context?.previousTube) {
        const tube = context.previousTube;
        if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.tubes.location(
              tube.location.tankId,
              tube.location.rackId,
              tube.location.boxId
            ),
          });
        }
      }

      // Invalidate statistics
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },

    onError: (error, id, context) => {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error(`❌ [React Query] Delete tube ${id} failed`, { error });

      // Rollback optimistic update - add tube back to lists
      if (context?.previousTube) {
        queryClient.setQueriesData(
          { queryKey: queryKeys.tubes.lists() },
          (oldData: TubeData[] | undefined) => {
            if (!oldData) return [context.previousTube];
            // Add back if not already there
            const exists = oldData.some(tube => tube.id === id);
            return exists ? oldData : [...oldData, context.previousTube];
          }
        );
      }
    },

    onSettled: (_data, _error, _id) => {
      // Refetch lists to ensure consistency
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.lists() });
    },

    ...options,
  });
};

/**
 * Bulk update tubes mutation
 */
export const useBulkUpdateTubesMutation = (
  options: UseMutationOptions<
    BulkUpdateResult,
    Error,
    {
      tubeIds: string[];
      updates: UpdateTubeRequest;
      onProgress?: (progress: { completed: number; total: number; currentId: string }) => void;
    }
  > = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tubeIds, updates, onProgress: _onProgress }) => {
      // Use the actual bulk update endpoint to get proper audit logging
      const bulkUpdateItems = tubeIds.map(id => ({
        id,
        data: updates,
      }));

      const result = await TubeService.bulkUpdateTubes(bulkUpdateItems);

      // Transform server response to BulkUpdateResult format
      const errors = result.failed.map(f => ({
        itemId: f.id,
        tubeId: f.id,
        error: f.error,
      }));

      return {
        success: result.success,
        totalProcessed: tubeIds.length,
        successCount: result.updated.length,
        successful: result.updated.length,
        failed: result.failed.length,
        errorCount: result.failed.length,
        total: tubeIds.length,
        results: [],
        errors: errors,
        duration: 0,
        response: {
          updated: result.updated.length,
          errors: errors,
        },
      } as BulkUpdateResult;
    },

    onSuccess: (_data, _variables) => {
      // Invalidate all tube queries - active queries will refetch immediately in background
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });

      // Invalidate statistics
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },

    onError: (error, _variables) => {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('❌ [React Query] Bulk update failed', { error });
    },

    onSettled: () => {},

    ...options,
  });
};

/**
 * Bulk delete tubes mutation
 *
 * New functionality - bulk delete operations
 */
export const useBulkDeleteTubesMutation = (
  options: UseMutationOptions<
    BulkUpdateResult,
    Error,
    {
      tubeIds: string[];
      onProgress?: (progress: { completed: number; total: number; currentId: string }) => void;
    }
  > = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tubeIds, onProgress }) => {
      const results: Array<{ id: string; success: boolean; error?: string }> = [];
      let successful = 0;
      let failed = 0;

      // Process tubes sequentially for deletes (safer)
      for (const id of tubeIds) {
        try {
          onProgress?.({ completed: results.length, total: tubeIds.length, currentId: id });

          await TubeService.deleteTube(id);

          successful++;
          results.push({ id, success: true });
        } catch (error: unknown) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ id, success: false, error: errorMessage });
          // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
          logger.error(`Failed to delete tube ${id}`, { error });
        }
      }

      return {
        success: successful > 0,
        totalProcessed: tubeIds.length,
        successCount: successful,
        successful,
        failed,
        errorCount: failed,
        total: tubeIds.length,
        results,
        errors: results
          .filter(r => !r.success)
          .map(r => ({
            itemId: r.id,
            tubeId: r.id,
            error: r.error ?? 'Unknown error',
          })),
        duration: 0, // Add proper timing if needed
      };
    },

    onSuccess: (data, _variables) => {
      // Remove successful deletes from cache
      const successfulIds = data.results.filter(result => result.success).map(result => result.id);

      // Remove from individual caches
      successfulIds.forEach(id => {
        queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(id) });
      });

      // Update list queries
      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.lists() },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(tube => !successfulIds.includes(tube.id));
        }
      );

      // Invalidate all queries that could be affected by the deletion
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },

    onError: (error, _variables) => {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('❌ [React Query] Bulk delete failed', { error });
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.lists() });
    },

    ...options,
  });
};

/** Result type for paste tubes operation */
export type PasteTubesResult = {
  success: boolean;
  created: TubeData[];
  failed: Array<{ index: number; request: CreateTubeRequest; error: string }>;
};

/**
 * Paste tubes mutation (bulk create at target positions)
 *
 * Handles both copy (duplicate data) and cut (recreate at new location).
 * Returns partial success info so caller can handle failures gracefully.
 */
export const usePasteTubesMutation = (
  options: UseMutationOptions<PasteTubesResult, Error, { tubes: CreateTubeRequest[] }> = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tubes }) => {
      return await TubeService.pasteTubes(tubes);
    },

    onSuccess: (result, _variables) => {
      const { created: createdTubes, failed } = result;

      // Add all created tubes to individual caches
      createdTubes.forEach(tube => {
        queryClient.setQueryData(queryKeys.tubes.detail(tube.id), tube);
      });

      // Invalidate all list queries to show new tubes
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.lists() });

      // Invalidate location-specific queries for all affected locations
      createdTubes.forEach(tube => {
        if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.tubes.location(
              tube.location.tankId,
              tube.location.rackId,
              tube.location.boxId
            ),
          });
        }
      });

      // Invalidate statistics
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });

      // Log partial failures for debugging
      if (failed.length > 0) {
        logger.warn('Paste tubes partial failure', {
          created: createdTubes.length,
          failed: failed.length,
          errors: failed.map(f => f.error),
        });
      }
    },

    onError: (error, _variables) => {
      logger.error('Paste tubes failed', { error });
    },

    onSettled: () => {
      // Refetch to ensure consistency
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.lists() });
    },

    ...options,
  });
};
