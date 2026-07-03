/**
 * Audit Service
 *
 * Audit log querying, retention management, and archive operations.
 */

import {
  auditSearchResponseSchema,
  auditArchiveResponseSchema,
  retentionMetricsDataSchema,
  retentionPolicyDataSchema,
  type AuditSearchResponse,
  type RetentionMetrics,
  type RetentionPolicy,
  type AuditArchiveResponse,
  type AuditLogFilters,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

import { buildAuditFilterParams } from '../utils/auditLogFilterParams';

export class AuditService {
  async searchAuditLogs(
    options: AuditLogFilters = {},
    includeArchive: boolean = false
  ): Promise<AuditSearchResponse> {
    const params = buildAuditFilterParams(options);
    params.append('includeArchive', includeArchive.toString());

    const query = params.toString() ? `?${params.toString()}` : '';

    return await httpClient.getData(`/admin/audit/search${query}`, auditSearchResponseSchema);
  }

  async getRetentionMetrics(): Promise<RetentionMetrics> {
    const data = await httpClient.getData(
      '/admin/audit/retention/metrics',
      retentionMetricsDataSchema
    );
    return data.metrics;
  }

  async getRetentionPolicy(): Promise<RetentionPolicy> {
    const data = await httpClient.getData(
      '/admin/audit/retention/policy',
      retentionPolicyDataSchema
    );
    return data.policy;
  }

  async runManualArchival(): Promise<AuditArchiveResponse> {
    return await httpClient.postData(
      '/admin/audit/retention/archive',
      undefined,
      auditArchiveResponseSchema
    );
  }

  async exportArchivedLogs(dateFrom?: Date, dateTo?: Date): Promise<Blob> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
    if (dateTo) params.append('dateTo', dateTo.toISOString());

    const query = params.toString() ? `?${params.toString()}` : '';

    return await httpClient.getBlob(`/admin/audit/retention/export${query}`);
  }
}

export const auditService = new AuditService();
