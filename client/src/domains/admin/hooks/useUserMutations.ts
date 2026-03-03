/**
 * User Mutation Hooks
 *
 * React Query hooks for user write operations (admin only).
 *
 * - Uses AdminService for API calls
 * - Handles cache invalidation for related queries (users, storage)
 * - Consistent error handling
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { adminService } from '@domains/admin/services/AdminService';
import { logger } from '@shared/infrastructure/logger';

/**
 * Delete user mutation
 *
 * Deletes a user and invalidates related caches:
 * - Admin users list (to refresh the user table)
 * - Storage configuration (user assignments are cleared server-side)
 *
 * @example
 * ```tsx
 * const deleteUser = useDeleteUserMutation();
 *
 * const handleDelete = (userId: string) => {
 *   deleteUser.mutate(userId, {
 *     onSuccess: () => notifications.success('User deleted'),
 *     onError: () => notifications.error('Failed to delete user'),
 *   });
 * };
 * ```
 */
export const useDeactivateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminService.deactivateUser(userId);
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
};

export const useActivateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminService.activateUser(userId);
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
};

export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminService.deleteUser(userId);

      if (!response.success) {
        throw new Error('Failed to delete user');
      }

      return response;
    },

    onSuccess: () => {
      // Invalidate admin users list to refresh the table
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });

      // Invalidate storage configuration
      // Server clears user assignments on deletion, so storage cache needs refresh
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.all });
    },

    onError: (error, userId) => {
      logger.error(`Failed to delete user ${userId}`, { error });
    },
  });
};
