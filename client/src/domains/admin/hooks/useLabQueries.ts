/**
 * Lab Management Queries
 *
 * React Query hooks for reading lab, demo, and audit data (system admin only).
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { MS_PER_SECOND, MS_PER_MINUTE } from '@shared/utils';

import { labService } from '../services/LabService';

export function useLabsQuery() {
  return useQuery({
    queryKey: queryKeys.labs.list(),
    queryFn: () => labService.getLabs(),
    staleTime: MS_PER_MINUTE,
  });
}

export function useSystemOverviewQuery() {
  return useQuery({
    queryKey: queryKeys.labs.overview(),
    queryFn: () => labService.getSystemOverview(),
    staleTime: MS_PER_MINUTE,
  });
}

export function useLabDetailsQuery(labId: string | null) {
  return useQuery({
    queryKey: queryKeys.labs.labDetails(labId ?? ''),
    queryFn: () => labService.getLabDetails(labId!),
    enabled: !!labId,
    staleTime: 30 * MS_PER_SECOND,
  });
}

export function useDemoLimitsQuery(labId: string | null) {
  return useQuery({
    queryKey: queryKeys.labs.demoLimits(labId ?? ''),
    queryFn: () => labService.getDemoLimits(labId!),
    enabled: !!labId,
    staleTime: MS_PER_MINUTE,
  });
}
