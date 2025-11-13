/**
 * Performance Monitoring for React Query Cache
 * Phase 3 Step 2: Monitor cache efficiency and performance metrics
 *
 * Provides insights into cache hit rates, query performance, and optimization opportunities.
 */

import { useEffect, useState } from 'react';

import { cacheMetrics } from '@app/queryClient';

import type { QueryClient } from '@tanstack/react-query';

/**
 * Performance metrics interface
 */
export interface CachePerformanceMetrics {
  cacheHitRate: number;
  totalQueries: number;
  cacheSize: number;
  mutationsInProgress: number;
  backgroundRefetches: number;
  lastUpdated: number;
}

/**
 * Query performance tracking
 */
export interface QueryPerformanceInfo {
  queryKey: string;
  averageLoadTime: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  lastFetched: number;
}

/**
 * Performance monitoring service for React Query cache
 */
export class CachePerformanceMonitor {
  private queryClient: QueryClient;
  private queryPerformance: Map<string, QueryPerformanceInfo> = new Map();
  private startTimes: Map<string, number> = new Map();

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupMonitoring();
  }

  /**
   * Set up monitoring event listeners
   */
  private setupMonitoring(): void {
    // Monitor query start and end times for performance tracking
    const originalFetch = this.queryClient.fetchQuery.bind(this.queryClient);

    this.queryClient.fetchQuery = async <TQueryFnData = unknown, _TError = Error>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Query fetchQuery options with flexible structure
      options: any
    ): Promise<TQueryFnData> => {
      const queryKeyStr = JSON.stringify(options.queryKey);
      this.startTimes.set(queryKeyStr, performance.now());

      try {
        const result = await originalFetch(options);
        this.recordQuerySuccess(queryKeyStr);
        return result as TQueryFnData;
      } catch (error) {
        this.recordQueryError(queryKeyStr);
        throw error;
      }
    };
  }

  /**
   * Record successful query completion
   */
  private recordQuerySuccess(queryKey: string): void {
    const startTime = this.startTimes.get(queryKey);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.updateQueryPerformance(queryKey, duration, false);
      this.startTimes.delete(queryKey);
    }
  }

  /**
   * Record query error
   */
  private recordQueryError(queryKey: string): void {
    const startTime = this.startTimes.get(queryKey);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.updateQueryPerformance(queryKey, duration, true);
      this.startTimes.delete(queryKey);
    }
  }

  /**
   * Update performance metrics for a query
   */
  private updateQueryPerformance(queryKey: string, loadTime: number, isError: boolean): void {
    const current = this.queryPerformance.get(queryKey) ?? {
      queryKey,
      averageLoadTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      lastFetched: Date.now(),
    };

    // Update average load time
    const totalRequests = current.cacheMisses + current.errors;
    current.averageLoadTime =
      (current.averageLoadTime * totalRequests + loadTime) / (totalRequests + 1);

    // Update counters
    if (isError) {
      current.errors++;
    } else {
      current.cacheMisses++; // Network request = cache miss
    }

    current.lastFetched = Date.now();
    this.queryPerformance.set(queryKey, current);
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): CachePerformanceMetrics {
    const queryCache = this.queryClient.getQueryCache();
    const mutationCache = this.queryClient.getMutationCache();

    const totalQueries = Array.from(this.queryPerformance.values()).reduce(
      (sum, perf) => sum + perf.cacheHits + perf.cacheMisses,
      0
    );

    const backgroundRefetches = queryCache
      .getAll()
      .filter(
        query => query.state.fetchStatus === 'fetching' && query.state.data !== undefined
      ).length;

    return {
      cacheHitRate: cacheMetrics.getHitRate(),
      totalQueries,
      cacheSize: queryCache.getAll().length,
      mutationsInProgress: mutationCache
        .getAll()
        .filter(mutation => mutation.state.status === 'pending').length,
      backgroundRefetches,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get performance info for all queries
   */
  public getQueryPerformance(): QueryPerformanceInfo[] {
    return Array.from(this.queryPerformance.values()).sort((a, b) => b.lastFetched - a.lastFetched);
  }

  /**
   * Get slow queries (above threshold)
   */
  public getSlowQueries(thresholdMs: number = 1000): QueryPerformanceInfo[] {
    return this.getQueryPerformance().filter(perf => perf.averageLoadTime > thresholdMs);
  }

  /**
   * Get queries with high error rates
   */
  public getErrorProneQueries(errorThreshold: number = 0.1): QueryPerformanceInfo[] {
    return this.getQueryPerformance().filter(perf => {
      const total = perf.cacheHits + perf.cacheMisses + perf.errors;
      return total > 0 && perf.errors / total > errorThreshold;
    });
  }

  /**
   * Get cache efficiency report
   */
  public getCacheEfficiencyReport(): {
    highPerformance: QueryPerformanceInfo[];
    needsOptimization: QueryPerformanceInfo[];
    recommendations: string[];
  } {
    const allQueries = this.getQueryPerformance();

    const highPerformance = allQueries.filter(perf => {
      const hitRate = perf.cacheHits / (perf.cacheHits + perf.cacheMisses);
      return hitRate > 0.8 && perf.averageLoadTime < 500;
    });

    const needsOptimization = allQueries.filter(perf => {
      const hitRate = perf.cacheHits / (perf.cacheHits + perf.cacheMisses);
      return hitRate < 0.6 || perf.averageLoadTime > 1000;
    });

    const recommendations: string[] = [];

    if (cacheMetrics.getHitRate() < 0.7) {
      recommendations.push('Consider increasing staleTime for frequently accessed queries');
    }

    if (needsOptimization.length > 5) {
      recommendations.push('Multiple queries need optimization - review caching strategies');
    }

    const slowQueries = this.getSlowQueries(1000);
    if (slowQueries.length > 0) {
      recommendations.push(`${slowQueries.length} queries are slow - consider API optimization`);
    }

    return {
      highPerformance,
      needsOptimization,
      recommendations,
    };
  }

  /**
   * Reset all performance metrics
   */
  public resetMetrics(): void {
    this.queryPerformance.clear();
    this.startTimes.clear();
    cacheMetrics.reset();
  }
}

/**
 * React hook for monitoring cache performance
 */
export function useCachePerformanceMonitoring(queryClient: QueryClient, intervalMs: number = 5000) {
  const [metrics, setMetrics] = useState<CachePerformanceMetrics | null>(null);
  const [monitor] = useState(() => new CachePerformanceMonitor(queryClient));

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(monitor.getMetrics());
    };

    // Initial update
    updateMetrics();

    // Set up periodic updates
    const interval = setInterval(updateMetrics, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [monitor, intervalMs]);

  return {
    metrics,
    monitor,
    getQueryPerformance: () => monitor.getQueryPerformance(),
    getSlowQueries: (threshold?: number) => monitor.getSlowQueries(threshold),
    getEfficiencyReport: () => monitor.getCacheEfficiencyReport(),
    resetMetrics: () => monitor.resetMetrics(),
  };
}

/**
 * Performance monitoring debug utilities
 * For development console debugging
 */
export function logCachePerformanceMetrics(queryClient: QueryClient) {
  const _queries = queryClient.getQueryCache().getAll();
}
