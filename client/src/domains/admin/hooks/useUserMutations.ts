/**
 * User Mutation Hooks
 *
 * React Query hooks for lab-admin user write operations.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { adminUserService } from '../services/AdminUserService';

import type { UserRole } from '@odysseus/shared-schemas';

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

export function useUpdateUserRoleMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      adminUserService.updateUserRole(userId, role),
    meta: { invalidates: [queryKeys.admin.users(labId)] },
  });
}

export function useLinkResearcherToUserMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ userId, researcherId }: { userId: string; researcherId: string }) =>
      adminUserService.linkResearcherToUser(userId, researcherId),
    meta: {
      invalidates: [
        queryKeys.admin.users(labId),
        queryKeys.admin.researchers(labId),
        queryKeys.admin.unlinkedResearchers(labId),
      ],
    },
  });
}

export function useResetUserPasswordMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({
      userId,
      newPassword,
      requirePasswordChange,
    }: {
      userId: string;
      newPassword: string;
      requirePasswordChange: boolean;
    }) => adminUserService.resetUserPassword(userId, newPassword, requirePasswordChange),
    meta: { invalidates: [queryKeys.admin.users(labId)] },
  });
}

export function useGeneratePasswordResetTokenMutation() {
  return useMutation({
    mutationFn: (userId: string) => adminUserService.generatePasswordResetToken(userId),
  });
}
