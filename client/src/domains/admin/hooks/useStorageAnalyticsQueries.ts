/**
 * Storage Analytics Queries
 *
 * React Query hooks for storage capacity and utilization data.
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { storageAnalyticsService } from '../services/StorageAnalyticsService';

export function useLabStorageAnalyticsQuery() {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.storageAnalytics.lab('self'),
    queryFn: () => storageAnalyticsService.getLabAnalytics(),
    enabled: !!labId,
    staleTime: 60_000,
  });
}

export function useLabStorageAnalyticsSystemQuery(labId: string) {
  return useQuery({
    queryKey: queryKeys.storageAnalytics.lab(labId),
    queryFn: () => storageAnalyticsService.getLabAnalyticsAsSystemAdmin(labId),
    staleTime: 60_000,
    enabled: !!labId,
  });
}

export function useCrossLabStorageAnalyticsQuery() {
  return useQuery({
    queryKey: queryKeys.storageAnalytics.crossLab(),
    queryFn: () => storageAnalyticsService.getCrossLabAnalytics(),
    staleTime: 60_000,
  });
}
