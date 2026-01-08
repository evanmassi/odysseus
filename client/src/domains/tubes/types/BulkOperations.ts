/**
 * Bulk Operations Types
 */
import type { TubeData } from '@odysseus/shared-schemas';

export interface BulkUpdateItem {
  id: string;
  data: TubeData;
  operation: 'create' | 'update' | 'delete';
}

export type BulkProgressCallback = (progress: BulkUpdateProgress) => void;

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

export interface BulkUpdateOptions {
  validateOnly?: boolean;
  ignoreErrors?: boolean;
  batchSize?: number;
  onProgress?: (progress: BulkUpdateProgress) => void;
}

export interface BulkOperationContext {
  operationType: 'create' | 'update' | 'delete';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic items array for flexible bulk operation types
  items: any[];
  options: BulkUpdateOptions;
}

export interface ConflictResolution {
  action: 'overwrite' | 'skip' | 'merge' | 'cancel';
  applyToAll?: boolean;
}

export interface BulkConflict {
  itemId: string;
  field: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic field values with varying types
  existingValue: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic field values with varying types
  newValue: any;
  resolution?: ConflictResolution;
}
