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
  filters.action?.forEach(action => params.append('action', action));
  filters.entityType?.forEach(entityType => params.append('entityType', entityType));
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  return params;
}
