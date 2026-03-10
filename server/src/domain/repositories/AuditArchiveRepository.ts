/**
 * Audit Archive Repository Interface
 *
 * Warm-storage contract for archived audit logs (retention compliance, bulk archival, export).
 */

import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { PaginatedResult } from '@domain/types/repository';

export interface AuditArchiveRepository {
  saveArchived(entries: AuditLogEntry[]): Promise<void>;
  findArchived(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>;
  countArchived(): Promise<number>;

  /** Used for retention metrics and cleanup scheduling. */
  getOldestArchivedTimestamp(): Promise<Date | null>;

  /** Permanent deletion after total retention period expires. */
  deleteOlderThan(date: Date): Promise<number>;

  /** Compliance exports and backups. */
  exportToJSON(dateFrom?: Date, dateTo?: Date): Promise<string>;
}
