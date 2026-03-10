/**
 * Audit Repository Interface
 *
 * Immutable audit log contract — no update operations, supports retention policies and archival.
 */

import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { PaginatedResult, QueryOptions } from '@domain/types/repository';

export interface AuditRepository {

  // WRITE OPERATIONS

  save(entry: AuditLogEntry): Promise<void>;
  saveMany(entries: AuditLogEntry[]): Promise<void>;

  // READ OPERATIONS

  findByUserId(userId: string, options?: QueryOptions): Promise<AuditLogEntry[]>;
  findByEntityId(entityId: string, entityType: string): Promise<AuditLogEntry[]>;
  findByAction(action: string, options?: QueryOptions): Promise<AuditLogEntry[]>;
  findAll(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>;
  findAllForLab(filters: AuditLogFilters, labId: string): Promise<PaginatedResult<AuditLogEntry>>;

  // MAINTENANCE OPERATIONS

  /** Used for retention policy enforcement. */
  deleteOlderThan(date: Date): Promise<number>;
  deleteByLabId(labId: string): Promise<number>;
  count(): Promise<number>;
  countInRange(dateFrom: Date, dateTo: Date): Promise<number>;

  // ARCHIVAL OPERATIONS

  findOlderThan(date: Date, limit?: number): Promise<AuditLogEntry[]>;

  /** Call after saveArchived to remove entries from the active table. */
  deleteArchived(entryIds: string[]): Promise<number>;

  getActiveTableMetrics(): Promise<{
    count: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }>;
}
