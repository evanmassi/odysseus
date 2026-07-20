/**
 * Bulk Update Types
 *
 * Result and error types for tube bulk operations.
 */

export interface BulkUpdateResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  results: { id: string; success: boolean; error?: string }[];
  errors: BulkUpdateError[];
}

interface BulkUpdateError {
  tubeId: string;
  error: string;
}
