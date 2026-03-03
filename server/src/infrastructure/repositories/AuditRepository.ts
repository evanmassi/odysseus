import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { AuditRepository as IAuditRepository } from '@domain/repositories/AuditRepository';
import type { PaginatedResult, QueryOptions } from '@domain/types/repository';
import { PostgresContext } from '@infrastructure/database/PostgresContext';

/**
 * Explicit column list for audit_log table queries
 */
const AUDIT_LOG_COLUMNS = `
  id, user_id, username, action, entity_type, entity_id,
  details, timestamp, ip_address, user_agent, lab_id
`.trim();

/**
 * Database row structure for audit_log table
 */
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

/**
 * AuditRepository - Audit log persistence
 *
 * Provides efficient, indexed access to audit log data.
 * Immutable logs - no update operations supported.
 */
export class AuditRepository implements IAuditRepository {
  constructor(private context: PostgresContext) {}

  // WRITE OPERATIONS

  async save(entry: AuditLogEntry): Promise<void> {
    await this.context.execute(
      `INSERT INTO audit_log (
        id, user_id, username, action, entity_type, entity_id,
        details, timestamp, ip_address, user_agent, lab_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        entry.id,
        entry.userId,
        entry.username,
        entry.action,
        entry.entityType,
        entry.entityId || null,
        entry.details,
        entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
        entry.ipAddress || null,
        entry.userAgent || null,
        ('labId' in entry ? (entry as AuditLogEntry & { labId?: string }).labId : null) ?? null,
      ]
    );
  }

  async saveMany(entries: AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    await this.context.transaction(async (client) => {
      for (const entry of entries) {
        await client.query(
          `INSERT INTO audit_log (
            id, user_id, username, action, entity_type, entity_id,
            details, timestamp, ip_address, user_agent, lab_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            entry.id,
            entry.userId,
            entry.username,
            entry.action,
            entry.entityType,
            entry.entityId || null,
            entry.details,
            entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
            entry.ipAddress || null,
            entry.userAgent || null,
            ('labId' in entry ? (entry as AuditLogEntry & { labId?: string }).labId : null) ?? null,
          ]
        );
      }
    });
  }

  // READ OPERATIONS

  async findByUserId(userId: string, options?: QueryOptions): Promise<AuditLogEntry[]> {
    const whereClauses: string[] = ['user_id = $1'];
    const params: unknown[] = [userId];
    let paramIndex = 2;

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

  async findByEntityId(entityId: string, entityType: string): Promise<AuditLogEntry[]> {
    const rows = await this.context.queryMany<AuditLogRow>(
      `SELECT ${AUDIT_LOG_COLUMNS} FROM audit_log
       WHERE entity_id = $1 AND entity_type = $2
       ORDER BY timestamp DESC`,
      [entityId, entityType]
    );
    return rows.map(this.rowToEntry);
  }

  async findByAction(action: string, options?: QueryOptions): Promise<AuditLogEntry[]> {
    const whereClauses: string[] = ['action = $1'];
    const params: unknown[] = [action];
    let paramIndex = 2;

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

  async findAll(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>> {
    const whereClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

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

    const countQuery = `SELECT COUNT(*) as total FROM audit_log ${whereClause}`;
    const countRow = await this.context.queryOne<{ total: string }>(countQuery, params);
    const total = parseInt(countRow?.total || '0', 10);

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const dataQuery = `
      SELECT ${AUDIT_LOG_COLUMNS} FROM audit_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
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

  // LAB-SCOPED OPERATIONS

  async findAllForLab(filters: AuditLogFilters, labId: string): Promise<PaginatedResult<AuditLogEntry>> {
    const whereClauses: string[] = ['lab_id = $1'];
    const params: unknown[] = [labId];
    let paramIndex = 2;

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

    const whereClause = 'WHERE ' + whereClauses.join(' AND ');

    const countQuery = `SELECT COUNT(*) as total FROM audit_log ${whereClause}`;
    const countRow = await this.context.queryOne<{ total: string }>(countQuery, params);
    const total = parseInt(countRow?.total || '0', 10);

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const dataQuery = `
      SELECT ${AUDIT_LOG_COLUMNS} FROM audit_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
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
    const row = await this.context.queryOne<{ total: string }>(
      'SELECT COUNT(*) as total FROM audit_log'
    );
    return parseInt(row?.total || '0', 10);
  }

  async countInRange(dateFrom: Date, dateTo: Date): Promise<number> {
    const row = await this.context.queryOne<{ total: string }>(
      'SELECT COUNT(*) as total FROM audit_log WHERE timestamp >= $1 AND timestamp <= $2',
      [dateFrom, dateTo]
    );
    return parseInt(row?.total || '0', 10);
  }

  // ARCHIVAL OPERATIONS

  /**
   * Find entries older than specified date (for archival)
   */
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

  /**
   * Delete archived entries from active table (called after saveArchived)
   */
  async deleteArchived(entryIds: string[]): Promise<number> {
    if (entryIds.length === 0) return 0;

    const placeholders = entryIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `DELETE FROM audit_log WHERE id IN (${placeholders})`,
      entryIds
    );
    return result.rowCount ?? 0;
  }

  /**
   * Get active table statistics for monitoring
   */
  async getActiveTableMetrics(): Promise<{
    count: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    const countRow = await this.context.queryOne<{ total: string }>(
      'SELECT COUNT(*) as total FROM audit_log'
    );

    const oldestRow = await this.context.queryOne<{ oldest: Date | string | null }>(
      'SELECT MIN(timestamp) as oldest FROM audit_log'
    );

    const newestRow = await this.context.queryOne<{ newest: Date | string | null }>(
      'SELECT MAX(timestamp) as newest FROM audit_log'
    );

    return {
      count: parseInt(countRow?.total || '0', 10),
      oldestEntry: oldestRow?.oldest
        ? (oldestRow.oldest instanceof Date ? oldestRow.oldest : new Date(oldestRow.oldest))
        : null,
      newestEntry: newestRow?.newest
        ? (newestRow.newest instanceof Date ? newestRow.newest : new Date(newestRow.newest))
        : null,
    };
  }

  // PRIVATE HELPERS

  /**
   * Convert database row to domain object
   */
  private rowToEntry(row: AuditLogRow): AuditLogEntry {
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id || undefined,
      details: row.details,
      timestamp: row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
    };
  }
}
