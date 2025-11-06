import type { Database } from 'better-sqlite3';
import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { AuditRepository, PaginatedResult, QueryOptions } from '@domain/repositories/AuditRepository';
import { SQLiteContext } from '@infrastructure/database/SQLiteContext';
import { logger } from '@utils/logger';

/**
 * Database row structure for audit_log table
 */
interface AuditLogRow {
  id: string;
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * SQLite implementation of AuditRepository
 *
 * Provides efficient, indexed access to audit log data.
 * Immutable logs - no update operations supported.
 */
export class SQLiteAuditRepository implements AuditRepository {
  constructor(private context: SQLiteContext) {}

  // WRITE OPERATIONS

  async save(entry: AuditLogEntry): Promise<void> {
    await this.context.execute(
      `INSERT INTO audit_log (
        id, userId, username, action, entityType, entityId,
        details, timestamp, ipAddress, userAgent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.userId,
        entry.username,
        entry.action,
        entry.entityType,
        entry.entityId || null,
        entry.details,
        entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
        entry.ipAddress || null,
        entry.userAgent || null,
      ]
    );
  }

  async saveMany(entries: AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    // Use transaction for bulk insert
    const db = this.context.getDatabase();
    const insert = db.prepare(
      `INSERT INTO audit_log (
        id, userId, username, action, entityType, entityId,
        details, timestamp, ipAddress, userAgent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const transaction = db.transaction((entries: AuditLogEntry[]) => {
      for (const entry of entries) {
        insert.run(
          entry.id,
          entry.userId,
          entry.username,
          entry.action,
          entry.entityType,
          entry.entityId || null,
          entry.details,
          entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
          entry.ipAddress || null,
          entry.userAgent || null
        );
      }
    });

    transaction(entries);
  }

  // READ OPERATIONS

  async findByUserId(userId: string, options?: QueryOptions): Promise<AuditLogEntry[]> {
    let query = 'SELECT * FROM audit_log WHERE userId = ?';
    const params: any[] = [userId];

    // Add date range filtering
    if (options?.dateFrom) {
      query += ' AND timestamp >= ?';
      params.push(options.dateFrom.toISOString());
    }
    if (options?.dateTo) {
      query += ' AND timestamp <= ?';
      params.push(options.dateTo.toISOString());
    }

    // Order by timestamp descending (most recent first)
    query += ' ORDER BY timestamp DESC';

    // Add pagination
    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = await this.context.queryMany<AuditLogRow>(query, params);
    return rows.map(this.rowToEntry);
  }

  async findByEntityId(entityId: string, entityType: string): Promise<AuditLogEntry[]> {
    const rows = await this.context.queryMany<AuditLogRow>(
      `SELECT * FROM audit_log
       WHERE entityId = ? AND entityType = ?
       ORDER BY timestamp DESC`,
      [entityId, entityType]
    );
    return rows.map(this.rowToEntry);
  }

  async findByAction(action: string, options?: QueryOptions): Promise<AuditLogEntry[]> {
    let query = 'SELECT * FROM audit_log WHERE action = ?';
    const params: any[] = [action];

    // Add date range filtering
    if (options?.dateFrom) {
      query += ' AND timestamp >= ?';
      params.push(options.dateFrom.toISOString());
    }
    if (options?.dateTo) {
      query += ' AND timestamp <= ?';
      params.push(options.dateTo.toISOString());
    }

    query += ' ORDER BY timestamp DESC';

    // Add pagination
    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = await this.context.queryMany<AuditLogRow>(query, params);
    return rows.map(this.rowToEntry);
  }

  async findAll(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>> {
    // Build WHERE clause dynamically based on filters
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.username) {
      whereClauses.push('username = ?');
      params.push(filters.username);
    }

    if (filters.action) {
      whereClauses.push('action = ?');
      params.push(filters.action);
    }

    if (filters.entityType) {
      whereClauses.push('entityType = ?');
      params.push(filters.entityType);
    }

    if (filters.dateFrom) {
      whereClauses.push('timestamp >= ?');
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      whereClauses.push('timestamp <= ?');
      params.push(filters.dateTo);
    }

    const whereClause = whereClauses.length > 0
      ? 'WHERE ' + whereClauses.join(' AND ')
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM audit_log ${whereClause}`;
    const countRow = await this.context.queryOne<{ total: number }>(countQuery, params);
    const total = countRow?.total || 0;

    // Get paginated results
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const dataQuery = `
      SELECT * FROM audit_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
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
      'DELETE FROM audit_log WHERE timestamp < ?',
      [date.toISOString()]
    );
    return result.changes;
  }

  async count(): Promise<number> {
    const row = await this.context.queryOne<{ total: number }>(
      'SELECT COUNT(*) as total FROM audit_log'
    );
    return row?.total || 0;
  }

  async countInRange(dateFrom: Date, dateTo: Date): Promise<number> {
    const row = await this.context.queryOne<{ total: number }>(
      'SELECT COUNT(*) as total FROM audit_log WHERE timestamp >= ? AND timestamp <= ?',
      [dateFrom.toISOString(), dateTo.toISOString()]
    );
    return row?.total || 0;
  }

  // ARCHIVAL OPERATIONS

  /**
   * Find entries older than specified date (for archival)
   */
  async findOlderThan(date: Date, limit?: number): Promise<AuditLogEntry[]> {
    let query = 'SELECT * FROM audit_log WHERE timestamp < ? ORDER BY timestamp ASC';
    const params: any[] = [date.toISOString()];

    if (limit) {
      query += ' LIMIT ?';
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

    const placeholders = entryIds.map(() => '?').join(',');
    const result = await this.context.execute(
      `DELETE FROM audit_log WHERE id IN (${placeholders})`,
      entryIds
    );
    return result.changes;
  }

  /**
   * Get active table statistics for monitoring
   */
  async getActiveTableMetrics(): Promise<{
    count: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    const countRow = await this.context.queryOne<{ total: number }>(
      'SELECT COUNT(*) as total FROM audit_log'
    );

    const oldestRow = await this.context.queryOne<{ oldest: string }>(
      'SELECT MIN(timestamp) as oldest FROM audit_log'
    );

    const newestRow = await this.context.queryOne<{ newest: string }>(
      'SELECT MAX(timestamp) as newest FROM audit_log'
    );

    return {
      count: countRow?.total || 0,
      oldestEntry: oldestRow?.oldest ? new Date(oldestRow.oldest) : null,
      newestEntry: newestRow?.newest ? new Date(newestRow.newest) : null,
    };
  }

  // PRIVATE HELPERS

  /**
   * Convert database row to AuditLogEntry domain object
   */
  private rowToEntry(row: AuditLogRow): AuditLogEntry {
    return {
      id: row.id,
      userId: row.userId,
      username: row.username,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId || undefined,
      details: row.details,
      timestamp: new Date(row.timestamp),
      ipAddress: row.ipAddress || undefined,
      userAgent: row.userAgent || undefined,
    };
  }
}
