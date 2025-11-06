import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { PaginatedResult } from '@domain/repositories/AuditRepository';
import { SQLiteContext } from '@infrastructure/database/SQLiteContext';
import { logger } from '@utils/logger';

/**
 * Database row structure for audit_log_archive table
 */
interface AuditArchiveRow {
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
  archivedAt: string;
}

/**
 * Audit Archive Repository
 *
 * Data access layer for archived audit logs (warm storage).
 * Minimal indexes for basic timestamp/user queries only.
 */
export class AuditArchiveRepository {
  constructor(private context: SQLiteContext) {}

  /**
   * Save archived entries (bulk insert)
   */
  async saveArchived(entries: AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const db = this.context.getDatabase();
    const archivedAt = new Date().toISOString();

    const insert = db.prepare(
      `INSERT INTO audit_log_archive (
        id, userId, username, action, entityType, entityId,
        details, timestamp, ipAddress, userAgent, archivedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          entry.userAgent || null,
          archivedAt
        );
      }
    });

    transaction(entries);
    logger.info('Archived audit entries', { count: entries.length });
  }

  /**
   * Query archived logs (limited filters, slower performance)
   */
  async findArchived(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>> {
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
    const countQuery = `SELECT COUNT(*) as total FROM audit_log_archive ${whereClause}`;
    const countRow = await this.context.queryOne<{ total: number }>(countQuery, params);
    const total = countRow?.total || 0;

    // Get paginated results
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const dataQuery = `
      SELECT * FROM audit_log_archive
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
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

  /**
   * Count archived entries
   */
  async countArchived(): Promise<number> {
    const row = await this.context.queryOne<{ total: number }>(
      'SELECT COUNT(*) as total FROM audit_log_archive'
    );
    return row?.total || 0;
  }

  /**
   * Get oldest archived entry timestamp
   */
  async getOldestArchivedTimestamp(): Promise<Date | null> {
    const row = await this.context.queryOne<{ oldest: string }>(
      'SELECT MIN(timestamp) as oldest FROM audit_log_archive'
    );
    return row?.oldest ? new Date(row.oldest) : null;
  }

  /**
   * Delete archived entries older than specified date
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.context.execute(
      'DELETE FROM audit_log_archive WHERE timestamp < ?',
      [date.toISOString()]
    );
    return result.changes;
  }

  /**
   * Export archived logs to JSON string
   */
  async exportToJSON(dateFrom?: Date, dateTo?: Date): Promise<string> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (dateFrom) {
      whereClauses.push('timestamp >= ?');
      params.push(dateFrom.toISOString());
    }

    if (dateTo) {
      whereClauses.push('timestamp <= ?');
      params.push(dateTo.toISOString());
    }

    const whereClause = whereClauses.length > 0
      ? 'WHERE ' + whereClauses.join(' AND ')
      : '';

    const query = `SELECT * FROM audit_log_archive ${whereClause} ORDER BY timestamp DESC`;
    const rows = await this.context.queryMany<AuditArchiveRow>(query, params);

    const entries = rows.map(this.rowToEntry);
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Convert database row to AuditLogEntry domain object
   */
  private rowToEntry(row: AuditArchiveRow): AuditLogEntry {
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
