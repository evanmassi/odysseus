/**
 * Tube Mutation Hooks
 *
 * React Query hooks for tube write operations.
 */

import { formatStorageDisplayName } from '@odysseus/shared-schemas';
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { getStorageDataFromCache } from '@domains/storage/hooks/useStorageData';
import { formatPositionForBox } from '@domains/storage/utils/positionDisplayUtils';
import { TubeService } from '@domains/tubes/services/TubeService';
import { logger } from '@infra/logger';
import { isConflictError } from '@shared/errors';
import { notifications } from '@shared/utils/notifications';

import type {
  TubeData,
  CreateTubeRequest,
  UpdateTubeRequest,
  BulkUpdateResult,
} from '@domains/tubes/types';

/** Check if error is a position-already-occupied error from server. */
function isPositionOccupiedError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const err = error as { details?: { body?: { details?: { code?: string } } } };
  return err.details?.body?.details?.code === 'POSITION_OCCUPIED';
}

/** Extract position info from position occupied error. */
function getPositionFromError(error: unknown): {
  tankId: string;
  rackId: string;
  boxId: string;
  position: number;
} | null {
  if (typeof error !== 'object' || error === null) return null;

  const err = error as {
    details?: {
      body?: {
        details?: { tankId?: string; rackId?: string; boxId?: string; position?: number };
      };
    };
  };
  const details = err.details?.body?.details;

  if (details?.tankId && details?.rackId && details?.boxId && details?.position !== undefined) {
    return {
      tankId: details.tankId,
      rackId: details.rackId,
      boxId: details.boxId,
      position: details.position,
    };
  }
  return null;
}

/** Format position with display names for user-friendly error message. */
function formatPositionDisplayString(
  queryClient: ReturnType<typeof useQueryClient>,
  labId: string | undefined,
  tankId: string,
  rackId: string,
  boxId: string,
  position: number
): string {
  const { currentLab } = getStorageDataFromCache(queryClient, labId);

  const tank = currentLab?.equipment.tanks.find(t => t.id === tankId);
  const rack = tank?.racks?.find(r => r.id === rackId);
  const box = rack?.boxes?.find(b => b.id === boxId);

  const tankName = tank?.name ?? tankId;
  const rackName = formatStorageDisplayName(rack?.name ?? rackId, rack?.customLabel);
  const boxName = formatStorageDisplayName(box?.name ?? boxId, box?.customLabel);

  let positionLabel = String(position);
  if (box?.gridConfig && currentLab) {
    try {
      positionLabel = formatPositionForBox(
        position,
        tankId,
        rackId,
        boxId,
        box.gridConfig,
        currentLab,
        null
      );
    } catch {
      // Fall back to numeric if formatting fails
    }
  }

  return `${tankName} → ${rackName} → ${boxName} → ${positionLabel}`;
}

/** Show position occupied error message and refresh cache. */
function handlePositionOccupiedError(
  queryClient: ReturnType<typeof useQueryClient>,
  labId: string | undefined,
  error: unknown
): void {
  const positionInfo = getPositionFromError(error);

  let message = 'Position already occupied';
  if (positionInfo) {
    const locationString = formatPositionDisplayString(
      queryClient,
      labId,
      positionInfo.tankId,
      positionInfo.rackId,
      positionInfo.boxId,
      positionInfo.position
    );
    message = `Position already occupied\n${locationString}`;
  }

  notifications.error(message);
  void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll(labId) });
}

/** Show conflict error message and refresh cache. */
function handleTubeConflictError(
  queryClient: ReturnType<typeof useQueryClient>,
  labId: string | undefined,
  tubeId: string
): void {
  notifications.error(
    'Update failed: This tube was modified by another user. Please review the latest changes and try again.'
  );
  void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.detail(labId, tubeId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll(labId) });
}

export const useCreateTubeMutation = (
  options: UseMutationOptions<
    TubeData,
    Error,
    CreateTubeRequest,
    { previousTubes: unknown; newTube: CreateTubeRequest }
  > = {}
) => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: async (tubeData: CreateTubeRequest) => {
      return await TubeService.createTube(tubeData);
    },

    onMutate: async newTube => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tubes.all(labId) });
      const previousTubes = queryClient.getQueryData(queryKeys.tubes.all(labId));

      return { previousTubes, newTube };
    },

    onSuccess: (tube, _variables, _context) => {
      queryClient.setQueryData(queryKeys.tubes.detail(labId, tube.id), tube);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll(labId) });

      if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(
            labId,
            tube.location.tankId,
            tube.location.rackId,
            tube.location.boxId
          ),
        });
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.donors.all(labId) });
    },

    onError: (error, _variables, context) => {
      logger.error('Create tube failed', { error });

      if (isPositionOccupiedError(error)) {
        handlePositionOccupiedError(queryClient, labId, error);
        return;
      }

      if (context?.previousTubes) {
        queryClient.setQueryData(queryKeys.tubes.all(labId), context.previousTubes);
      }
    },

    ...options,
  });
};

export const useUpdateTubeMutation = (
  options: UseMutationOptions<
    TubeData,
    Error,
    { id: string; updates: UpdateTubeRequest },
    { previousTube: TubeData | undefined; id: string; updates: UpdateTubeRequest }
  > = {}
) => {
  const queryClient = useQueryClient();
  const labId = useLabId();

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
      await queryClient.cancelQueries({ queryKey: queryKeys.tubes.detail(labId, id) });
      const previousTube = queryClient.getQueryData<TubeData>(queryKeys.tubes.detail(labId, id));

      // Skip optimistic update — PATCH with nullable fields needs server response for correct values

      return { previousTube, id, updates };
    },

    onSuccess: (tube, _variables, context) => {
      queryClient.setQueryData(queryKeys.tubes.detail(labId, tube.id), tube);

      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.listAll(labId) },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(t => (t.id === tube.id ? tube : t));
        }
      );

      if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
        queryClient.setQueriesData(
          {
            queryKey: queryKeys.tubes.location(
              labId,
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

      const oldTube = context?.previousTube;
      if (oldTube) {
        if (
          oldTube.location.tankId &&
          oldTube.location.rackId !== undefined &&
          oldTube.location.boxId
        ) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.tubes.location(
              labId,
              oldTube.location.tankId,
              oldTube.location.rackId,
              oldTube.location.boxId
            ),
          });
        }
      }

      if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(
            labId,
            tube.location.tankId,
            tube.location.rackId,
            tube.location.boxId
          ),
        });
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.donors.all(labId) });
    },

    onError: (error, variables, context) => {
      logger.error(`Update tube ${variables.id} failed`, { error });

      if (isConflictError(error)) {
        handleTubeConflictError(queryClient, labId, variables.id);
        return;
      }

      if (isPositionOccupiedError(error)) {
        handlePositionOccupiedError(queryClient, labId, error);
        return;
      }

      if (context?.previousTube) {
        queryClient.setQueryData(queryKeys.tubes.detail(labId, variables.id), context.previousTube);
      }
    },

    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.detail(labId, variables.id) });
    },

    ...options,
  });
};

export const useDeleteTubeMutation = (
  options: UseMutationOptions<
    void,
    Error,
    string,
    { previousTube: TubeData | undefined; id: string }
  > = {}
) => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: async (id: string) => {
      return await TubeService.deleteTube(id);
    },

    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tubes.detail(labId, id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tubes.listAll(labId) });

      const previousTube = queryClient.getQueryData<TubeData>(queryKeys.tubes.detail(labId, id));

      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.listAll(labId) },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(tube => tube.id !== id);
        }
      );

      return { previousTube, id };
    },

    onSuccess: (_data, id, context) => {
      queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(labId, id) });

      if (context?.previousTube) {
        const tube = context.previousTube;
        if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.tubes.location(
              labId,
              tube.location.tankId,
              tube.location.rackId,
              tube.location.boxId
            ),
          });
        }
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats(labId) });
    },

    onError: (error, id, context) => {
      logger.error(`Delete tube ${id} failed`, { error });

      if (context?.previousTube) {
        queryClient.setQueriesData(
          { queryKey: queryKeys.tubes.listAll(labId) },
          (oldData: TubeData[] | undefined) => {
            if (!oldData) return [context.previousTube];
            const exists = oldData.some(tube => tube.id === id);
            return exists ? oldData : [...oldData, context.previousTube];
          }
        );
      }
    },

    onSettled: (_data, _error, _id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll(labId) });
    },

    ...options,
  });
};

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
  const labId = useLabId();

  return useMutation({
    mutationFn: async ({ tubeIds, updates }) => {
      // Uses bulk endpoint instead of individual updates for proper audit logging
      const bulkUpdateItems = tubeIds.map(id => ({
        id,
        data: updates,
      }));

      const result = await TubeService.bulkUpdateTubes(bulkUpdateItems);

      const errors = result.failed.map(f => ({
        itemId: f.id,
        tubeId: f.id,
        error: f.error,
      }));

      return {
        success: result.failed.length === 0,
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.donors.all(labId) });
    },

    onError: (error, _variables) => {
      logger.error('Bulk update failed', { error });
    },

    ...options,
  });
};

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
  const labId = useLabId();

  return useMutation({
    mutationFn: async ({ tubeIds, onProgress }) => {
      onProgress?.({ completed: 0, total: tubeIds.length, currentId: tubeIds[0] });

      const result = await TubeService.bulkDeleteTubes(tubeIds);

      onProgress?.({
        completed: tubeIds.length,
        total: tubeIds.length,
        currentId: tubeIds[tubeIds.length - 1],
      });

      const successfulIds = result.deleted;
      const errors = result.failed.map(f => ({
        itemId: f.id,
        tubeId: f.id,
        error: f.error,
      }));

      return {
        success: result.failed.length === 0,
        totalProcessed: tubeIds.length,
        successCount: successfulIds.length,
        successful: successfulIds.length,
        failed: result.failed.length,
        errorCount: result.failed.length,
        total: tubeIds.length,
        results: [
          ...successfulIds.map(id => ({ id, success: true })),
          ...result.failed.map(f => ({ id: f.id, success: false, error: f.error })),
        ],
        errors,
        duration: 0,
      };
    },

    onSuccess: (data, _variables) => {
      const successfulIds = data.results.filter(result => result.success).map(result => result.id);

      successfulIds.forEach(id => {
        queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(labId, id) });
      });

      queryClient.setQueriesData(
        { queryKey: queryKeys.tubes.listAll(labId) },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(tube => !successfulIds.includes(tube.id));
        }
      );

      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats(labId) });
    },

    onError: (error, _variables) => {
      logger.error('Bulk delete failed', { error });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll(labId) });
    },

    ...options,
  });
};

export type PasteTubesResult = {
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
  const labId = useLabId();

  return useMutation({
    mutationFn: async ({ tubes }) => {
      return await TubeService.pasteTubes(tubes);
    },

    onSuccess: (result, _variables) => {
      const { created: createdTubes, failed } = result;

      createdTubes.forEach(tube => {
        queryClient.setQueryData(queryKeys.tubes.detail(labId, tube.id), tube);
      });

      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll(labId) });

      createdTubes.forEach(tube => {
        if (tube.location.tankId && tube.location.rackId !== undefined && tube.location.boxId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.tubes.location(
              labId,
              tube.location.tankId,
              tube.location.rackId,
              tube.location.boxId
            ),
          });
        }
      });

      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.donors.all(labId) });

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.listAll(labId) });
    },

    ...options,
  });
};
