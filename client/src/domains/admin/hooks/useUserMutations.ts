/**
 * User Mutation Hooks
 *
 * React Query hooks for lab-admin user write operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { adminUserService } from '@domains/admin/services/AdminUserService';
import { useLabId } from '@domains/authentication';

export function useDeactivateUserMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.deactivateUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users(labId) });
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
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.deleteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.all(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });
    },
  });
}

export function useUnlinkResearcherMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.unlinkResearcherFromUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.all(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all(labId) });
    },
  });
}
