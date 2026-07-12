/**
 * Tube Mutation Hooks
 *
 * React Query hooks for tube write operations.
 */

import { formatStorageDisplayName } from '@odysseus/shared-schemas';
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { formatPositionForBox } from '@domains/storage';
// deep import: avoids @domains/tubes↔@domains/storage barrel cycle
import { getStorageDataFromCache } from '@domains/storage/hooks/useStorageData';
import { TubeService } from '@domains/tubes/services/TubeService';
import { isConflictError } from '@infra/api';
import { logger } from '@infra/logger';
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
  void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });
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
  void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });

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

      const previousTube = queryClient.getQueryData<TubeData>(queryKeys.tubes.detail(labId, id));

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
    },

    onError: (error, id, _context) => {
      logger.error(`Delete tube ${id} failed`, { error });
    },

    onSettled: (_data, _error, _id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });
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
      location?: { tankId: string; rackId: string; boxId: string };
    }
  > = {}
) => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: async ({ tubeIds, updates }) => {
      const bulkUpdateItems = tubeIds.map(id => ({
        id,
        data: updates,
      }));

      const result = await TubeService.bulkUpdateTubes(bulkUpdateItems);

      const errors = result.failed.map(f => ({
        tubeId: f.id,
        error: f.error,
      }));

      return {
        success: result.failed.length === 0,
        totalProcessed: tubeIds.length,
        successCount: result.updated.length,
        results: [],
        errors,
      } as BulkUpdateResult;
    },

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.donors.all(labId) });

      if (variables.location) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(
            labId,
            variables.location.tankId,
            variables.location.rackId,
            variables.location.boxId
          ),
        });
      }

      // Invalidate bulk query so the bulk editor refetches if still open
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tubes.bulk(labId, variables.tubeIds),
      });
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
      location?: { tankId: string; rackId: string; boxId: string };
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
        tubeId: f.id,
        error: f.error,
      }));

      return {
        success: result.failed.length === 0,
        totalProcessed: tubeIds.length,
        successCount: successfulIds.length,
        results: [
          ...successfulIds.map(id => ({ id, success: true })),
          ...result.failed.map(f => ({ id: f.id, success: false, error: f.error })),
        ],
        errors,
      };
    },

    onSuccess: (data, variables) => {
      const successfulIds = data.results.filter(result => result.success).map(result => result.id);

      successfulIds.forEach(id => {
        queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(labId, id) });
      });

      if (variables.location) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(
            labId,
            variables.location.tankId,
            variables.location.rackId,
            variables.location.boxId
          ),
        });
      }
    },

    onError: (error, _variables) => {
      logger.error('Bulk delete failed', { error });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });
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

      const tubesByBox = new Map<string, TubeData[]>();
      createdTubes.forEach(tube => {
        const key = `${tube.location.tankId}:${tube.location.rackId}:${tube.location.boxId}`;
        if (!tubesByBox.has(key)) tubesByBox.set(key, []);
        tubesByBox.get(key)!.push(tube);
      });

      for (const [key, newTubes] of tubesByBox) {
        const [tankId, rackId, boxId] = key.split(':');
        const queryKey = queryKeys.tubes.location(labId, tankId, rackId, boxId);
        queryClient.setQueryData<TubeData[]>(queryKey, old => {
          if (!old) return newTubes;
          const existingIds = new Set(old.map(t => t.id));
          const toAdd = newTubes.filter(t => !existingIds.has(t.id));
          return [...old, ...toAdd];
        });
      }

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });
    },

    ...options,
  });
};

export type MoveTubesResult = {
  moved: TubeData[];
  failed: Array<{ tubeId: string; error: string }>;
};

export const useMoveTubesMutation = (
  options: UseMutationOptions<
    MoveTubesResult,
    Error,
    {
      moves: Array<{
        tubeId: string;
        version: number;
        destination: { tankId: string; rackId: string; boxId: string; position: number };
      }>;
    },
    { snapshots: Map<string, TubeData[] | undefined> }
  > = {}
) => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: async ({ moves }) => {
      return await TubeService.bulkMoveTubes(moves);
    },

    onMutate: async ({ moves }) => {
      const affectedBoxKeys = new Set<string>();
      const moveMap = new Map(moves.map(m => [m.tubeId, m.destination]));

      moves.forEach(m => {
        affectedBoxKeys.add(
          `${m.destination.tankId}:${m.destination.rackId}:${m.destination.boxId}`
        );
      });

      const snapshots = new Map<string, TubeData[] | undefined>();

      for (const key of affectedBoxKeys) {
        const [tankId, rackId, boxId] = key.split(':');
        const queryKey = queryKeys.tubes.location(labId, tankId, rackId, boxId);
        await queryClient.cancelQueries({ queryKey });
        snapshots.set(key, queryClient.getQueryData<TubeData[]>(queryKey));
      }

      // Also snapshot source boxes by finding tubes in the cache
      for (const move of moves) {
        const allLocationQueries = queryClient.getQueriesData<TubeData[]>({
          queryKey: [...queryKeys.tubes.all(labId), 'location'],
        });
        for (const [key, data] of allLocationQueries) {
          if (data?.some(t => t.id === move.tubeId)) {
            const keyStr = (key as string[]).slice(3).join(':');
            if (!snapshots.has(keyStr)) {
              await queryClient.cancelQueries({ queryKey: key });
              snapshots.set(keyStr, data);
            }
          }
        }
      }

      // Optimistically remove from source and add to destination
      queryClient.setQueriesData(
        { queryKey: [...queryKeys.tubes.all(labId), 'location'] },
        (oldData: TubeData[] | undefined) => {
          if (!oldData) return oldData;
          return oldData
            .filter(tube => !moveMap.has(tube.id))
            .concat(
              oldData
                .filter(tube => moveMap.has(tube.id))
                .map(tube => {
                  const dest = moveMap.get(tube.id)!;
                  return { ...tube, location: { ...tube.location, ...dest } };
                })
                .filter(tube => {
                  const firstTube = oldData[0];
                  if (!firstTube) return false;
                  return (
                    tube.location.tankId === firstTube.location.tankId &&
                    tube.location.rackId === firstTube.location.rackId &&
                    tube.location.boxId === firstTube.location.boxId
                  );
                })
            );
        }
      );

      return { snapshots };
    },

    onSuccess: result => {
      result.moved.forEach(tube => {
        queryClient.setQueryData(queryKeys.tubes.detail(labId, tube.id), tube);
      });

      const boxes = new Set<string>();
      result.moved.forEach(tube => {
        boxes.add(`${tube.location.tankId}:${tube.location.rackId}:${tube.location.boxId}`);
      });
      for (const key of boxes) {
        const [tankId, rackId, boxId] = key.split(':');
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tubes.location(labId, tankId, rackId, boxId),
        });
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });

      if (result.failed.length > 0) {
        logger.warn('Move tubes partial failure', {
          moved: result.moved.length,
          failed: result.failed.length,
          errors: result.failed.map(f => f.error),
        });
      }
    },

    onError: (error, _variables, context) => {
      logger.error('Move tubes failed', { error });

      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          const [tankId, rackId, boxId] = key.split(':');
          queryClient.setQueryData(queryKeys.tubes.location(labId, tankId, rackId, boxId), data);
        }
      }
    },

    ...options,
  });
};
