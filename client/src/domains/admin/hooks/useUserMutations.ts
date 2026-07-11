/**
 * User Mutation Hooks
 *
 * React Query hooks for lab-admin user write operations.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { adminUserService } from '@domains/admin/services/AdminUserService';
import { useLabId } from '@domains/authentication';

export function useDeactivateUserMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.deactivateUser(userId),
    meta: { invalidates: [queryKeys.admin.users(labId)] },
  });
}

export function useActivateUserMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.activateUser(userId),
    meta: { invalidates: [queryKeys.admin.users(labId)] },
  });
}

export function useDeleteUserMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.deleteUser(userId),
    meta: {
      invalidates: [
        queryKeys.admin.users(labId),
        queryKeys.storage.all(labId),
        queryKeys.tubes.all(labId),
      ],
    },
  });
}

export function useUnlinkResearcherMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (userId: string) => adminUserService.unlinkResearcherFromUser(userId),
    meta: {
      invalidates: [
        queryKeys.admin.users(labId),
        queryKeys.storage.all(labId),
        queryKeys.tubes.all(labId),
      ],
    },
  });
}
