/**
 * Bulk Operations Service
 *
 * Bulk operations with progress tracking and error handling.
 */

import { httpClient } from '@infra/api/httpClient';
import { logger } from '@shared/infrastructure/logger';

import type {
  BulkUpdateItem,
  BulkUpdateProgress,
  BulkUpdateError,
  BulkProgressCallback,
  BulkUpdateResult,
} from '@shared/types/BulkOperations';

/**
 * Bulk operations service using httpClient
 */
export class BulkOperationsService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly BATCH_SIZE = 50;

  /**
   * Check if server supports bulk operations
   */
  async checkBulkOperationsSupport(): Promise<boolean> {
    try {
      const response = await httpClient.get<{ status: string }>('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      logger.warn('Server health check failed, falling back to individual updates', { error });
      return false;
    }
  }

  /**
   * Perform bulk update with progress tracking
   */
  async bulkUpdateTubes(
    updates: BulkUpdateItem[],
    onProgress?: BulkProgressCallback
  ): Promise<BulkUpdateResult> {
    const startTime = Date.now();

    // Initialize progress
    const updateProgress = (progress: BulkUpdateProgress) => {
      onProgress?.(progress);
    };

    updateProgress({
      completed: 0,
      current: 0,
      total: updates.length,
      phase: 'preparing',
      errors: [],
    });

    try {
      // Process in batches for better performance
      if (updates.length > BulkOperationsService.BATCH_SIZE) {
        return await this.processBatches(updates, onProgress, startTime);
      }

      // Single batch processing
      return await this.processSingleBatch(updates, onProgress, startTime);
    } catch (error) {
      logger.error('Bulk update failed', { error });
      return {
        success: false,
        totalProcessed: 0,
        successCount: 0,
        successful: 0,
        failed: 1,
        errorCount: 1,
        total: updates.length,
        results: [],
        errors: [
          {
            itemId: 'system',
            tubeId: 'system',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        duration: Date.now() - startTime,
        response: {
          updated: 0,
          errors: [
            {
              itemId: 'system',
              tubeId: 'system',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          ],
        },
      };
    }
  }

  /**
   * Process updates in multiple batches
   */
  private async processBatches(
    updates: BulkUpdateItem[],
    onProgress?: BulkProgressCallback,
    startTime: number = Date.now()
  ): Promise<BulkUpdateResult> {
    const batches: BulkUpdateItem[][] = [];
    for (let i = 0; i < updates.length; i += BulkOperationsService.BATCH_SIZE) {
      batches.push(updates.slice(i, i + BulkOperationsService.BATCH_SIZE));
    }

    let totalUpdated = 0;
    let allErrors: BulkUpdateError[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      onProgress?.({
        completed: i * BulkOperationsService.BATCH_SIZE,
        current: i * BulkOperationsService.BATCH_SIZE,
        total: updates.length,
        phase: 'updating',
        errors: allErrors,
      });

      const batchResult = await this.processSingleBatch(batch, onProgress);

      if (batchResult.response) {
        totalUpdated += batchResult.response.updated;
        allErrors = [...allErrors, ...batchResult.response.errors];
      }

      // Add delay between batches to prevent server overload
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      success: totalUpdated > 0,
      totalProcessed: updates.length,
      successCount: totalUpdated,
      successful: totalUpdated,
      failed: allErrors.length,
      errorCount: allErrors.length,
      total: updates.length,
      results: [],
      errors: allErrors,
      duration: Date.now() - startTime,
      response: {
        updated: totalUpdated,
        errors: allErrors,
      },
    };
  }

  /**
   * Process a single batch of updates
   */
  private async processSingleBatch(
    updates: BulkUpdateItem[],
    onProgress?: BulkProgressCallback,
    startTime: number = Date.now(),
    retryCount: number = 0
  ): Promise<BulkUpdateResult> {
    try {
      onProgress?.({
        completed: 0,
        current: 0,
        total: updates.length,
        phase: 'updating',
        errors: [],
      });

      const response = await httpClient.put<{
        success: boolean;
        updated: number;
        total: number;
        errors: BulkUpdateError[];
        processingTime?: number;
      }>('/tubes/bulk-update', { updates });

      const result = response.data;

      onProgress?.({
        current: result.updated,
        total: result.total,
        completed: result.updated,
        phase: 'completing',
        errors: result.errors || [],
      });

      return {
        success: result.success,
        totalProcessed: result.updated,
        successCount: result.updated,
        successful: result.updated,
        failed: result.errors?.length || 0,
        errorCount: result.errors?.length || 0,
        total: result.total || updates.length,
        results: [],
        errors: result.errors || [],
        duration: Date.now() - startTime,
        response: {
          updated: result.updated,
          errors: result.errors || [],
        },
      };
    } catch (error) {
      logger.error(`Bulk update attempt ${retryCount + 1} failed`, { error });

      // Retry logic for transient errors
      if (retryCount < BulkOperationsService.MAX_RETRIES) {
        await new Promise(resolve =>
          setTimeout(resolve, BulkOperationsService.RETRY_DELAY * (retryCount + 1))
        );
        return await this.processSingleBatch(updates, onProgress, startTime, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Fallback to individual updates when bulk operations are not supported
   */
  async fallbackIndividualUpdates(
    updates: BulkUpdateItem[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Legacy Zustand store pattern, will be typed in Phase 2
    tubeStore: any,
    onProgress?: BulkProgressCallback
  ): Promise<BulkUpdateResult> {
    let updated = 0;
    const errors: BulkUpdateError[] = [];

    onProgress?.({
      current: 0,
      total: updates.length,
      completed: 0,
      phase: 'preparing',
      errors: [],
    });

    for (let i = 0; i < updates.length; i++) {
      const { id, data: tubeUpdates } = updates[i];

      try {
        const success = await tubeStore.updateTube(id, tubeUpdates, '');

        if (success) {
          updated++;
        } else {
          errors.push({
            itemId: id,
            tubeId: id,
            error: 'Update failed',
          });
        }
      } catch (error) {
        errors.push({
          itemId: id,
          tubeId: id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Update progress
      onProgress?.({
        current: i + 1,
        total: updates.length,
        completed: updated,
        phase: 'updating',
        errors: errors,
      });

      // Small delay to prevent overwhelming the server
      if (i < updates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    onProgress?.({
      current: updated,
      total: updates.length,
      completed: updated,
      phase: 'completing',
      errors: errors,
    });

    return {
      success: updated > 0,
      totalProcessed: updates.length,
      successCount: updated,
      successful: updated,
      failed: errors.length,
      errorCount: errors.length,
      total: updates.length,
      results: [],
      errors,
      duration: 0,
      response: {
        updated,
        errors,
      },
    };
  }
}

// Export singleton instance
export const bulkOperationsService = new BulkOperationsService();
