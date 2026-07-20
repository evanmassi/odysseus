/**
 * Audit Repository Interface
 *
 * Immutable audit log contract — no update operations, supports retention policies and archival.
 */

import type { PaginatedResult, QueryOptions } from '@domain/types/repository';

import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';

export interface AuditRepository {
  save(entry: AuditLogEntry): Promise<void>;
  saveMany(entries: AuditLogEntry[]): Promise<void>;

  findByAction(action: string, options?: QueryOptions): Promise<AuditLogEntry[]>;
  findAll(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>;
  findAllForLab(filters: AuditLogFilters, labId: string): Promise<PaginatedResult<AuditLogEntry>>;

  deleteByLabId(labId: string): Promise<number>;

  findOlderThan(date: Date, limit?: number): Promise<AuditLogEntry[]>;

  /** Call after saveArchived to remove entries from the active table. */
  deleteArchived(entryIds: string[]): Promise<number>;

  getActiveTableMetrics(): Promise<{
    count: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }>;
}
