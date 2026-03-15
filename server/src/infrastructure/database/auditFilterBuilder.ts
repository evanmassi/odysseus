/**
 * Audit Filter Builder
 *
 * Shared WHERE clause construction for audit_log and audit_log_archive queries.
 */

import type { AuditLogFilters } from '@odysseus/shared-schemas';

export interface FilterResult {
  whereClause: string;
  params: unknown[];
  nextParamIndex: number;
}

export function buildAuditFilterClauses(
  filters: AuditLogFilters,
  initialClauses: string[] = [],
  initialParams: unknown[] = []
): FilterResult {
  const whereClauses = [...initialClauses];
  const params = [...initialParams];
  let paramIndex = initialParams.length + 1;

  if (filters.username) {
    whereClauses.push(`username = $${paramIndex++}`);
    params.push(filters.username);
  }

  if (filters.action) {
    whereClauses.push(`action = $${paramIndex++}`);
    params.push(filters.action);
  }

  if (filters.entityType) {
    whereClauses.push(`entity_type = $${paramIndex++}`);
    params.push(filters.entityType);
  }

  if (filters.dateFrom) {
    whereClauses.push(`timestamp >= $${paramIndex++}`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    whereClauses.push(`timestamp <= $${paramIndex++}`);
    params.push(filters.dateTo);
  }

  const whereClause = whereClauses.length > 0
    ? 'WHERE ' + whereClauses.join(' AND ')
    : '';

  return { whereClause, params, nextParamIndex: paramIndex };
}
