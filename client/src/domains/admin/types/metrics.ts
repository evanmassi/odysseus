/**
 * Admin Metrics and Policy Type Definitions
 *
 * Type definitions for retention metrics and policies.
 */

/**
 * Retention metrics for data lifecycle management
 */
export interface RetentionMetrics {
  totalTubes: number;
  tubesMarkedForDeletion: number;
  tubesReadyForDeletion: number;
  oldestTube: string | null;
  averageAge: number;
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  enabled: boolean;
  retentionDays: number;
  gracePeriodDays: number;
  autoDelete: boolean;
  lastModified: string;
  modifiedBy: string;
}
