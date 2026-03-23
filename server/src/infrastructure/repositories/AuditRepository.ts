/**
 * Audit Log Repository
 *
 * Immutable audit log persistence with indexed access and archival support.
 */

import type { AuditRepository as IAuditRepository } from '@domain/repositories/AuditRepository';
import type { PaginatedResult, QueryOptions } from '@domain/types/repository';
import { buildAuditFilterClauses, DEFAULT_AUDIT_PAGE_LIMIT, type FilterResult } from '@infrastructure/database/auditFilterBuilder';
import { parseCount, toDate } from '@infrastructure/database/PostgresContext';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';

const AUDIT_LOG_COLUMNS = `
  id, user_id, username, action, entity_type, entity_id,
  details, timestamp, ip_address, user_agent, lab_id
`.trim();

const COLUMNS_PER_ROW = 11;


interface AuditLogRow {
  id: string;
  user_id: string;
  username: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string;
  timestamp: Date | string;
  ip_address: string | null;
  user_agent: string | null;
  lab_id: string | null;
}

export class AuditRepository implements IAuditRepository {
  constructor(private context: PostgresContext) {}

  // WRITE OPERATIONS

  async save(entry: AuditLogEntry): Promise<void> {
    await this.context.execute(
      `INSERT INTO audit_log (
        id, user_id, username, action, entity_type, entity_id,
        details, timestamp, ip_address, user_agent, lab_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      this.entryToParams(entry)
    );
  }

  async saveMany(entries: AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const params: unknown[] = [];
    const valueSets: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const offset = i * COLUMNS_PER_ROW;
      valueSets.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, ` +
        `$${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
      );
      params.push(...this.entryToParams(entries[i]));
    }

    await this.context.transaction(async (client) => {
      await client.query(
        `INSERT INTO audit_log (
          id, user_id, username, action, entity_type, entity_id,
          details, timestamp, ip_address, user_agent, lab_id
        ) VALUES ${valueSets.join(', ')}`,
        params
      );
    });
  }

  // READ OPERATIONS

  async findByUserId(userId: string, options?: QueryOptions): Promise<AuditLogEntry[]> {
    return this.findWithOptions(['user_id = $1'], [userId], options);
  }

  async findByEntityId(entityId: string, entityType: string): Promise<AuditLogEntry[]> {
    const rows = await this.context.queryMany<AuditLogRow>(
      `SELECT ${AUDIT_LOG_COLUMNS} FROM audit_log
       WHERE entity_id = $1 AND entity_type = $2
       ORDER BY timestamp DESC`,
      [entityId, entityType]
    );
    return rows.map(this.rowToEntry);
  }

  async findByEntityIdForLab(entityId: string, entityType: string, labId: string): Promise<AuditLogEntry[]> {
    const rows = await this.context.queryMany<AuditLogRow>(
      `SELECT ${AUDIT_LOG_COLUMNS} FROM audit_log
       WHERE entity_id = $1 AND entity_type = $2 AND lab_id = $3
       ORDER BY timestamp DESC`,
      [entityId, entityType, labId]
    );
    return rows.map(this.rowToEntry);
  }

  async findByAction(action: string, options?: QueryOptions): Promise<AuditLogEntry[]> {
    return this.findWithOptions(['action = $1'], [action], options);
  }

  async findAll(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>> {
    return this.findPaginated(filters, buildAuditFilterClauses(filters));
  }

  // LAB-SCOPED OPERATIONS

  async findAllForLab(filters: AuditLogFilters, labId: string): Promise<PaginatedResult<AuditLogEntry>> {
    return this.findPaginated(
      filters,
      buildAuditFilterClauses(filters, ['lab_id = $1'], [labId])
    );
  }

  // MAINTENANCE OPERATIONS

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.context.execute(
      'DELETE FROM audit_log WHERE timestamp < $1',
      [date]
    );
    return result.rowCount ?? 0;
  }

  async deleteByLabId(labId: string): Promise<number> {
    const result = await this.context.execute(
      'DELETE FROM audit_log WHERE lab_id = $1',
      [labId]
    );
    return result.rowCount ?? 0;
  }

  async count(): Promise<number> {
    const row = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM audit_log'
    );
    return parseCount(row);
  }

  async countForLab(labId: string): Promise<number> {
    const row = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM audit_log WHERE lab_id = $1',
      [labId]
    );
    return parseCount(row);
  }

  async countInRange(dateFrom: Date, dateTo: Date): Promise<number> {
    const row = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM audit_log WHERE timestamp >= $1 AND timestamp <= $2',
      [dateFrom, dateTo]
    );
    return parseCount(row);
  }

  async countInRangeForLab(dateFrom: Date, dateTo: Date, labId: string): Promise<number> {
    const row = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM audit_log WHERE timestamp >= $1 AND timestamp <= $2 AND lab_id = $3',
      [dateFrom, dateTo, labId]
    );
    return parseCount(row);
  }

  // ARCHIVAL OPERATIONS

  async findOlderThan(date: Date, limit?: number): Promise<AuditLogEntry[]> {
    let query = `SELECT ${AUDIT_LOG_COLUMNS} FROM audit_log WHERE timestamp < $1 ORDER BY timestamp ASC`;
    const params: unknown[] = [date];

    if (limit) {
      query += ' LIMIT $2';
      params.push(limit);
    }

    const rows = await this.context.queryMany<AuditLogRow>(query, params);
    return rows.map(this.rowToEntry);
  }

  async deleteArchived(entryIds: string[]): Promise<number> {
    if (entryIds.length === 0) return 0;

    const placeholders = entryIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `DELETE FROM audit_log WHERE id IN (${placeholders})`,
      entryIds
    );
    return result.rowCount ?? 0;
  }

  async getActiveTableMetrics(): Promise<{
    count: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    const row = await this.context.queryOne<{
      count: string;
      oldest: Date | string | null;
      newest: Date | string | null;
    }>(
      'SELECT COUNT(*) as count, MIN(timestamp) as oldest, MAX(timestamp) as newest FROM audit_log'
    );

    return {
      count: parseCount(row),
      oldestEntry: row?.oldest ? toDate(row.oldest) : null,
      newestEntry: row?.newest ? toDate(row.newest) : null,
    };
  }

  // PRIVATE HELPERS

  private entryToParams(entry: AuditLogEntry): unknown[] {
    return [
      entry.id,
      entry.userId,
      entry.username,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.details,
      toDate(entry.timestamp),
      entry.ipAddress ?? null,
      entry.userAgent ?? null,
      entry.labId ?? null,
    ];
  }

  private async findPaginated(filters: AuditLogFilters, filterResult: FilterResult): Promise<PaginatedResult<AuditLogEntry>> {
    const { whereClause, params, nextParamIndex } = filterResult;

    const countQuery = `SELECT COUNT(*) as count FROM audit_log ${whereClause}`;
    const countRow = await this.context.queryOne<{ count: string }>(countQuery, params);
    const total = parseCount(countRow);

    const limit = filters.limit ?? DEFAULT_AUDIT_PAGE_LIMIT;
    const offset = filters.offset ?? 0;

    const dataQuery = `
      SELECT ${AUDIT_LOG_COLUMNS} FROM audit_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}
    `;

    const rows = await this.context.queryMany<AuditLogRow>(
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

  private async findWithOptions(
    initialClauses: string[],
    initialParams: unknown[],
    options?: QueryOptions
  ): Promise<AuditLogEntry[]> {
    const whereClauses = [...initialClauses];
    const params = [...initialParams];
    let paramIndex = initialParams.length + 1;

    if (options?.dateFrom) {
      whereClauses.push(`timestamp >= $${paramIndex++}`);
      params.push(options.dateFrom);
    }
    if (options?.dateTo) {
      whereClauses.push(`timestamp <= $${paramIndex++}`);
      params.push(options.dateTo);
    }

    let query = `SELECT ${AUDIT_LOG_COLUMNS} FROM audit_log WHERE ${whereClauses.join(' AND ')} ORDER BY timestamp DESC`;

    if (options?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }
    if (options?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    const rows = await this.context.queryMany<AuditLogRow>(query, params);
    return rows.map(this.rowToEntry);
  }

  private rowToEntry(row: AuditLogRow): AuditLogEntry {
    return {
      id: row.id,
      labId: row.lab_id ?? undefined,
      userId: row.user_id,
      username: row.username,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id ?? undefined,
      details: row.details,
      timestamp: toDate(row.timestamp),
      ipAddress: row.ip_address ?? undefined,
      userAgent: row.user_agent ?? undefined,
    };
  }
}
