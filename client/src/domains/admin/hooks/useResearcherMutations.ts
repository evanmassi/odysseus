/**
 * Admin Researcher Mutations
 *
 * Activate, deactivate, and delete researcher profiles. Shared by the settings researchers tab and
 * the system-dashboard lab view; the latter has no current lab, so the invalidation is a no-op
 * there and it refetches lab details through its own callback instead.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { adminResearcherService } from '../services/AdminResearcherService';

import type { CreateResearcherProfile } from '@odysseus/shared-schemas';

export function useActivateResearcherMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (researcherId: string) => adminResearcherService.activateResearcher(researcherId),
    meta: { invalidates: [queryKeys.admin.researchers(labId)] },
  });
}

export function useDeactivateResearcherMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (researcherId: string) => adminResearcherService.deactivateResearcher(researcherId),
    meta: { invalidates: [queryKeys.admin.researchers(labId)] },
  });
}

export function useDeleteResearcherMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (researcherId: string) => adminResearcherService.deleteResearcher(researcherId),
    meta: { invalidates: [queryKeys.admin.researchers(labId)] },
  });
}

export function useCreateResearcherMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateResearcherProfile) => adminResearcherService.createResearcher(data),
    meta: { invalidates: [queryKeys.admin.researchers(labId)] },
  });
}

export function useCreateAndLinkResearcherMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: CreateResearcherProfile }) =>
      adminResearcherService.createAndLinkResearcher(userId, data),
    meta: {
      invalidates: [
        queryKeys.admin.users(labId),
        queryKeys.admin.researchers(labId),
        queryKeys.admin.unlinkedResearchers(labId),
      ],
    },
  });
}
