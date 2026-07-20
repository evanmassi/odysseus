/**
 * Admin Invite Codes Query
 *
 * Fetches the current lab's invite codes for admin management.
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@app/cache/queryClient';
import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { adminService } from '../services/AdminService';

export function useInviteCodesQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.admin.inviteCodes(labId),
    queryFn: () => adminService.getInviteCodes(),
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
