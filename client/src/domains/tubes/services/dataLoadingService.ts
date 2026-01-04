import { useAuthStore } from '@domains/authentication';

export interface LoadingRequest {
  tankId: string;
  rackId: string;
  boxId: string;
  timestamp: number;
}

export interface LoadingResult {
  success: boolean;
  error?: string;
  dataCount: number;
  loadTime: number;
}

/**
 * Data Loading Service
 *
 * Centralized, debounced data loading service that prevents race conditions
 * and ensures reliable data fetching for tube operations.
 *
 * Key features:
 * - Debounced loading (prevents rapid-fire API calls)
 * - Request deduplication (prevents duplicate requests)
 * - Comprehensive error handling
 * - Performance monitoring
 */
export class DataLoadingService {
  private static instance: DataLoadingService;
  private debounceTimer?: NodeJS.Timeout;
  private currentRequest?: LoadingRequest;
  private isLoading = false;

  // Debounce settings
  private readonly DEBOUNCE_DELAY = 150; // ms

  public static getInstance(): DataLoadingService {
    if (!DataLoadingService.instance) {
      DataLoadingService.instance = new DataLoadingService();
    }
    return DataLoadingService.instance;
  }

  /**
   * Load data for location with intelligent debouncing
   * This is the ONLY method that should load tube data
   */
  public async loadTubesForLocation(
    tankId: string,
    rackId: string,
    boxId: string
  ): Promise<LoadingResult> {
    const request: LoadingRequest = {
      tankId,
      rackId,
      boxId,
      timestamp: Date.now(),
    };

    // Check if this is the same as current request (deduplicate)
    if (this.isSameRequest(request, this.currentRequest)) {
      return { success: true, error: 'Duplicate request', dataCount: 0, loadTime: 0 };
    }

    // Clear any existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.currentRequest = request;

    // Return promise that resolves when debounced load completes
    return new Promise(resolve => {
      this.debounceTimer = setTimeout(async () => {
        const result = await this.executeLoad(request);
        resolve(result);
      }, this.DEBOUNCE_DELAY);
    });
  }

  /**
   * Execute the actual data load
   */
  private async executeLoad(_request: LoadingRequest): Promise<LoadingResult> {
    if (this.isLoading) {
      return { success: false, error: 'Load in progress', dataCount: 0, loadTime: 0 };
    }

    this.isLoading = true;
    const startTime = performance.now();

    try {
      const authStore = useAuthStore.getState();

      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      // Note: Data loading is now handled by React Query in components
      // This service is deprecated - React Query hooks handle the loading
      const loadTime = performance.now() - startTime;
      // Data count no longer available from store - React Query manages the data
      const dataCount = 0;

      return {
        success: true,
        dataCount,
        loadTime,
      };
    } catch (error) {
      const loadTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage,
        dataCount: 0,
        loadTime,
      };
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if two requests are identical
   */
  private isSameRequest(req1: LoadingRequest, req2?: LoadingRequest): boolean {
    if (!req2) return false;
    return req1.tankId === req2.tankId && req1.rackId === req2.rackId && req1.boxId === req2.boxId;
  }

  /**
   * Force immediate load (bypasses debouncing)
   */
  public async forceLoad(tankId: string, rackId: string, boxId: string): Promise<LoadingResult> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    const request: LoadingRequest = {
      tankId,
      rackId,
      boxId,
      timestamp: Date.now(),
    };

    return await this.executeLoad(request);
  }

  /**
   * Check if currently loading
   */
  public getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Clear any pending loads
   */
  public cancelPendingLoads(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    this.currentRequest = undefined;
  }
}

// Export singleton instance
export const dataLoadingService = DataLoadingService.getInstance();
