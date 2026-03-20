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
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';

import type {
  SecurityOverviewResponse,
  ActiveSessionsResponse,
  IpActivityResponse,
  PurgeExpiredResponse,
} from '@odysseus/shared-schemas';

export class SecurityMonitoringService {
  async getSecurityOverview(): Promise<SecurityOverviewResponse> {
    try {
      return await httpClient.getData('/system/security/overview', securityOverviewResponseSchema);
    } catch (error) {
      logger.error('Failed to get security overview', { error });
      throw error;
    }
  }

  async getActiveSessions(): Promise<ActiveSessionsResponse> {
    try {
      return await httpClient.getData('/system/security/sessions', activeSessionsResponseSchema);
    } catch (error) {
      logger.error('Failed to get active sessions', { error });
      throw error;
    }
  }

  async getIpActivity(startDate?: string, endDate?: string): Promise<IpActivityResponse> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const query = params.toString();
      const url = `/system/security/ip-activity${query ? `?${query}` : ''}`;
      return await httpClient.getData(url, ipActivityResponseSchema);
    } catch (error) {
      logger.error('Failed to get IP activity', { error });
      throw error;
    }
  }

  async purgeExpiredSessions(): Promise<PurgeExpiredResponse> {
    try {
      return await httpClient.postData(
        '/system/security/purge-expired',
        undefined,
        purgeExpiredResponseSchema
      );
    } catch (error) {
      logger.error('Failed to purge expired sessions', { error });
      throw error;
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    try {
      await httpClient.post(`/system/security/sessions/${sessionId}/revoke`);
    } catch (error) {
      logger.error('Failed to revoke session', { sessionId, error });
      throw error;
    }
  }
}

export const securityMonitoringService = new SecurityMonitoringService();
