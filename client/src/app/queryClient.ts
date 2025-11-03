/**
 * React Query Client Configuration - Optimized for Socket-Driven Real-time Updates
 * Phase 3 Step 2: Tuned for performance with centralized socket integration
 */
import { QueryClient, DefaultOptions, QueryCache, MutationCache } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { env } from '@shared/config';

/**
 * Cache timing constants optimized for socket-driven updates
 */
export const CACHE_TIMES = {
  // Fast-changing data (updated frequently via socket)
  REAL_TIME: {
    staleTime: 3 * 60 * 1000,      // 3 minutes - socket keeps it fresh
    gcTime: 15 * 60 * 1000,        // 15 minutes - keep in memory longer
  },
  
  // Medium-changing data (occasional socket updates)
  MEDIUM: {
    staleTime: 10 * 60 * 1000,     // 10 minutes
    gcTime: 30 * 60 * 1000,        // 30 minutes
  },
  
  // Slow-changing data (rare socket updates)
  STABLE: {
    staleTime: 30 * 60 * 1000,     // 30 minutes  
    gcTime: 60 * 60 * 1000,        // 1 hour
  },
  
  // Configuration data (almost never changes)
  CONFIG: {
    staleTime: 60 * 60 * 1000,     // 1 hour
    gcTime: 2 * 60 * 60 * 1000,    // 2 hours
  },
  
  // Search results (dynamic, short-lived)
  SEARCH: {
    staleTime: 2 * 60 * 1000,      // 2 minutes
    gcTime: 10 * 60 * 1000,        // 10 minutes
  }
} as const;

/**
 * Smart retry strategy with exponential backoff (for queries)
 */
const retryLogic = (failureCount: number, error: any): boolean => {
  // Don't retry client errors (4xx)
  if (error?.status >= 400 && error?.status < 500) {
    return false;
  }

  // Don't retry authentication errors
  if (error?.status === 401 || error?.status === 403) {
    return false;
  }

  // Retry up to 3 times for server errors and network issues
  return failureCount < 3;
};

/**
 * Smart mutation retry strategy - only retry transient failures
 */
const mutationRetryLogic = (failureCount: number, error: any): boolean => {
  // Never retry client errors (4xx) - these are validation/business logic failures
  if (error?.status >= 400 && error?.status < 500) {
    return false;
  }

  // Retry server errors (5xx) and network failures up to 2 times
  if (error?.status >= 500 || error?.status === 0) {
    return failureCount < 2;
  }

  // Don't retry anything else (including success - mutations should never retry on success)
  return false;
};

/**
 * Smart retry delay with exponential backoff and jitter
 */
const retryDelay = (attemptIndex: number): number => {
  // Exponential backoff: 1s, 2s, 4s, capped at 30s
  const exponentialDelay = Math.min(1000 * (2 ** attemptIndex), 30000);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000;
  
  return exponentialDelay + jitter;
};

/**
 * Global error handler for queries
 */
const handleQueryError = (error: any, query: any): void => {
  if (env.isDev()) {
    console.error('Query failed:', {
      queryKey: query.queryKey,
      error: error?.message || String(error),
      status: error?.status
    });
  }
  
  if (error?.status >= 500) {
    toast.error('Server error occurred. Please try again.');
  } else if (error?.status === 0 || error?.code === 'NETWORK_ERROR') {
    toast.error('Network error. Check your connection.');
  }
};

/**
 * Global error handler for mutations
 */
const handleMutationError = (error: any, variables: any, context: any, mutation: any): void => {
  if (env.isDev()) {
    // Extract original error if wrapped by InfrastructureError
    const originalError = error?.details?.originalError || error;

    console.error('Mutation failed:', {
      mutationKey: mutation.options.mutationKey,
      wrapperMessage: error?.message,
      originalError: originalError,
      status: error?.status || originalError?.status,
      errorDetails: error?.details,
      variables,
    });

    // Log full error object for deep inspection
    console.error('Full error object:', error);
    if (originalError !== error) {
      console.error('Original unwrapped error:', originalError);
    }
  }

  if (error?.status >= 500) {
    toast.error('Server error. Your changes could not be saved.');
  } else if (error?.status >= 400 && error?.status < 500) {
    toast.error(error?.message || 'Invalid request. Please check your input.');
  } else {
    toast.error('Network error. Please try again.');
  }
};

/**
 * Optimized default options for socket-driven architecture
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Use medium timing as default (most data types)
    staleTime: CACHE_TIMES.MEDIUM.staleTime,
    gcTime: CACHE_TIMES.MEDIUM.gcTime,
    
    // Disable window focus refetch (rely on socket updates)
    refetchOnWindowFocus: false,
    
    // Enable reconnect refetch (sync after network issues)
    refetchOnReconnect: true,
    
    // Disable mount refetch if data exists (socket keeps it fresh)
    refetchOnMount: false, // Socket updates keep data fresh
    
    // Smart retry strategy
    retry: retryLogic,
    retryDelay: retryDelay,
    
    // TanStack Query v5: onError moved to queryCache/mutationCache (handled below)
    
    // Enable background refetching for stale data
    refetchInterval: false, // Disabled by default, enabled per-query if needed
    refetchIntervalInBackground: false,
    
    // Network mode - continue with cached data when offline
    networkMode: 'online', // 'online' | 'always' | 'offlineFirst'
  },
  
  mutations: {
    // Smart retry - only retry transient failures (5xx, network), never client errors (4xx) or success
    retry: mutationRetryLogic,
    retryDelay: retryDelay,

    // Network mode for mutations
    networkMode: 'online',
  }
};

/**
 * Performance monitoring for cache efficiency
 */
export const cacheMetrics = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  
  recordHit(): void {
    this.hits++;
  },
  
  recordMiss(): void {
    this.misses++;
  },
  
  recordInvalidation(): void {
    this.invalidations++;
  },
  
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  },
  
  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.invalidations = 0;
  },
  
  getStats(): { hits: number; misses: number; hitRate: string; invalidations: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: `${(this.getHitRate() * 100).toFixed(1)}%`,
      invalidations: this.invalidations
    };
  }
};

/**
 * Optimized QueryClient instance for socket-driven real-time updates
 */
export const queryClient = new QueryClient({
  defaultOptions,
  
  // TanStack Query v5: Error handling through queryCache and mutationCache
  queryCache: new QueryCache({
    onError: (error, query) => {
      handleQueryError(error, query);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      handleMutationError(error, variables, context, mutation);
    },
  }),
});



/**
 * Domain-specific query options for different data types
 * Use these in individual hooks for optimal caching per domain
 */
export const DOMAIN_QUERY_OPTIONS = {
  // Tube data - frequently updated via socket
  tubes: {
    staleTime: CACHE_TIMES.REAL_TIME.staleTime,
    gcTime: CACHE_TIMES.REAL_TIME.gcTime,
    refetchOnMount: false, // Socket keeps it fresh
  },
  
  // Researcher data - occasionally updated
  researchers: {
    staleTime: CACHE_TIMES.STABLE.staleTime,
    gcTime: CACHE_TIMES.STABLE.gcTime,
    refetchOnMount: false, // Socket keeps it fresh
  },
  
  // Configuration data - rarely changes
  configuration: {
    staleTime: CACHE_TIMES.CONFIG.staleTime,
    gcTime: CACHE_TIMES.CONFIG.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Very stable data
  },
  
  // Search results - dynamic and short-lived
  search: {
    staleTime: CACHE_TIMES.SEARCH.staleTime,
    gcTime: CACHE_TIMES.SEARCH.gcTime,
    refetchOnMount: true, // Always fresh search results
  },
  
  // Statistics - derived data that changes with tube updates
  statistics: {
    staleTime: CACHE_TIMES.REAL_TIME.staleTime,
    gcTime: CACHE_TIMES.REAL_TIME.gcTime,
    refetchOnMount: false, // Invalidated by socket events
  }
} as const;
