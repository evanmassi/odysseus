/**
 * Audit Archival Job
 *
 * Scheduled job for automatic audit log archival and cleanup.
 * Runs daily at configured time (default: 2 AM).
 */

import * as cron from 'node-cron';
import { AuditRetentionService } from '@application/services/AuditRetentionService';
import { AUDIT_RETENTION_CONFIG } from '@application/config/AuditConfig';
import { logger } from '@infrastructure/logging/logger';

export class AuditArchivalJob {
  private task: cron.ScheduledTask | null = null;

  constructor(private retentionService: AuditRetentionService) {}

  start(): void {
    if (!AUDIT_RETENTION_CONFIG.enableAutoArchival) {
      return;
    }

    if (this.task) {
      return;
    }

    this.task = cron.schedule(
      AUDIT_RETENTION_CONFIG.archivalJobSchedule,
      async () => {
        await this.runArchival();
      },
      {
        timezone: AUDIT_RETENTION_CONFIG.archivalJobTimezone,
      }
    );
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }

  private async runArchival(): Promise<void> {
    const startTime = Date.now();

    try {
      const archived = await this.retentionService.archiveOldEntries();
      const deleted = await this.retentionService.deleteExpiredEntries();
      const metrics = await this.retentionService.getRetentionMetrics();
      const duration = Date.now() - startTime;

      logger.debug('Audit archival completed', {
        archived,
        deleted,
        duration: `${duration}ms`,
        activeTableCount: metrics.activeTable.count,
        archiveTableCount: metrics.archiveTable.count,
      });

      if (metrics.performanceWarning) {
        logger.warn('Audit log table approaching threshold', {
          count: metrics.activeTable.count,
          threshold: AUDIT_RETENTION_CONFIG.activeTableWarningThreshold,
        });
      }
    } catch (error) {
      logger.error('Audit archival failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

}
