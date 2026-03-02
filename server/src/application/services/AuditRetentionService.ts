import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { AuditArchiveRepository } from '@domain/repositories/AuditArchiveRepository';
import type { PaginatedResult } from '@domain/types/repository';
import { AUDIT_RETENTION_CONFIG } from '@config/auditConfig';
import { logger } from '@utils/logger';

/**
 * Retention metrics for monitoring
 */
export interface RetentionMetrics {
  activeTable: {
    count: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    retentionDays: number;
  };
  archiveTable: {
    count: number;
    oldestEntry: Date | null;
    retentionDays: number;
  };
  nextArchivalDate: Date | null;
  performanceWarning: boolean;
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  activeRetentionDays: number;
  totalRetentionDays: number;
  archiveRetentionDays: number;
  enableAutoArchival: boolean;
  activeTableWarningThreshold: number;
}

/**
 * Audit Retention Service
 *
 * Application service orchestrating audit log retention and archival.
 * Coordinates between active repository and archive repository.
 */
export class AuditRetentionService {
  constructor(
    private auditRepository: AuditRepository,
    private archiveRepository: AuditArchiveRepository
  ) {}

  /**
   * Archive old entries from active table to archive table
   *
   * Returns count of entries archived
   */
  async archiveOldEntries(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUDIT_RETENTION_CONFIG.activeRetentionDays);

    logger.info('Starting audit log archival', {
      cutoffDate: cutoffDate.toISOString(),
      activeRetentionDays: AUDIT_RETENTION_CONFIG.activeRetentionDays,
    });

    let totalArchived = 0;
    let hasMore = true;

    // Process in batches to prevent memory issues
    while (hasMore) {
      const entries = await this.auditRepository.findOlderThan(
        cutoffDate,
        AUDIT_RETENTION_CONFIG.archivalBatchSize
      );

      if (entries.length === 0) {
        hasMore = false;
        break;
      }

      // Save to archive table
      await this.archiveRepository.saveArchived(entries);

      // Delete from active table
      const entryIds = entries.map((e: AuditLogEntry) => e.id);
      const deleted = await this.auditRepository.deleteArchived(entryIds);

      totalArchived += deleted;

      logger.info('Archived batch', {
        batchSize: entries.length,
        totalArchived,
      });

      // If we got fewer entries than batch size, we're done
      if (entries.length < AUDIT_RETENTION_CONFIG.archivalBatchSize) {
        hasMore = false;
      }
    }

    logger.info('Audit log archival completed', { totalArchived });
    return totalArchived;
  }

  /**
   * Delete expired entries from archive table
   *
   * Returns count of entries deleted
   */
  async deleteExpiredEntries(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUDIT_RETENTION_CONFIG.totalRetentionDays);

    logger.info('Deleting expired audit logs', {
      cutoffDate: cutoffDate.toISOString(),
      totalRetentionDays: AUDIT_RETENTION_CONFIG.totalRetentionDays,
    });

    const deleted = await this.archiveRepository.deleteOlderThan(cutoffDate);

    logger.info('Expired audit logs deleted', { count: deleted });
    return deleted;
  }

  /**
   * Get retention metrics for monitoring dashboard
   */
  async getRetentionMetrics(): Promise<RetentionMetrics> {
    const activeMetrics = await this.auditRepository.getActiveTableMetrics();
    const archiveCount = await this.archiveRepository.countArchived();
    const oldestArchived = await this.archiveRepository.getOldestArchivedTimestamp();

    // Calculate next archival date (oldest entry + retention period)
    let nextArchivalDate: Date | null = null;
    if (activeMetrics.oldestEntry) {
      const next = new Date(activeMetrics.oldestEntry);
      next.setDate(next.getDate() + AUDIT_RETENTION_CONFIG.activeRetentionDays);
      nextArchivalDate = next;
    }

    // Check if active table is approaching warning threshold
    const performanceWarning = activeMetrics.count >= AUDIT_RETENTION_CONFIG.activeTableWarningThreshold;

    return {
      activeTable: {
        count: activeMetrics.count,
        oldestEntry: activeMetrics.oldestEntry,
        newestEntry: activeMetrics.newestEntry,
        retentionDays: AUDIT_RETENTION_CONFIG.activeRetentionDays,
      },
      archiveTable: {
        count: archiveCount,
        oldestEntry: oldestArchived,
        retentionDays: AUDIT_RETENTION_CONFIG.archiveRetentionDays,
      },
      nextArchivalDate,
      performanceWarning,
    };
  }

  /**
   * Get current retention policy
   */
  getRetentionPolicy(): RetentionPolicy {
    return {
      activeRetentionDays: AUDIT_RETENTION_CONFIG.activeRetentionDays,
      totalRetentionDays: AUDIT_RETENTION_CONFIG.totalRetentionDays,
      archiveRetentionDays: AUDIT_RETENTION_CONFIG.archiveRetentionDays,
      enableAutoArchival: AUDIT_RETENTION_CONFIG.enableAutoArchival,
      activeTableWarningThreshold: AUDIT_RETENTION_CONFIG.activeTableWarningThreshold,
    };
  }

  /**
   * Query logs across both active and archive tables
   *
   * If includeArchive is true, queries both tables and merges results
   */
  async queryAllLogs(
    filters: AuditLogFilters,
    includeArchive: boolean = false
  ): Promise<PaginatedResult<AuditLogEntry>> {
    // Always query active table
    const activeResult = await this.auditRepository.findAll(filters);

    // If not including archive, return active results only
    if (!includeArchive) {
      return activeResult;
    }

    // Query archive table with same filters
    const archiveResult = await this.archiveRepository.findArchived(filters);

    // Merge results (both are already sorted by timestamp DESC)
    const mergedItems = [...activeResult.items, ...archiveResult.items]
      .sort((a, b) => {
        const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
        const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
        return bTime - aTime;
      });

    // Apply pagination to merged results
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const paginatedItems = mergedItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      pagination: {
        total: activeResult.pagination.total + archiveResult.pagination.total,
        limit,
        offset,
        hasMore: offset + paginatedItems.length < mergedItems.length,
      },
    };
  }

  async queryAllLogsForLab(
    filters: AuditLogFilters,
    labId: string,
    includeArchive: boolean = false
  ): Promise<PaginatedResult<AuditLogEntry>> {
    const activeResult = await this.auditRepository.findAllForLab(filters, labId);

    if (!includeArchive) {
      return activeResult;
    }

    const archiveResult = await this.archiveRepository.findArchived(filters);

    const mergedItems = [...activeResult.items, ...archiveResult.items]
      .sort((a, b) => {
        const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
        const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
        return bTime - aTime;
      });

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const paginatedItems = mergedItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      pagination: {
        total: activeResult.pagination.total + archiveResult.pagination.total,
        limit,
        offset,
        hasMore: offset + paginatedItems.length < mergedItems.length,
      },
    };
  }

  /**
   * Export archived logs to JSON
   */
  async exportArchivedLogs(dateFrom?: Date, dateTo?: Date): Promise<string> {
    return this.archiveRepository.exportToJSON(dateFrom, dateTo);
  }

  /**
   * Manual trigger for archival (for testing or admin use)
   */
  async runManualArchival(): Promise<{ archived: number; deleted: number }> {
    logger.info('Manual archival triggered');

    const archived = await this.archiveOldEntries();
    const deleted = await this.deleteExpiredEntries();

    return { archived, deleted };
  }
}
