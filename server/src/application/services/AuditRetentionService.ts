/**
 * Audit Retention Service
 *
 * Orchestrates audit log archival, expiry, and cross-table querying.
 */

import { AUDIT_RETENTION_CONFIG, ARCHIVE_RETENTION_DAYS } from '@application/config/AuditConfig';
import type { AuditArchiveRepository } from '@domain/repositories/AuditArchiveRepository';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { PaginatedResult } from '@domain/types/repository';
import { logger } from '@infrastructure/logging/logger';

import type { AuditLogEntry, AuditLogFilters } from '@odysseus/shared-schemas';

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

export interface RetentionPolicy {
  activeRetentionDays: number;
  totalRetentionDays: number;
  archiveRetentionDays: number;
  enableAutoArchival: boolean;
  activeTableWarningThreshold: number;
}

export class AuditRetentionService {
  constructor(
    private auditRepository: AuditRepository,
    private archiveRepository: AuditArchiveRepository
  ) {}

  async archiveOldEntries(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUDIT_RETENTION_CONFIG.activeRetentionDays);

    logger.info('Starting audit log archival', {
      cutoffDate: cutoffDate.toISOString(),
      activeRetentionDays: AUDIT_RETENTION_CONFIG.activeRetentionDays,
    });

    let totalArchived = 0;

    let entries = await this.auditRepository.findOlderThan(
      cutoffDate,
      AUDIT_RETENTION_CONFIG.archivalBatchSize
    );

    while (entries.length > 0) {

      await this.archiveRepository.saveArchived(entries);

      const entryIds = entries.map((e: AuditLogEntry) => e.id);
      const deleted = await this.auditRepository.deleteArchived(entryIds);

      totalArchived += deleted;

      logger.info('Archived batch', {
        batchSize: entries.length,
        totalArchived,
      });

      if (entries.length < AUDIT_RETENTION_CONFIG.archivalBatchSize) break;

      entries = await this.auditRepository.findOlderThan(
        cutoffDate,
        AUDIT_RETENTION_CONFIG.archivalBatchSize
      );
    }

    logger.info('Audit log archival completed', { totalArchived });
    return totalArchived;
  }

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

  async getRetentionMetrics(): Promise<RetentionMetrics> {
    const activeMetrics = await this.auditRepository.getActiveTableMetrics();
    const archiveCount = await this.archiveRepository.countArchived();
    const oldestArchived = await this.archiveRepository.getOldestArchivedTimestamp();

    let nextArchivalDate: Date | null = null;
    if (activeMetrics.oldestEntry) {
      const next = new Date(activeMetrics.oldestEntry);
      next.setDate(next.getDate() + AUDIT_RETENTION_CONFIG.activeRetentionDays);
      nextArchivalDate = next;
    }

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
        retentionDays: ARCHIVE_RETENTION_DAYS,
      },
      nextArchivalDate,
      performanceWarning,
    };
  }

  getRetentionPolicy(): RetentionPolicy {
    return {
      activeRetentionDays: AUDIT_RETENTION_CONFIG.activeRetentionDays,
      totalRetentionDays: AUDIT_RETENTION_CONFIG.totalRetentionDays,
      archiveRetentionDays: ARCHIVE_RETENTION_DAYS,
      enableAutoArchival: AUDIT_RETENTION_CONFIG.enableAutoArchival,
      activeTableWarningThreshold: AUDIT_RETENTION_CONFIG.activeTableWarningThreshold,
    };
  }

  async queryAllLogs(
    filters: AuditLogFilters,
    includeArchive: boolean = false
  ): Promise<PaginatedResult<AuditLogEntry>> {
    if (!includeArchive) {
      return this.auditRepository.findAll(filters);
    }

    // Fetch full qualifying sets without pagination — mergeAndPaginate applies it after sorting
    const unpaginatedFilters = this.stripPagination(filters);
    const [activeResult, archiveResult] = await Promise.all([
      this.auditRepository.findAll(unpaginatedFilters),
      this.archiveRepository.findArchived(unpaginatedFilters),
    ]);

    return this.mergeAndPaginate(activeResult, archiveResult, filters);
  }

  async queryAllLogsForLab(
    filters: AuditLogFilters,
    labId: string,
    includeArchive: boolean = false
  ): Promise<PaginatedResult<AuditLogEntry>> {
    if (!includeArchive) {
      return this.auditRepository.findAllForLab(filters, labId);
    }

    const unpaginatedFilters = this.stripPagination(filters);
    const [activeResult, archiveResult] = await Promise.all([
      this.auditRepository.findAllForLab(unpaginatedFilters, labId),
      this.archiveRepository.findArchivedForLab(unpaginatedFilters, labId),
    ]);

    return this.mergeAndPaginate(activeResult, archiveResult, filters);
  }

  async exportArchivedLogs(dateFrom?: Date, dateTo?: Date): Promise<string> {
    return this.archiveRepository.exportToJSON(dateFrom, dateTo);
  }

  async runManualArchival(): Promise<{ archived: number; deleted: number }> {
    logger.info('Manual archival triggered');

    const archived = await this.archiveOldEntries();
    const deleted = await this.deleteExpiredEntries();

    return { archived, deleted };
  }

  private stripPagination(filters: AuditLogFilters): AuditLogFilters {
    const { limit: _limit, offset: _offset, ...rest } = filters;
    return rest;
  }

  private mergeAndPaginate(
    activeResult: PaginatedResult<AuditLogEntry>,
    archiveResult: PaginatedResult<AuditLogEntry>,
    filters: AuditLogFilters
  ): PaginatedResult<AuditLogEntry> {
    const mergedItems = [...activeResult.items, ...archiveResult.items]
      .sort((a, b) => {
        const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
        const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
        return bTime - aTime;
      });

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    const total = activeResult.pagination.total + archiveResult.pagination.total;
    const paginatedItems = mergedItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + paginatedItems.length < total,
      },
    };
  }
}
