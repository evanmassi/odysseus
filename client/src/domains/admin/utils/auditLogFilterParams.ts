/**
 * Audit Filter Params Builder
 *
 * Builds URLSearchParams from AuditLogFilters for audit log API calls.
 */

import type { AuditLogFilters } from '@odysseus/shared-schemas';

export function buildAuditFilterParams(filters: AuditLogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
  if (filters.offset !== undefined) params.append('offset', filters.offset.toString());
  if (filters.username) params.append('username', filters.username);
  if (filters.action) params.append('action', filters.action);
  if (filters.entityType) params.append('entityType', filters.entityType);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  return params;
}
