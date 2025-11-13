import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { PaginatedResult, QueryOptions } from '@domain/types/repository';

/**
 * Audit Repository Interface
 *
 * Defines the contract for audit log data access operations.
 * Infrastructure layer will implement this interface.
 *
 * Design principles:
 * - Immutable logs: No update operations (audit entries cannot be modified)
 * - Efficient queries: Indexed for common access patterns
 * - Compliance: Supports retention policies and data export
 */
export interface AuditRepository {

  // WRITE OPERATIONS

  /**
   * Save a single audit log entry
   *
   * @param entry - Audit log entry to persist
   */
  save(entry: AuditLogEntry): Promise<void>;

  /**
   * Save multiple audit log entries in a single transaction
   *
   * @param entries - Array of audit log entries
   */
  saveMany(entries: AuditLogEntry[]): Promise<void>;

  // READ OPERATIONS

  /**
   * Find all audit entries for a specific user
   *
   * @param userId - User ID to filter by
   * @param options - Optional query parameters (limit, offset, date range)
   */
  findByUserId(userId: string, options?: QueryOptions): Promise<AuditLogEntry[]>;

  /**
   * Find all audit entries for a specific entity
   *
   * @param entityId - Entity ID to filter by
   * @param entityType - Entity type (tube, user, config, etc.)
   */
  findByEntityId(entityId: string, entityType: string): Promise<AuditLogEntry[]>;

  /**
   * Find all audit entries for a specific action type
   *
   * @param action - Action to filter by (tube_created, login_success, etc.)
   * @param options - Optional query parameters
   */
  findByAction(action: string, options?: QueryOptions): Promise<AuditLogEntry[]>;

  /**
   * Find all audit entries with advanced filtering and pagination
   *
   * @param filters - Complex filters (user, action, entity type, date range)
   * @returns Paginated result with total count
   */
  findAll(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>;

  // MAINTENANCE OPERATIONS

  /**
   * Delete all audit entries older than specified date
   *
   * Used for retention policy enforcement.
   *
   * @param date - Cutoff date (entries before this will be deleted)
   * @returns Number of entries deleted
   */
  deleteOlderThan(date: Date): Promise<number>;

  /**
   * Get total count of audit entries (for statistics)
   */
  count(): Promise<number>;

  /**
   * Get count of entries created within date range
   *
   * @param dateFrom - Start date
   * @param dateTo - End date
   */
  countInRange(dateFrom: Date, dateTo: Date): Promise<number>;

  // ARCHIVAL OPERATIONS

  /**
   * Find entries older than specified date (for archival)
   *
   * @param date - Cutoff date
   * @param limit - Optional limit for batch processing
   */
  findOlderThan(date: Date, limit?: number): Promise<AuditLogEntry[]>;

  /**
   * Delete archived entries from active table (called after saveArchived)
   *
   * @param entryIds - Array of entry IDs to delete
   * @returns Number of entries deleted
   */
  deleteArchived(entryIds: string[]): Promise<number>;

  /**
   * Get active table statistics for monitoring
   */
  getActiveTableMetrics(): Promise<{
    count: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }>;
}
