/**
 * Admin Invite Code Mutations
 *
 * Create and deactivate invite codes for the current lab.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { adminService } from '../services/AdminService';

import type { CreateInviteCodeRequest } from '@odysseus/shared-schemas';

export function useCreateInviteCodeMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateInviteCodeRequest) => adminService.createInviteCode(data),
    meta: { invalidates: [queryKeys.admin.inviteCodes(labId)] },
  });
}

export function useDeactivateInviteCodeMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => adminService.deactivateInviteCode(id),
    meta: { invalidates: [queryKeys.admin.inviteCodes(labId)] },
  });
}
