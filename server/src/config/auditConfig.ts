/**
 * Audit Log Retention Configuration
 *
 * Centralized retention policy settings following research lab standards.
 * Active logs provide fast queries, archived logs provide compliance retention.
 */

export const AUDIT_RETENTION_CONFIG = {
  // Active table retention (fast queries with full indexes)
  activeRetentionDays: 90,

  // Total retention period before deletion (archive + active)
  totalRetentionDays: 730,  // 2 years

  // Calculated: Archive retention (total - active)
  archiveRetentionDays: 640,  // ~21 months

  // Scheduled archival job (cron format: "0 2 * * *" = 2 AM daily)
  archivalJobSchedule: '0 2 * * *',

  // Enable/disable automatic archival
  enableAutoArchival: true,

  // Performance warning threshold (alert if active table exceeds this)
  activeTableWarningThreshold: 50000,

  // Batch size for archival operations (prevents memory issues)
  archivalBatchSize: 1000,
} as const;

export type AuditRetentionConfig = typeof AUDIT_RETENTION_CONFIG;
