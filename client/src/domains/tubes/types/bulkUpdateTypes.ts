/**
 * Bulk Update Types
 *
 * Progress, result, and error types for tube bulk operations.
 */

export interface BulkUpdateProgress {
  completed: number;
  total: number;
  current: number;
  currentItem?: string;
  currentTubeId?: string;
  phase:
    | 'preparing'
    | 'validating'
    | 'processing'
    | 'updating'
    | 'completing'
    | 'complete'
    | 'error';
  errors: BulkUpdateError[];
}

export interface BulkUpdateResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  successful: number;
  failed: number;
  errorCount: number;
  total: number;
  results: { id: string; success: boolean; error?: string }[];
  errors: BulkUpdateError[];
  duration: number;
  response?: {
    updated: number;
    errors: BulkUpdateError[];
  };
}

export interface BulkUpdateError {
  itemId: string;
  tubeId: string;
  error: string;
  field?: string;
}
