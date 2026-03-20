/**
 * Security Monitoring Queries
 *
 * React Query hooks for security monitoring data.
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { securityMonitoringService } from '../services/SecurityMonitoringService';

import type {
  SecurityOverviewResponse,
  ActiveSessionsResponse,
  IpActivityResponse,
  FailedLoginsResponse,
} from '@odysseus/shared-schemas';

export function useSecurityOverviewQuery() {
  return useQuery<SecurityOverviewResponse>({
    queryKey: queryKeys.security.overview(),
    queryFn: () => securityMonitoringService.getSecurityOverview(),
    staleTime: 30_000,
  });
}

export function useActiveSessionsQuery() {
  return useQuery<ActiveSessionsResponse>({
    queryKey: queryKeys.security.sessions(),
    queryFn: () => securityMonitoringService.getActiveSessions(),
    staleTime: 30_000,
  });
}

export function useIpActivityQuery(startDate?: string, endDate?: string) {
  return useQuery<IpActivityResponse>({
    queryKey: queryKeys.security.ipActivity(startDate, endDate),
    queryFn: () => securityMonitoringService.getIpActivity(startDate, endDate),
    staleTime: 60_000,
    enabled: (!startDate && !endDate) || (!!startDate && !!endDate),
  });
}

export function useFailedLoginsQuery(limit?: number, startDate?: string, endDate?: string) {
  return useQuery<FailedLoginsResponse>({
    queryKey: queryKeys.security.failedLogins(limit, startDate, endDate),
    queryFn: () => securityMonitoringService.getFailedLogins(limit, startDate, endDate),
    staleTime: 60_000,
  });
}
