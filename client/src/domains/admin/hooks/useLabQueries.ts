/**
 * Lab Management Queries
 *
 * React Query hooks for reading lab, demo, and audit data (system admin only).
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { labService } from '../services/LabService';

import type { AuditLogFilters } from '@odysseus/shared-schemas';

export function useLabsQuery() {
  return useQuery({
    queryKey: queryKeys.labs.list(),
    queryFn: () => labService.getLabs(),
    staleTime: 60 * 1000,
  });
}

export function useSystemOverviewQuery() {
  return useQuery({
    queryKey: queryKeys.labs.overview(),
    queryFn: () => labService.getSystemOverview(),
    staleTime: 60 * 1000,
  });
}

export function useLabDetailsQuery(labId: string | null) {
  return useQuery({
    queryKey: queryKeys.labs.labDetails(labId ?? ''),
    queryFn: () => labService.getLabDetails(labId!),
    enabled: !!labId,
    staleTime: 30 * 1000,
  });
}

export function useDemoLimitsQuery(labId: string | null) {
  return useQuery({
    queryKey: queryKeys.labs.demoLimits(labId ?? ''),
    queryFn: () => labService.getDemoLimits(labId!),
    enabled: !!labId,
    staleTime: 60 * 1000,
  });
}

export function useLabAuditLogsQuery(
  labId: string | null,
  filters: AuditLogFilters = {},
  includeArchive: boolean = false
) {
  return useQuery({
    queryKey: [...queryKeys.labs.audit(labId ?? ''), filters, includeArchive],
    queryFn: () => labService.getLabAuditLog(labId!, filters, includeArchive),
    enabled: !!labId,
    staleTime: 30 * 1000,
  });
}
