/**
 * User Mutation Hooks
 *
 * React Query hooks for lab-admin user write operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { adminUserService } from '@domains/admin/services/AdminUserService';
import { useLabId } from '@domains/authentication';
import { logger } from '@infra/logger';

export function useDeactivateUserMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.deactivateUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users(labId) });
    },
    onError: (error, userId) => {
      logger.error(`Failed to deactivate user ${userId}`, { error });
    },
  });
}

export function useActivateUserMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.activateUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users(labId) });
    },
    onError: (error, userId) => {
      logger.error(`Failed to activate user ${userId}`, { error });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.deleteUser(userId),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users(labId) });
      // Server clears user assignments on deletion, so storage cache needs refresh
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.all(labId) });
    },

    onError: (error, userId) => {
      logger.error(`Failed to delete user ${userId}`, { error });
    },
  });
}
