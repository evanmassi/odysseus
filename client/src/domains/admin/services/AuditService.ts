/**
 * Audit Service
 *
 * Audit log querying, retention management, and archive operations.
 */

import { httpClient } from '@infra/api/httpClient';
import { logger } from '@shared/infrastructure/logger';

import { buildAuditFilterParams } from './buildAuditFilterParams';

import type { Pagination, RetentionMetrics, RetentionPolicy } from '../types/metrics';
import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';

export class AuditService {
  async getAuditStatistics(): Promise<{
    success: boolean;
    data: {
      totalEntries: number;
      entriesLast24h: number;
      entriesLast7d: number;
      topActions: Array<{ action: string; count: number }>;
      topUsers: Array<{ username: string; count: number }>;
      recentActivity: AuditLogEntry[];
    };
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          totalEntries: number;
          entriesLast24h: number;
          entriesLast7d: number;
          topActions: Array<{ action: string; count: number }>;
          topUsers: Array<{ username: string; count: number }>;
          recentActivity: AuditLogEntry[];
        };
      }>('/admin/audit/statistics');

      return response.data;
    } catch (error) {
      logger.error('Failed to get audit statistics', { error });
      throw error;
    }
  }

  async getEntityHistory(
    entityType: string,
    entityId: string
  ): Promise<{
    success: boolean;
    entries: AuditLogEntry[];
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        entries: AuditLogEntry[];
      }>(`/admin/audit/entity/${entityType}/${entityId}`);

      return response.data;
    } catch (error) {
      logger.error('Failed to get entity history', { entityType, entityId, error });
      throw error;
    }
  }

  async searchAuditLogs(
    options: AuditLogFilters = {},
    includeArchive: boolean = false
  ): Promise<{
    success: boolean;
    entries: AuditLogEntry[];
    pagination: Pagination;
  }> {
    try {
      const params = buildAuditFilterParams(options);
      params.append('includeArchive', includeArchive.toString());

      const query = params.toString() ? `?${params.toString()}` : '';

      const response = await httpClient.get<{
        success: boolean;
        data: {
          entries: AuditLogEntry[];
          pagination: Pagination;
          includeArchive: boolean;
        };
        meta?: { timing: number };
      }>(`/admin/audit/search${query}`);

      return {
        success: response.data.success,
        entries: response.data.data.entries,
        pagination: response.data.data.pagination,
      };
    } catch (error) {
      logger.error('Failed to search audit logs', { error });
      throw error;
    }
  }

  async getRetentionMetrics(): Promise<{
    success: boolean;
    data: RetentionMetrics;
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          metrics: RetentionMetrics;
        };
        meta?: { timing: number };
      }>('/admin/audit/retention/metrics');

      return {
        success: response.data.success,
        data: response.data.data.metrics,
      };
    } catch (error) {
      logger.error('Failed to get retention metrics', { error });
      throw error;
    }
  }

  async getRetentionPolicy(): Promise<{
    success: boolean;
    data: RetentionPolicy;
  }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: {
          policy: RetentionPolicy;
        };
        meta?: { timing: number };
      }>('/admin/audit/retention/policy');

      return {
        success: response.data.success,
        data: response.data.data.policy,
      };
    } catch (error) {
      logger.error('Failed to get retention policy', { error });
      throw error;
    }
  }

  async runManualArchival(): Promise<{
    success: boolean;
    data: {
      archived: number;
      deleted: number;
      message: string;
    };
  }> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: {
          archived: number;
          deleted: number;
          message: string;
        };
        meta?: { timing: number };
      }>('/admin/audit/retention/archive');

      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      logger.error('Failed to run manual archival', { error });
      throw error;
    }
  }

  async exportArchivedLogs(dateFrom?: Date, dateTo?: Date): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
      if (dateTo) params.append('dateTo', dateTo.toISOString());

      const query = params.toString() ? `?${params.toString()}` : '';

      return await httpClient.getBlob(`/admin/audit/retention/export${query}`);
    } catch (error) {
      logger.error('Failed to export archived logs', { error });
      throw error;
    }
  }
}

export const auditService = new AuditService();
