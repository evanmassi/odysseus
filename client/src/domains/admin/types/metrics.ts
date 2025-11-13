/**
 * Admin Metrics and Policy Type Definitions
 *
 * Type definitions for retention metrics and policies.
 */

/**
 * Retention metrics for audit log lifecycle management
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
 * Retention policy configuration for audit logs
 */
export interface RetentionPolicy {
  activeRetentionDays: number;
  totalRetentionDays: number;
  archiveRetentionDays: number;
  enableAutoArchival: boolean;
  activeTableWarningThreshold: number;
}
