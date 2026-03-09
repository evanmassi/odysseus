/**
 * User Mutation Hooks
 *
 * React Query hooks for lab-admin user write operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { adminUserService } from '@domains/admin/services/AdminUserService';
import { logger } from '@infra/logger';

export function useDeactivateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminUserService.deactivateUser(userId);
      if (!response.success) throw new Error('Failed to deactivate user');
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
    onError: (error, userId) => {
      logger.error(`Failed to deactivate user ${userId}`, { error });
    },
  });
}

export function useActivateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminUserService.activateUser(userId);
      if (!response.success) throw new Error('Failed to activate user');
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
    onError: (error, userId) => {
      logger.error(`Failed to activate user ${userId}`, { error });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminUserService.deleteUser(userId);

      if (!response.success) {
        throw new Error('Failed to delete user');
      }

      return response;
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      // Server clears user assignments on deletion, so storage cache needs refresh
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.all });
    },

    onError: (error, userId) => {
      logger.error(`Failed to delete user ${userId}`, { error });
    },
  });
}
