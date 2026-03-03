import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { PaginatedResult } from '@domain/types/repository';
import type { AuditArchiveRepository as IAuditArchiveRepository } from '@domain/repositories/AuditArchiveRepository';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { logger } from '@utils/logger';

/**
 * Explicit column list for audit_log_archive table queries
 */
const AUDIT_ARCHIVE_COLUMNS = `
  id, user_id, username, action, entity_type, entity_id,
  lab_id, details, timestamp, ip_address, user_agent, archived_at
`.trim();

/**
 * Database row structure for audit_log_archive table
 */
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

/**
 * Audit Archive Repository
 *
 * Data access layer for archived audit logs (warm storage).
 * Minimal indexes for basic timestamp/user queries only.
 */
export class AuditArchiveRepository implements IAuditArchiveRepository {
  constructor(private context: PostgresContext) {}

  /**
   * Save archived entries (bulk insert)
   */
  async saveArchived(entries: AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const archivedAt = new Date();

    await this.context.transaction(async (client) => {
      for (const entry of entries) {
        await client.query(
          `INSERT INTO audit_log_archive (
            id, user_id, username, action, entity_type, entity_id,
            lab_id, details, timestamp, ip_address, user_agent, archived_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            entry.id,
            entry.userId,
            entry.username,
            entry.action,
            entry.entityType,
            entry.entityId || null,
            entry.labId || null,
            entry.details,
            entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
            entry.ipAddress || null,
            entry.userAgent || null,
            archivedAt
          ]
        );
      }
    });

    logger.info('Archived audit entries', { count: entries.length });
  }

  /**
   * Query archived logs (limited filters, slower performance)
   */
  async findArchived(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>> {
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

    const countQuery = `SELECT COUNT(*) as total FROM audit_log_archive ${whereClause}`;
    const countRow = await this.context.queryOne<{ total: string }>(countQuery, params);
    const total = parseInt(countRow?.total || '0', 10);

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const dataQuery = `
      SELECT ${AUDIT_ARCHIVE_COLUMNS} FROM audit_log_archive
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
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
    const row = await this.context.queryOne<{ total: string }>(
      'SELECT COUNT(*) as total FROM audit_log_archive'
    );
    return parseInt(row?.total || '0', 10);
  }

  /**
   * Get oldest archived entry timestamp
   */
  async getOldestArchivedTimestamp(): Promise<Date | null> {
    const row = await this.context.queryOne<{ oldest: Date | string | null }>(
      'SELECT MIN(timestamp) as oldest FROM audit_log_archive'
    );
    if (!row?.oldest) return null;
    return row.oldest instanceof Date ? row.oldest : new Date(row.oldest);
  }

  /**
   * Delete archived entries older than specified date
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.context.execute(
      'DELETE FROM audit_log_archive WHERE timestamp < $1',
      [date]
    );
    return result.rowCount ?? 0;
  }

  /**
   * Export archived logs to JSON string
   */
  async exportToJSON(dateFrom?: Date, dateTo?: Date): Promise<string> {
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

    const query = `SELECT ${AUDIT_ARCHIVE_COLUMNS} FROM audit_log_archive ${whereClause} ORDER BY timestamp DESC`;
    const rows = await this.context.queryMany<AuditArchiveRow>(query, params);

    const entries = rows.map(this.rowToEntry);
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Convert database row to domain object
   */
  private rowToEntry(row: AuditArchiveRow): AuditLogEntry {
    return {
      id: row.id,
      labId: row.lab_id || undefined,
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
