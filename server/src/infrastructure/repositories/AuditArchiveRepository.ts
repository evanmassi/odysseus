/**
 * Audit Archive Repository
 *
 * Warm-storage data access for archived audit logs with minimal indexes.
 */

import type { AuditArchiveRepository as IAuditArchiveRepository } from '@domain/repositories/AuditArchiveRepository';
import type { PaginatedResult } from '@domain/types/repository';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';
import { logger } from '@infrastructure/logging/logger';

import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';

const AUDIT_ARCHIVE_COLUMNS = `
  id, user_id, username, action, entity_type, entity_id,
  lab_id, details, timestamp, ip_address, user_agent, archived_at
`.trim();

const COLUMNS_PER_ROW = 12;
const DEFAULT_PAGE_LIMIT = 50;

interface AuditArchiveRow {
  id: string;
  user_id: string;
  username: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  lab_id: string | null;
  details: string;
  timestamp: Date | string;
  ip_address: string | null;
  user_agent: string | null;
  archived_at: Date | string;
}

interface FilterResult {
  whereClause: string;
  params: unknown[];
  nextParamIndex: number;
}

export class AuditArchiveRepository implements IAuditArchiveRepository {
  constructor(private context: PostgresContext) {}

  async saveArchived(entries: AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const archivedAt = new Date();
    const params: unknown[] = [];
    const valueSets: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const offset = i * COLUMNS_PER_ROW;
      valueSets.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, ` +
        `$${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
      );
      params.push(
        entry.id,
        entry.userId,
        entry.username,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        entry.labId ?? null,
        entry.details,
        entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
        entry.ipAddress ?? null,
        entry.userAgent ?? null,
        archivedAt
      );
    }

    await this.context.transaction(async (client) => {
      await client.query(
        `INSERT INTO audit_log_archive (
          id, user_id, username, action, entity_type, entity_id,
          lab_id, details, timestamp, ip_address, user_agent, archived_at
        ) VALUES ${valueSets.join(', ')}`,
        params
      );
    });

    logger.info('Archived audit entries', { count: entries.length });
  }

  async findArchived(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>> {
    return this.findPaginated(filters, this.buildFilterClauses(filters));
  }

  async findArchivedForLab(filters: AuditLogFilters, labId: string): Promise<PaginatedResult<AuditLogEntry>> {
    return this.findPaginated(
      filters,
      this.buildFilterClauses(filters, ['lab_id = $1'], [labId])
    );
  }

  async countArchived(): Promise<number> {
    const row = await this.context.queryOne<{ total: string }>(
      'SELECT COUNT(*) as total FROM audit_log_archive'
    );
    return parseCount(row);
  }

  async getOldestArchivedTimestamp(): Promise<Date | null> {
    const row = await this.context.queryOne<{ oldest: Date | string | null }>(
      'SELECT MIN(timestamp) as oldest FROM audit_log_archive'
    );
    if (!row?.oldest) return null;
    return row.oldest instanceof Date ? row.oldest : new Date(row.oldest);
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.context.execute(
      'DELETE FROM audit_log_archive WHERE timestamp < $1',
      [date]
    );
    return result.rowCount ?? 0;
  }

  async exportToJSON(dateFrom?: Date, dateTo?: Date): Promise<string> {
    const { whereClause, params } = this.buildDateClauses(dateFrom, dateTo);

    const query = `SELECT ${AUDIT_ARCHIVE_COLUMNS} FROM audit_log_archive ${whereClause} ORDER BY timestamp DESC`;
    const rows = await this.context.queryMany<AuditArchiveRow>(query, params);

    return JSON.stringify(rows.map(this.rowToEntry), null, 2);
  }

  private buildFilterClauses(
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

  private buildDateClauses(dateFrom?: Date, dateTo?: Date): Omit<FilterResult, 'nextParamIndex'> {
    const whereClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (dateFrom) {
      whereClauses.push(`timestamp >= $${paramIndex++}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClauses.push(`timestamp <= $${paramIndex++}`);
      params.push(dateTo);
    }

    const whereClause = whereClauses.length > 0
      ? 'WHERE ' + whereClauses.join(' AND ')
      : '';

    return { whereClause, params };
  }

  private async findPaginated(filters: AuditLogFilters, filterResult: FilterResult): Promise<PaginatedResult<AuditLogEntry>> {
    const { whereClause, params, nextParamIndex } = filterResult;

    const countQuery = `SELECT COUNT(*) as total FROM audit_log_archive ${whereClause}`;
    const countRow = await this.context.queryOne<{ total: string }>(countQuery, params);
    const total = parseCount(countRow);

    const limit = filters.limit ?? DEFAULT_PAGE_LIMIT;
    const offset = filters.offset ?? 0;

    const dataQuery = `
      SELECT ${AUDIT_ARCHIVE_COLUMNS} FROM audit_log_archive
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}
    `;

    const rows = await this.context.queryMany<AuditArchiveRow>(
      dataQuery,
      [...params, limit, offset]
    );

    return {
      items: rows.map(this.rowToEntry),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + rows.length < total,
      },
    };
  }

  private rowToEntry(row: AuditArchiveRow): AuditLogEntry {
    return {
      id: row.id,
      labId: row.lab_id ?? undefined,
      userId: row.user_id,
      username: row.username,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id ?? undefined,
      details: row.details,
      timestamp: row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
      ipAddress: row.ip_address ?? undefined,
      userAgent: row.user_agent ?? undefined,
    };
  }
}

function parseCount(row: { total: string } | null): number {
  return parseInt(row?.total ?? '0', 10);
}
