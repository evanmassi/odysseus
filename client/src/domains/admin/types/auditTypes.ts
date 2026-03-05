/**
 * Admin Audit Types
 *
 * Shared types for audit log pagination, retention metrics, and policies.
 */

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface RetentionMetrics {
  activeTable: {
    count: number;
    oldestEntry: string | null;
    newestEntry: string | null;
    retentionDays: number;
  };
  archiveTable: {
    count: number;
    oldestEntry: string | null;
    retentionDays: number;
  };
  nextArchivalDate: string | null;
  performanceWarning: boolean;
}

export interface RetentionPolicy {
  activeRetentionDays: number;
  totalRetentionDays: number;
  archiveRetentionDays: number;
  enableAutoArchival: boolean;
  activeTableWarningThreshold: number;
}
