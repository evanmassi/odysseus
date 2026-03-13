/**
 * Storage Mutations
 *
 * React Query mutation hooks for tank, rack, and box operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { isOfflineError } from '@infra/api';
import { logger } from '@infra/logger';
import { isConflictError } from '@shared/errors';
import { notifications } from '@shared/utils/notifications';

import { StorageService } from '../services/StorageService';

import type { GridConfiguration, PositionDisplayConfig } from '@odysseus/shared-schemas';

function handleConflictError(
  queryClient: ReturnType<typeof useQueryClient>,
  operation: string
): void {
  notifications.error(
    `${operation} failed: Configuration was modified by another user. Please review the latest changes and try again.`
  );
  void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
}

function createMutationErrorHandler(
  queryClient: ReturnType<typeof useQueryClient>,
  operation: string,
  errorLabel: string
) {
  return (error: unknown) => {
    if (isOfflineError(error)) return;
    if (isConflictError(error)) {
      handleConflictError(queryClient, operation);
      return;
    }
    logger.error(`${operation} failed`, { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    notifications.error(`${errorLabel}: ${message}`);
  };
}

// Tank Mutations

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

    onError: createMutationErrorHandler(queryClient, 'Add tank', 'Failed to add tank'),
  });
};

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

    onError: createMutationErrorHandler(queryClient, 'Update tank', 'Failed to update tank'),
  });
};

/** Blocks if tubes exist. */
export const useDeleteTankMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'deleteTank'],
    mutationFn: ({ tankId }: { tankId: string }) => StorageService.deleteTank(tankId),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data() });
      notifications.success('Tank deleted successfully');
    },

    onError: createMutationErrorHandler(queryClient, 'Delete tank', 'Failed to delete tank'),
  });
};

// Rack Mutations

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

    onError: createMutationErrorHandler(queryClient, 'Add rack(s)', 'Failed to add rack(s)'),
  });
};

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

    onError: createMutationErrorHandler(queryClient, 'Update rack', 'Failed to update rack'),
  });
};

/** Blocks if tubes exist. */
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

    onError: createMutationErrorHandler(queryClient, 'Delete rack', 'Failed to delete rack'),
  });
};

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

    onError: createMutationErrorHandler(queryClient, 'Assign rack', 'Failed to assign rack'),
  });
};

// Box Mutations

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

    onError: createMutationErrorHandler(queryClient, 'Add box(es)', 'Failed to add box(es)'),
  });
};

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

    onError: createMutationErrorHandler(queryClient, 'Update box', 'Failed to update box'),
  });
};

/** Blocks if tubes exist. */
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

    onError: createMutationErrorHandler(queryClient, 'Delete box', 'Failed to delete box'),
  });
};

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

    onError: createMutationErrorHandler(queryClient, 'Assign box', 'Failed to assign box'),
  });
};

// Bulk Operations

/** Used when deactivating users. */
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

    onError: createMutationErrorHandler(
      queryClient,
      'Bulk unassign',
      'Failed to unassign resources'
    ),
  });
};

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

    onError: createMutationErrorHandler(
      queryClient,
      'Bulk reassign',
      'Failed to reassign resources'
    ),
  });
};

/** For fresh installs only. */
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
      notifications.success('Lab configuration initialized successfully');
    },

    onError: createMutationErrorHandler(
      queryClient,
      'Initialize configuration',
      'Failed to initialize configuration'
    ),
  });
};

// Resource Label Mutations

export const useUpdateResourceLabelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'updateResourceLabel'],
    mutationFn: ({
      resourceType,
      tankId,
      rackId,
      boxId,
      customLabel,
    }: {
      resourceType: 'rack' | 'box';
      tankId: string;
      rackId: string;
      boxId?: string;
      customLabel?: string;
    }) => StorageService.updateResourceLabel(resourceType, tankId, rackId, boxId, customLabel),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.data(),
      });
    },

    onError: createMutationErrorHandler(queryClient, 'Update label', 'Failed to update label'),
  });
};
