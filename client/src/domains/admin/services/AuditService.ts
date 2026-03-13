/**
 * Audit Service
 *
 * Audit log querying, retention management, and archive operations.
 */

import {
  auditStatisticsSchema,
  auditSearchResponseSchema,
  retentionMetricsSchema,
  retentionPolicySchema,
  auditArchiveResponseSchema,
  auditLogEntrySchema,
  type AuditStatistics,
  type AuditSearchResponse,
  type RetentionMetrics,
  type RetentionPolicy,
  type AuditArchiveResponse,
  type AuditLogEntry,
  type AuditLogFilters,
} from '@odysseus/shared-schemas';
import { z } from 'zod';

import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';

import { buildAuditFilterParams } from '../utils/auditLogFilterParams';

export class AuditService {
  async getAuditStatistics(): Promise<AuditStatistics> {
    try {
      const data = await httpClient.getData(
        '/admin/audit/statistics',
        z.object({ statistics: auditStatisticsSchema })
      );
      return data.statistics;
    } catch (error) {
      logger.error('Failed to get audit statistics', { error });
      throw error;
    }
  }

  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    try {
      const data = await httpClient.getData(
        `/admin/audit/entity/${entityType}/${entityId}`,
        z.object({
          entries: z.array(auditLogEntrySchema),
          entityType: z.string(),
          entityId: z.string(),
        })
      );
      return data.entries;
    } catch (error) {
      logger.error('Failed to get entity history', { entityType, entityId, error });
      throw error;
    }
  }

  async searchAuditLogs(
    options: AuditLogFilters = {},
    includeArchive: boolean = false
  ): Promise<AuditSearchResponse> {
    try {
      const params = buildAuditFilterParams(options);
      params.append('includeArchive', includeArchive.toString());

      const query = params.toString() ? `?${params.toString()}` : '';

      return await httpClient.getData(`/admin/audit/search${query}`, auditSearchResponseSchema);
    } catch (error) {
      logger.error('Failed to search audit logs', { error });
      throw error;
    }
  }

  async getRetentionMetrics(): Promise<RetentionMetrics> {
    try {
      const data = await httpClient.getData(
        '/admin/audit/retention/metrics',
        z.object({ metrics: retentionMetricsSchema })
      );
      return data.metrics;
    } catch (error) {
      logger.error('Failed to get retention metrics', { error });
      throw error;
    }
  }

  async getRetentionPolicy(): Promise<RetentionPolicy> {
    try {
      const data = await httpClient.getData(
        '/admin/audit/retention/policy',
        z.object({ policy: retentionPolicySchema })
      );
      return data.policy;
    } catch (error) {
      logger.error('Failed to get retention policy', { error });
      throw error;
    }
  }

  async runManualArchival(): Promise<AuditArchiveResponse> {
    try {
      return await httpClient.postData(
        '/admin/audit/retention/archive',
        undefined,
        auditArchiveResponseSchema
      );
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
