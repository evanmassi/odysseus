/**
 * Storage Mutations
 *
 * React Query mutation hooks for tank, rack, and box operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { isConflictError } from '@infra/api';
import { notifications } from '@shared/utils/notifications';

import { StorageService } from '../services/StorageService';

import type { GridConfiguration } from '@odysseus/shared-schemas';

// Layout writes toast their errors through the global handler. The only local reaction is refetching
// the layout on a 409, so the next edit starts from whatever another user just changed.
function invalidateOnConflict(
  queryClient: ReturnType<typeof useQueryClient>,
  labId: string | undefined
) {
  return (error: unknown) => {
    if (isConflictError(error)) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
    }
  };
}

function notifyBulkAssignmentResult(
  result: { racksAffected: number; boxesAffected: number; protectedSkipped: number },
  summary: string,
  nothingMatched: string
) {
  const { racksAffected, boxesAffected, protectedSkipped } = result;
  const protectedNote =
    protectedSkipped === 1
      ? '1 demo record was protected and left in place'
      : `${protectedSkipped} demo records were protected and left in place`;

  if (racksAffected + boxesAffected === 0) {
    if (protectedSkipped > 0) {
      notifications.warning(`Nothing changed — ${protectedNote}`);
    } else {
      notifications.info(nothingMatched);
    }
    return;
  }

  if (protectedSkipped > 0) {
    notifications.warning(`${summary}. ${protectedNote}`);
  } else {
    notifications.success(summary);
  }
}

export const useAddTankMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationKey: ['storage', 'addTank'],
    mutationFn: ({ name }: { name: string }) => StorageService.addTank(name),

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifications.success(`Tank "${variables.name}" added successfully`);
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

export const useUpdateTankMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifications.success('Tank updated successfully');
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

/** Blocks if tubes exist. */
export const useDeleteTankMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationKey: ['storage', 'deleteTank'],
    mutationFn: ({ tankId }: { tankId: string }) => StorageService.deleteTank(tankId),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifications.success('Tank deleted successfully');
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

export const useAddRacksMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationKey: ['storage', 'addRacks'],
    mutationFn: ({ tankId, count }: { tankId: string; count: number }) =>
      StorageService.addRacks(tankId, count),

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      const message =
        variables.count === 1
          ? 'Rack added successfully'
          : `${variables.count} racks added successfully`;
      notifications.success(message);
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

export const useUpdateRackMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationKey: ['storage', 'updateRack'],
    mutationFn: ({
      tankId,
      rackId,
      updates,
    }: {
      tankId: string;
      rackId: string;
      updates: { name?: string; isActive?: boolean };
    }) => StorageService.updateRack(tankId, rackId, updates),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifications.success('Rack updated successfully');
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

/** Blocks if tubes exist. */
export const useDeleteRackMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationKey: ['storage', 'deleteRack'],
    mutationFn: ({ tankId, rackId }: { tankId: string; rackId: string }) =>
      StorageService.deleteRack(tankId, rackId),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifications.success('Rack deleted successfully');
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

export const useAssignRackMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifications.success(
        variables.assignedUserId ? 'Rack assigned successfully' : 'Rack unassigned successfully'
      );
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

export const useAddBoxesMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationKey: ['storage', 'addBoxes'],
    mutationFn: ({ tankId, rackId, count }: { tankId: string; rackId: string; count: number }) =>
      StorageService.addBoxes(tankId, rackId, count),

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      const message =
        variables.count === 1
          ? 'Box added successfully'
          : `${variables.count} boxes added successfully`;
      notifications.success(message);
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

export const useUpdateBoxMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

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
      updates: { gridConfig?: GridConfiguration };
    }) => StorageService.updateBox(tankId, rackId, boxId, updates),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifications.success('Box updated successfully');
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

/** Blocks if tubes exist. */
export const useDeleteBoxMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationKey: ['storage', 'deleteBox'],
    mutationFn: ({ tankId, rackId, boxId }: { tankId: string; rackId: string; boxId: string }) =>
      StorageService.deleteBox(tankId, rackId, boxId),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifications.success('Box deleted successfully');
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

export const useAssignBoxMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

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
      assignedUserId: string | null | undefined;
    }) => StorageService.assignBox(tankId, rackId, boxId, assignedUserId),

    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifications.success(
        variables.assignedUserId ? 'Box assigned successfully' : 'Box unassigned successfully'
      );
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

/** Used when deactivating users. */
export const useBulkUnassignMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationKey: ['storage', 'bulkUnassign'],
    mutationFn: ({ fromUserId }: { fromUserId: string }) =>
      StorageService.bulkUnassignResources(fromUserId),

    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifyBulkAssignmentResult(
        data,
        `Unassigned ${data.racksAffected} rack(s) and ${data.boxesAffected} box(es)`,
        'No resources were assigned to this user'
      );
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

export const useBulkReassignMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationKey: ['storage', 'bulkReassign'],
    mutationFn: ({ fromUserId, toUserId }: { fromUserId?: string; toUserId: string }) =>
      StorageService.bulkReassignResources(fromUserId, toUserId),

    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      notifyBulkAssignmentResult(
        data,
        `Reassigned ${data.racksAffected} rack(s) and ${data.boxesAffected} box(es)`,
        'There was nothing to reassign'
      );
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

/** For fresh installs only. */
export const useInitializeConfigurationMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

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
      if (labId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      }
      notifications.success('Lab configuration initialized successfully');
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};

export const useUpdateResourceLabelMutation = () => {
  const queryClient = useQueryClient();
  const labId = useLabId();

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
        queryKey: queryKeys.storage.data(labId),
      });
    },

    onError: invalidateOnConflict(queryClient, labId),
  });
};
