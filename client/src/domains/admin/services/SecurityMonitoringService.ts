/**
 * Security Monitoring Service
 *
 * System admin API client for session/token monitoring and session management.
 */

import {
  securityOverviewResponseSchema,
  activeSessionsResponseSchema,
  ipActivityResponseSchema,
  purgeExpiredResponseSchema,
  bulkRevokeResponseSchema,
  failedLoginsResponseSchema,
  sessionActivityResponseSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

import type {
  SecurityOverviewResponse,
  ActiveSessionsResponse,
  IpActivityResponse,
  PurgeExpiredResponse,
  BulkRevokeResponse,
  FailedLoginsResponse,
  SessionActivityResponse,
} from '@odysseus/shared-schemas';

export class SecurityMonitoringService {
  async getSecurityOverview(): Promise<SecurityOverviewResponse> {
    return await httpClient.getData('/system/security/overview', securityOverviewResponseSchema);
  }

  async getActiveSessions(): Promise<ActiveSessionsResponse> {
    return await httpClient.getData('/system/security/sessions', activeSessionsResponseSchema);
  }

  async getIpActivity(startDate?: string, endDate?: string): Promise<IpActivityResponse> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    const url = `/system/security/ip-activity${query ? `?${query}` : ''}`;
    return await httpClient.getData(url, ipActivityResponseSchema);
  }

  async purgeExpiredSessions(): Promise<PurgeExpiredResponse> {
    return await httpClient.postData(
      '/system/security/purge-expired',
      undefined,
      purgeExpiredResponseSchema
    );
  }

  async revokeSession(sessionId: string): Promise<void> {
    await httpClient.post(`/system/security/sessions/${sessionId}/revoke`);
  }

  async getFailedLogins(
    limit?: number,
    startDate?: string,
    endDate?: string
  ): Promise<FailedLoginsResponse> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    const url = `/system/security/failed-logins${query ? `?${query}` : ''}`;
    return await httpClient.getData(url, failedLoginsResponseSchema);
  }

  async getSessionActivity(hours?: number): Promise<SessionActivityResponse> {
    const params = hours ? `?hours=${hours}` : '';
    return await httpClient.getData(
      `/system/security/session-activity${params}`,
      sessionActivityResponseSchema
    );
  }

  async bulkRevokeSessions(sessionIds: string[]): Promise<BulkRevokeResponse> {
    return await httpClient.postData(
      '/system/security/sessions/bulk-revoke',
      { sessionIds },
      bulkRevokeResponseSchema
    );
  }
}

export const securityMonitoringService = new SecurityMonitoringService();
