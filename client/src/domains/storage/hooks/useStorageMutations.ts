/**
 * Storage Equipment CQRS Mutation Hooks
 *
 * React Query mutation hooks for atomic tank, rack, and box operations.
 * These hooks invalidate cache after server mutations instead of modifying local state.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { isOfflineError } from '@infra/api/httpClient';
import { isConflictError } from '@shared/errors';
import { logger } from '@shared/infrastructure/logger';
import { notifications } from '@shared/utils/notifications';

import { StorageService } from '../services/StorageService';

import type { GridConfiguration, PositionDisplayConfig } from '@odysseus/shared-schemas';

/** Show conflict error message and refresh cache. */
function handleConflictError(
  queryClient: ReturnType<typeof useQueryClient>,
  operation: string
): void {
  notifications.error(
    `${operation} failed: Configuration was modified by another user. Please review the latest changes and try again.`
  );
  void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
}

// Tank Mutations

/** Creates a new tank in the configuration. */
export const useAddTankMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'addTank'],
    mutationFn: ({ name, location }: { name: string; location?: string }) =>
      StorageService.addTank(name, location),

    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      notifications.success(`Tank "${variables.name}" added successfully`);
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Add tank');
        return;
      }
      logger.error('useAddTankMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to add tank: ${message}`);
    },
  });
};

/** Updates an existing tank's properties. */
export const useUpdateTankMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'updateTank'],
    mutationFn: ({
      tankId,
      updates,
    }: {
      tankId: string;
      updates: { name?: string; location?: string; isActive?: boolean };
    }) => StorageService.updateTank(tankId, updates),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      notifications.success('Tank updated successfully');
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Update tank');
        return;
      }
      logger.error('useUpdateTankMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to update tank: ${message}`);
    },
  });
};

/** Removes a tank. Blocks if tubes exist. */
export const useDeleteTankMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'deleteTank'],
    mutationFn: ({ tankId }: { tankId: string }) => StorageService.deleteTank(tankId),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      notifications.success('Tank deleted successfully');
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Delete tank');
        return;
      }
      logger.error('useDeleteTankMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to delete tank: ${message}`);
    },
  });
};

// Rack Mutations

/** Adds one or more racks to a tank. Use count > 1 for bulk add. */
export const useAddRacksMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'addRacks'],
    mutationFn: ({ tankId, count }: { tankId: string; count: number }) =>
      StorageService.addRacks(tankId, count),

    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      const message =
        variables.count === 1
          ? 'Rack added successfully'
          : `${variables.count} racks added successfully`;
      notifications.success(message);
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Add rack(s)');
        return;
      }
      logger.error('useAddRacksMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to add rack(s): ${message}`);
    },
  });
};

/** Updates an existing rack's properties. */
export const useUpdateRackMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'updateRack'],
    mutationFn: ({
      tankId,
      rackId,
      updates,
    }: {
      tankId: string;
      rackId: string;
      updates: { name?: string; capacity?: number; isActive?: boolean };
    }) => StorageService.updateRack(tankId, rackId, updates),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      notifications.success('Rack updated successfully');
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Update rack');
        return;
      }
      logger.error('useUpdateRackMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to update rack: ${message}`);
    },
  });
};

/** Removes a rack. Blocks if tubes exist. */
export const useDeleteRackMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'deleteRack'],
    mutationFn: ({ tankId, rackId }: { tankId: string; rackId: string }) =>
      StorageService.deleteRack(tankId, rackId),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      notifications.success('Rack deleted successfully');
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Delete rack');
        return;
      }
      logger.error('useDeleteRackMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to delete rack: ${message}`);
    },
  });
};

/** Assigns or unassigns a rack to/from a user. */
export const useAssignRackMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'assignRack'],
    mutationFn: ({
      tankId,
      rackId,
      assignedUserId,
    }: {
      tankId: string;
      rackId: string;
      assignedUserId: string | null;
    }) => StorageService.assignRack(tankId, rackId, assignedUserId),

    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      notifications.success(
        variables.assignedUserId ? 'Rack assigned successfully' : 'Rack unassigned successfully'
      );
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Assign rack');
        return;
      }
      logger.error('useAssignRackMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to assign rack: ${message}`);
    },
  });
};

// Box Mutations

/** Adds one or more boxes to a rack. Use count > 1 for bulk add. */
export const useAddBoxesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'addBoxes'],
    mutationFn: ({ tankId, rackId, count }: { tankId: string; rackId: string; count: number }) =>
      StorageService.addBoxes(tankId, rackId, count),

    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      const message =
        variables.count === 1
          ? 'Box added successfully'
          : `${variables.count} boxes added successfully`;
      notifications.success(message);
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Add box(es)');
        return;
      }
      logger.error('useAddBoxesMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to add box(es): ${message}`);
    },
  });
};

/** Updates an existing box's properties. */
export const useUpdateBoxMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'updateBox'],
    mutationFn: ({
      tankId,
      rackId,
      boxId,
      updates,
    }: {
      tankId: string;
      rackId: string;
      boxId: string;
      updates: {
        name?: string;
        gridConfig?: GridConfiguration;
        positionDisplay?: PositionDisplayConfig | null;
        isActive?: boolean;
      };
    }) => StorageService.updateBox(tankId, rackId, boxId, updates),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      notifications.success('Box updated successfully');
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Update box');
        return;
      }
      logger.error('useUpdateBoxMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to update box: ${message}`);
    },
  });
};

/** Removes a box. Blocks if tubes exist. */
export const useDeleteBoxMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'deleteBox'],
    mutationFn: ({ tankId, rackId, boxId }: { tankId: string; rackId: string; boxId: string }) =>
      StorageService.deleteBox(tankId, rackId, boxId),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      notifications.success('Box deleted successfully');
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Delete box');
        return;
      }
      logger.error('useDeleteBoxMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to delete box: ${message}`);
    },
  });
};

/** Assigns or unassigns a box to/from a user. */
export const useAssignBoxMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'assignBox'],
    mutationFn: ({
      tankId,
      rackId,
      boxId,
      assignedUserId,
    }: {
      tankId: string;
      rackId: string;
      boxId: string;
      assignedUserId: string | null;
    }) => StorageService.assignBox(tankId, rackId, boxId, assignedUserId),

    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      notifications.success(
        variables.assignedUserId ? 'Box assigned successfully' : 'Box unassigned successfully'
      );
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Assign box');
        return;
      }
      logger.error('useAssignBoxMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to assign box: ${message}`);
    },
  });
};

// Bulk Operations

/** Unassigns all resources from a user. Used when deactivating users. */
export const useBulkUnassignMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'bulkUnassign'],
    mutationFn: ({ fromUserId }: { fromUserId: string }) =>
      StorageService.bulkUnassignResources(fromUserId),

    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      const total = data.racksAffected + data.boxesAffected;
      if (total > 0) {
        notifications.success(
          `Unassigned ${data.racksAffected} rack(s) and ${data.boxesAffected} box(es)`
        );
      } else {
        notifications.info('No resources were assigned to this user');
      }
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Bulk unassign');
        return;
      }
      logger.error('useBulkUnassignMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to unassign resources: ${message}`);
    },
  });
};

/** Reassigns all resources from one user to another. */
export const useBulkReassignMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'bulkReassign'],
    mutationFn: ({ fromUserId, toUserId }: { fromUserId: string; toUserId: string }) =>
      StorageService.bulkReassignResources(fromUserId, toUserId),

    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      const total = data.racksAffected + data.boxesAffected;
      if (total > 0) {
        notifications.success(
          `Reassigned ${data.racksAffected} rack(s) and ${data.boxesAffected} box(es)`
        );
      } else {
        notifications.info('No resources were assigned to the source user');
      }
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Bulk reassign');
        return;
      }
      logger.error('useBulkReassignMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to reassign resources: ${message}`);
    },
  });
};

/** Creates initial configuration for a fresh install. */
export const useInitializeConfigurationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'initialize'],
    mutationFn: ({
      labName,
      tankCount,
      racksPerTank,
    }: {
      labName: string;
      tankCount: number;
      racksPerTank: number;
    }) => StorageService.initializeConfiguration(labName, tankCount, racksPerTank),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.exists() });
      notifications.success('Lab configuration initialized successfully');
    },

    onError: (error: unknown) => {
      if (isOfflineError(error)) return;
      if (isConflictError(error)) {
        handleConflictError(queryClient, 'Initialize configuration');
        return;
      }
      logger.error('useInitializeConfigurationMutation failed', { error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifications.error(`Failed to initialize configuration: ${message}`);
    },
  });
};
