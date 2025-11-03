/**
 * Cache Warming Service
 * Phase 3 Step 2: Intelligent prefetching and cache warming strategies
 * 
 * Proactively loads commonly needed data to improve perceived performance.
 * Integrates with Socket → Query Cache Bridge for optimal real-time updates.
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@app/queryKeys';
import { DOMAIN_QUERY_OPTIONS } from '@app/queryClient';
import { NAMING_PATTERNS } from '@odysseus/shared-schemas';

/**
 * Cache warming priorities based on user behavior patterns
 */
export enum WarmingPriority {
  CRITICAL = 0,    // Load immediately (blocking)
  HIGH = 1,        // Load early (background, high priority)
  MEDIUM = 2,      // Load after critical data
  LOW = 3,         // Load when idle
}

/**
 * Cache warming strategy configuration
 */
interface WarmingStrategy {
  priority: WarmingPriority;
  prefetchTimeout?: number;    // Max time to wait for prefetch
  retryOnError?: boolean;      // Retry if prefetch fails
  dependencies?: string[];     // Other data to load first
}

/**
 * Cache Warming Service
 * 
 * Intelligently prefetches data based on user patterns and app state
 */
export class CacheWarmingService {
  private queryClient: QueryClient;
  private isWarming = false;
  private warmingQueue: Array<{ queryKey: any[]; strategy: WarmingStrategy }> = [];

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Start the cache warming process during app bootstrap
   */
  public async startWarming(): Promise<void> {
    if (this.isWarming) {
      console.log('🔥 [CacheWarming] Already in progress, skipping');
      return;
    }

    this.isWarming = true;
    console.log('🔥 [CacheWarming] Starting intelligent cache warming');

    try {
      // Phase 1: Critical data (blocking)
      await this.warmCriticalData();
      
      // Phase 2: High priority data (background)
      this.warmHighPriorityData();
      
      // Phase 3: Medium priority data (when critical data is loaded)
      setTimeout(() => this.warmMediumPriorityData(), 1000);
      
      // Phase 4: Low priority data (when app is idle)
      this.scheduleIdleWarming();
      
    } catch (error) {
      console.error('❌ [CacheWarming] Failed to start warming:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm critical data that users need immediately
   */
  private async warmCriticalData(): Promise<void> {
    console.log('🔥 [CacheWarming] Loading critical data');
    
    const criticalQueries = [
      // All tubes - base list that UI will reuse for filtered views
      {
        queryKey: queryKeys.tubes.lists(),
        queryFn: async () => {
          const response = await fetch('/api/tubes');
          return response.json();
        },
        ...DOMAIN_QUERY_OPTIONS.tubes
      } as const,
      
      // All researchers - single canonical query that UI will reuse
      {
        queryKey: queryKeys.researchers.lists(),
        queryFn: async () => {
          const response = await fetch('/api/researchers');
          return response.json();
        },
        ...DOMAIN_QUERY_OPTIONS.researchers
      } as const,
      
      // Lab configuration - needed for navigation
      {
        queryKey: ['laboratory', 'configuration'] as const,
        queryFn: async () => {
          const response = await fetch('/api/laboratory/configuration');
          return response.json();
        },
        ...DOMAIN_QUERY_OPTIONS.configuration
      } as const
    ] as const;

    // Load critical data in parallel with ensureQueryData (blocks until data loaded)
    const promises = criticalQueries.map(query => 
      this.queryClient.ensureQueryData(query as any).catch(error => {
        console.warn(`Failed to load critical data for ${query.queryKey}:`, error);
        return null;
      })
    );

    await Promise.all(promises);
    console.log('[CacheWarming] Critical data loaded and cached');
  }

  /**
   * Warm high priority data in the background
   */
  private warmHighPriorityData(): void {
    console.log('🔥 [CacheWarming] Loading high priority data');

    // Get user's current location context
    const currentLocation = this.getCurrentUserLocation();
    
    if (currentLocation) {
      // Prefetch tubes for current location
      this.queryClient.prefetchQuery({
        queryKey: queryKeys.tubes.location(
          currentLocation.tankId, 
          currentLocation.rackId, 
          currentLocation.boxId
        ),
        queryFn: async () => {
          const response = await fetch(
            `/api/tubes?tankId=${currentLocation.tankId}&rackId=${currentLocation.rackId}&boxId=${currentLocation.boxId}`
          );
          return response.json();
        },
        ...DOMAIN_QUERY_OPTIONS.tubes
      }).catch(error => {
        console.warn('Failed to prefetch location tubes:', error);
      });
    }

    // Prefetch statistics (commonly viewed)
    this.queryClient.prefetchQuery({
      queryKey: queryKeys.tubes.stats(),
      queryFn: async () => {
        const response = await fetch('/api/tubes/statistics');
        return response.json();
      },
      ...DOMAIN_QUERY_OPTIONS.statistics
    }).catch(error => {
      console.warn('Failed to prefetch statistics:', error);
    });
  }

  /**
   * Warm medium priority data after initial load
   */
  private warmMediumPriorityData(): void {
    console.log('🔥 [CacheWarming] Loading medium priority data');

    // Prefetch adjacent locations (user might navigate there)
    const currentLocation = this.getCurrentUserLocation();
    if (currentLocation) {
      this.prefetchAdjacentLocations(currentLocation);
    }

    // Prefetch recent search results from history
    this.prefetchRecentSearches();
  }

  /**
   * Schedule low priority warming during idle time
   */
  private scheduleIdleWarming(): void {
    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        this.warmLowPriorityData();
      }, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => this.warmLowPriorityData(), 5000);
    }
  }

  /**
   * Warm low priority data when system is idle
   */
  private warmLowPriorityData(): void {
    console.log('🔥 [CacheWarming] Loading low priority data');

    // Skip - researchers already loaded in critical phase
    // No need to fetch includeInactive separately unless specifically needed

    // Prefetch system configuration
    this.queryClient.prefetchQuery({
      queryKey: ['system', 'configuration'],
      queryFn: async () => {
        const response = await fetch('/api/system/configuration');
        return response.json();
      },
      ...DOMAIN_QUERY_OPTIONS.configuration
    }).catch(error => {
      console.warn('Failed to prefetch system config:', error);
    });
  }

  /**
   * Smart prefetching based on navigation patterns
   */
  public prefetchForNavigation(targetLocation: { tankId: string; rackId: string; boxId: string }): void {
    console.log('🎯 [CacheWarming] Prefetching for navigation to:', targetLocation);

    // Prefetch tubes for target location
    this.queryClient.prefetchQuery({
      queryKey: queryKeys.tubes.location(
        targetLocation.tankId,
        targetLocation.rackId,
        targetLocation.boxId
      ),
      queryFn: async () => {
        const response = await fetch(
          `/api/tubes?tankId=${targetLocation.tankId}&rackId=${targetLocation.rackId}&boxId=${targetLocation.boxId}`
        );
        return response.json();
      },
      ...DOMAIN_QUERY_OPTIONS.tubes
    }).catch(error => {
      console.warn('Failed to prefetch navigation target:', error);
    });

    // Prefetch adjacent locations as well
    this.prefetchAdjacentLocations(targetLocation);
  }

  /**
   * Prefetch data for locations adjacent to the current one
   */
  private prefetchAdjacentLocations(location: { tankId: string; rackId: string; boxId: string }): void {
    // This is a simplified example - real implementation would calculate adjacent boxes/racks
    const adjacentBoxes = this.getAdjacentBoxes(location);
    
    adjacentBoxes.forEach(box => {
      this.queryClient.prefetchQuery({
        queryKey: queryKeys.tubes.location(box.tankId, box.rackId, box.boxId),
        queryFn: async () => {
          const response = await fetch(
            `/api/tubes?tankId=${box.tankId}&rackId=${box.rackId}&boxId=${box.boxId}`
          );
          return response.json();
        },
        ...DOMAIN_QUERY_OPTIONS.tubes,
        staleTime: DOMAIN_QUERY_OPTIONS.tubes.staleTime / 2, // Shorter stale time for prefetched data
      }).catch(error => {
        // Silently fail for adjacent locations (not critical)
        console.debug('Adjacent location prefetch failed:', error);
      });
    });
  }

  /**
   * Prefetch recent search results from user history
   */
  private prefetchRecentSearches(): void {
    // Get recent search queries from local storage or user preferences
    const recentSearches = this.getRecentSearchQueries();
    
    recentSearches.slice(0, 3).forEach(searchQuery => {
      this.queryClient.prefetchQuery({
        queryKey: queryKeys.search.results(searchQuery.query, searchQuery.filters),
        queryFn: async () => {
          const params = new URLSearchParams({
            q: searchQuery.query,
            ...searchQuery.filters
          });
          const response = await fetch(`/api/search/tubes?${params}`);
          return response.json();
        },
        ...DOMAIN_QUERY_OPTIONS.search
      }).catch(error => {
        console.debug('Recent search prefetch failed:', error);
      });
    });
  }

  /**
   * Invalidate and refresh specific data types
   */
  public async refreshCriticalData(): Promise<void> {
    console.log('🔄 [CacheWarming] Refreshing critical data');
    
    await Promise.allSettled([
      this.queryClient.invalidateQueries({ queryKey: queryKeys.researchers.lists() }),
      this.queryClient.invalidateQueries({ queryKey: ['laboratory', 'configuration'] }),
      this.queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() })
    ]);
  }

  /**
   * Get current user location context (simplified)
   */
  private getCurrentUserLocation(): { tankId: string; rackId: string; boxId: string } | null {
    // This would integrate with navigation state or user preferences
    // For now, return a default or null
    return {
      tankId: NAMING_PATTERNS.TANK.ID_PATTERN(1),
      rackId: '1',
      boxId: 'A'
    };
  }

  /**
   * Get adjacent boxes for prefetching (simplified)
   */
  private getAdjacentBoxes(location: { tankId: string; rackId: string; boxId: string }): Array<{ tankId: string; rackId: string; boxId: string }> {
    // Simplified example - real implementation would use proper grid logic
    const boxes = ['A', 'B', 'C', 'D'];
    const currentIndex = boxes.indexOf(location.boxId);
    
    const adjacent = [];
    if (currentIndex > 0) {
      adjacent.push({ ...location, boxId: boxes[currentIndex - 1] });
    }
    if (currentIndex < boxes.length - 1) {
      adjacent.push({ ...location, boxId: boxes[currentIndex + 1] });
    }
    
    return adjacent;
  }

  /**
   * Get recent search queries from user history
   */
  private getRecentSearchQueries(): Array<{ query: string; filters: Record<string, any> }> {
    // This would integrate with search history or user preferences
    // For now, return empty array
    return [];
  }
}

/**
 * Global cache warming service instance
 */
let globalCacheWarmingService: CacheWarmingService | null = null;

/**
 * Get or create global cache warming service
 */
export const getCacheWarmingService = (queryClient: QueryClient): CacheWarmingService => {
  if (!globalCacheWarmingService) {
    globalCacheWarmingService = new CacheWarmingService(queryClient);
  }
  return globalCacheWarmingService;
};

/**
 * Initialize cache warming during app bootstrap
 */
export const initializeCacheWarming = async (queryClient: QueryClient): Promise<void> => {
  const service = getCacheWarmingService(queryClient);
  await service.startWarming();
};
