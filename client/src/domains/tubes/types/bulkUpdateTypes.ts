/**
 * Bulk Update Types
 *
 * Progress, result, and error types for tube bulk operations.
 */

export interface BulkUpdateProgress {
  total: number;
  current: number;
  currentTubeId?: string;
  phase: 'preparing' | 'updating';
  errors: BulkUpdateError[];
}

export interface BulkUpdateResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  results: { id: string; success: boolean; error?: string }[];
  errors: BulkUpdateError[];
}

export interface BulkUpdateError {
  tubeId: string;
  error: string;
}
