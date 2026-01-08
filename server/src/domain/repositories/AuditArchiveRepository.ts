import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { PaginatedResult } from '@domain/types/repository';

/**
 * Audit Archive Repository Interface
 *
 * Defines the contract for archived audit log data access operations.
 * Infrastructure layer will implement this interface.
 *
 * Design principles:
 * - Warm storage: Slower queries, optimized for retention compliance
 * - Bulk operations: Batch insert/delete for efficient archival
 * - Export support: JSON export for compliance/backup
 */
export interface AuditArchiveRepository {

  /**
   * Save archived entries (bulk insert)
   *
   * @param entries - Array of audit log entries to archive
   */
  saveArchived(entries: AuditLogEntry[]): Promise<void>;

  /**
   * Query archived logs with filtering and pagination
   *
   * @param filters - Filter criteria (user, action, date range, etc.)
   * @returns Paginated result with total count
   */
  findArchived(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>;

  /**
   * Count total archived entries
   */
  countArchived(): Promise<number>;

  /**
   * Get oldest archived entry timestamp
   *
   * Used for retention metrics and cleanup scheduling.
   */
  getOldestArchivedTimestamp(): Promise<Date | null>;

  /**
   * Delete archived entries older than specified date
   *
   * Used for permanent deletion after total retention period expires.
   *
   * @param date - Cutoff date (entries before this will be deleted)
   * @returns Number of entries deleted
   */
  deleteOlderThan(date: Date): Promise<number>;

  /**
   * Export archived logs to JSON string
   *
   * Used for compliance exports and backups.
   *
   * @param dateFrom - Optional start date filter
   * @param dateTo - Optional end date filter
   * @returns JSON string of archived entries
   */
  exportToJSON(dateFrom?: Date, dateTo?: Date): Promise<string>;
}
