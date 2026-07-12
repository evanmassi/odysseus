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

  findByEntityId(entityId: string, entityType: string): Promise<AuditLogEntry[]>;
  findByEntityIdForLab(entityId: string, entityType: string, labId: string): Promise<AuditLogEntry[]>;
  findByAction(action: string, options?: QueryOptions): Promise<AuditLogEntry[]>;
  findAll(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>;
  findAllForLab(filters: AuditLogFilters, labId: string): Promise<PaginatedResult<AuditLogEntry>>;

  deleteByLabId(labId: string): Promise<number>;
  count(): Promise<number>;
  countForLab(labId: string): Promise<number>;
  countInRange(dateFrom: Date, dateTo: Date): Promise<number>;
  countInRangeForLab(dateFrom: Date, dateTo: Date, labId: string): Promise<number>;

  findOlderThan(date: Date, limit?: number): Promise<AuditLogEntry[]>;

  /** Call after saveArchived to remove entries from the active table. */
  deleteArchived(entryIds: string[]): Promise<number>;

  getActiveTableMetrics(): Promise<{
    count: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }>;
}
