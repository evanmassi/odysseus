/**
 * Security Monitoring Queries
 *
 * React Query hooks for security monitoring data.
 */

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { securityMonitoringService } from '../services/SecurityMonitoringService';

export function useSecurityOverviewQuery() {
  return useQuery({
    queryKey: queryKeys.security.overview(),
    queryFn: () => securityMonitoringService.getSecurityOverview(),
    staleTime: 30_000,
  });
}

export function useActiveSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.security.sessions(),
    queryFn: () => securityMonitoringService.getActiveSessions(),
    staleTime: 30_000,
  });
}

export function useIpActivityQuery(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.security.ipActivity(startDate, endDate),
    queryFn: () => securityMonitoringService.getIpActivity(startDate, endDate),
    staleTime: 60_000,
    enabled: (!startDate && !endDate) || (!!startDate && !!endDate),
  });
}

export function useFailedLoginsQuery(limit?: number, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.security.failedLogins(limit, startDate, endDate),
    queryFn: () => securityMonitoringService.getFailedLogins(limit, startDate, endDate),
    staleTime: 60_000,
  });
}

export function useSessionActivityQuery(hours?: number) {
  return useQuery({
    queryKey: queryKeys.security.sessionActivity(hours),
    queryFn: () => securityMonitoringService.getSessionActivity(hours),
    staleTime: 60_000,
  });
}
