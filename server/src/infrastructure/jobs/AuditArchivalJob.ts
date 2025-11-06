import * as cron from 'node-cron';
import { AuditRetentionService } from '@application/services/AuditRetentionService';
import { AUDIT_RETENTION_CONFIG } from '@config/auditConfig';
import { logger } from '@utils/logger';

/**
 * Audit Archival Job
 *
 * Scheduled job for automatic audit log archival and cleanup.
 * Runs daily at configured time (default: 2 AM).
 */
export class AuditArchivalJob {
  private task: cron.ScheduledTask | null = null;

  constructor(private retentionService: AuditRetentionService) {}

  /**
   * Start the scheduled archival job
   */
  start(): void {
    if (!AUDIT_RETENTION_CONFIG.enableAutoArchival) {
      logger.info('Audit archival job disabled by configuration');
      return;
    }

    if (this.task) {
      logger.warn('Audit archival job already running');
      return;
    }

    logger.info('Starting audit archival job', {
      schedule: AUDIT_RETENTION_CONFIG.archivalJobSchedule,
      activeRetentionDays: AUDIT_RETENTION_CONFIG.activeRetentionDays,
      totalRetentionDays: AUDIT_RETENTION_CONFIG.totalRetentionDays,
    });

    this.task = cron.schedule(
      AUDIT_RETENTION_CONFIG.archivalJobSchedule,
      async () => {
        await this.runArchival();
      },
      {
        timezone: 'America/New_York', // Adjust to your timezone
      }
    );

    logger.info('Audit archival job started successfully');
  }

  /**
   * Stop the scheduled archival job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Audit archival job stopped');
    }
  }

  /**
   * Run archival process
   */
  private async runArchival(): Promise<void> {
    const startTime = Date.now();

    logger.info('Starting scheduled audit log archival');

    try {
      // Archive old entries from active table to archive table
      const archived = await this.retentionService.archiveOldEntries();

      // Delete expired entries from archive table
      const deleted = await this.retentionService.deleteExpiredEntries();

      // Get metrics for logging
      const metrics = await this.retentionService.getRetentionMetrics();

      const duration = Date.now() - startTime;

      logger.info('Scheduled audit log archival completed', {
        archived,
        deleted,
        duration: `${duration}ms`,
        activeTableCount: metrics.activeTable.count,
        archiveTableCount: metrics.archiveTable.count,
        performanceWarning: metrics.performanceWarning,
      });

      // Log warning if active table is getting large
      if (metrics.performanceWarning) {
        logger.warn('Active audit log table approaching warning threshold', {
          count: metrics.activeTable.count,
          threshold: AUDIT_RETENTION_CONFIG.activeTableWarningThreshold,
          recommendation: 'Consider reducing active retention period or investigating log volume',
        });
      }
    } catch (error) {
      logger.error('Scheduled audit log archival failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Get job status
   */
  isRunning(): boolean {
    return this.task !== null;
  }

  /**
   * Get next scheduled run time
   */
  getNextRun(): Date | null {
    // Note: node-cron doesn't expose next run time directly
    // This is a best-effort calculation based on cron expression
    if (!this.task) return null;

    // For "0 2 * * *" (2 AM daily), calculate next occurrence
    const now = new Date();
    const next = new Date(now);
    next.setHours(2, 0, 0, 0);

    // If 2 AM today has passed, schedule for tomorrow
    if (now.getHours() >= 2) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }
}
