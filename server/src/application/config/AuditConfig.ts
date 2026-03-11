/**
 * Audit Log Retention Configuration
 *
 * Active logs provide fast queries, archived logs provide compliance retention.
 */

export const AUDIT_RETENTION_CONFIG = {
  // Active table retention (fast queries with full indexes)
  activeRetentionDays: 90,

  // Total retention period before deletion (archive + active)
  totalRetentionDays: 730,  // 2 years

  // Scheduled archival job (cron format: "0 2 * * *" = 2 AM daily)
  archivalJobSchedule: '0 2 * * *',

  archivalJobTimezone: 'America/Los_Angeles',  // Pacific Time

  enableAutoArchival: true,

  // Admins can update this threshold through the API
  activeTableWarningThreshold: 50000,

  // Batch size for archival operations (prevents memory issues)
  archivalBatchSize: 1000,
} as const;

// Derived: archive retention = total - active
export const ARCHIVE_RETENTION_DAYS =
  AUDIT_RETENTION_CONFIG.totalRetentionDays - AUDIT_RETENTION_CONFIG.activeRetentionDays;
