/**
 * Storage Analytics Queries
 *
 * React Query hooks for storage capacity and utilization data.
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { storageAnalyticsService } from '../services/StorageAnalyticsService';

import type {
  LabStorageAnalyticsResponse,
  CrossLabStorageAnalyticsResponse,
} from '@odysseus/shared-schemas';

export function useLabStorageAnalyticsQuery() {
  return useQuery<LabStorageAnalyticsResponse>({
    queryKey: queryKeys.storageAnalytics.lab('self'),
    queryFn: () => storageAnalyticsService.getLabAnalytics(),
    staleTime: 60_000,
  });
}

export function useLabStorageAnalyticsSystemQuery(labId: string) {
  return useQuery<LabStorageAnalyticsResponse>({
    queryKey: queryKeys.storageAnalytics.lab(labId),
    queryFn: () => storageAnalyticsService.getLabAnalyticsAsSystemAdmin(labId),
    staleTime: 60_000,
    enabled: !!labId,
  });
}

export function useCrossLabStorageAnalyticsQuery() {
  return useQuery<CrossLabStorageAnalyticsResponse>({
    queryKey: queryKeys.storageAnalytics.crossLab(),
    queryFn: () => storageAnalyticsService.getCrossLabAnalytics(),
    staleTime: 60_000,
  });
}
