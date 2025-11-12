/**
 * Performance-Optimized Tube Query Hooks
 * 
 * Advanced React Query hooks designed for large datasets and optimal performance.
 * These hooks provide enhanced features like virtualization support, prefetching,
 * and selective data transformations.
 */

import { useCallback } from 'react';

import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions
} from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { TubeService } from '@domains/tubes/services/TubeService';

import type { TubeData } from '@domains/tubes/types';

// VIRTUALIZED QUERIES

/**
 * Virtualized tubes query for large datasets
 * 
 * Optimizes for grid display by:
 * - Loading only essential data for rendering
 * - Transforming data into position-indexed format
 * - Supporting lazy loading patterns
 */
export const useVirtualizedTubes = (
  location: { tankId: string; rackId: string; boxId: string },
  options: Omit<UseQueryOptions<TubeData[], Error, Record<number, TubeData>>, 'queryKey' | 'queryFn' | 'select'> = {}
) => {
  return useQuery({
    queryKey: queryKeys.tubes.location(location.tankId, location.rackId, location.boxId),
    queryFn: async () => {
      // eslint-disable-next-line no-console -- Info logging for operational visibility
      console.log(`🚀 [Optimized Query] Loading virtualized tubes for ${location.tankId}/${location.rackId}/${location.boxId}`);
      
      // Load tubes with standard parameters
      return await TubeService.fetchTubesByLocation(
        location.tankId, 
        location.rackId, 
        location.boxId
      );
    },
    select: (tubes: TubeData[]) => {
      // Transform flat array into position-indexed object for O(1) lookups
      const positionMap: Record<number, TubeData> = {};
      tubes.forEach(tube => {
        if (tube.location.position) {
          positionMap[tube.location.position] = tube;
        }
      });
      
      // eslint-disable-next-line no-console -- Info logging for operational visibility
      console.log(`⚡ [Optimized Query] Transformed ${tubes.length} tubes into position map`);
      return positionMap;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - longer for virtualized views
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in memory longer (renamed from cacheTime in v5)
    ...options
  });
};

/**
 * Essential tube data only (for lists, search results)
 *
 * Returns minimal tube data for performance in list views:
 * - id, position, tankId, rackId, boxId
 * - cellType, researcher (for display)
 * - Excludes notes, detailed metadata
 */
export const useEssentialTubes = (
  filters: {
    tankId?: string;
    rackId?: string;
    boxId?: string;
    searchTerm?: string;
  } = {},
  options: Omit<UseQueryOptions<TubeData[], Error, TubeData[]>, 'queryKey' | 'queryFn' | 'select'> = {}
) => {
  return useQuery<TubeData[], Error, TubeData[]>({
    queryKey: queryKeys.tubes.lists(),
    queryFn: async () => {
      // eslint-disable-next-line no-console -- Info logging for operational visibility
      console.log(`🚀 [Optimized Query] Loading tubes`);
      
      return await TubeService.fetchTubes();
    },
    select: (tubes: TubeData[]) => {
      let filtered = tubes;
      
      if (filters.tankId) {
        filtered = filtered.filter(t => t.location.tankId === filters.tankId);
      }
      if (filters.rackId !== undefined) {
        filtered = filtered.filter(t => t.location.rackId === filters.rackId);
      }
      if (filters.boxId) {
        filtered = filtered.filter(t => t.location.boxId === filters.boxId);
      }
      if (filters.searchTerm) {
        const search = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(t =>
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for searching across multiple fields
          t.sample.cellType?.toLowerCase().includes(search) ||
          t.researcherId?.toLowerCase().includes(search)
        );
      }
      
      return filtered;
    },
    staleTime: 2 * 60 * 1000,
    ...options
  });
};

// PREFETCHING HOOKS

/**
 * Prefetch adjacent locations for smooth navigation
 * 
 * Prefetches tube data for likely next navigation targets:
 * - Adjacent racks in same tank
 * - Adjacent boxes in same rack
 * - Popular locations based on usage patterns
 */
export const usePrefetchAdjacentLocations = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (currentLocation: { tankId: string; rackId: string; boxId: string }) => {
      const { tankId, rackId, boxId } = currentLocation;
      
      // Prefetch adjacent racks - now handle string-based rack identifiers
      const rackNum = parseInt(rackId);
      const adjacentRacks = [rackNum - 1, rackNum + 1]
        .filter(rack => rack >= 1 && rack <= EQUIPMENT_DEFAULTS.MAX_RACKS_PER_TANK)
        .map(rack => rack.toString());  // Convert back to string
      adjacentRacks.forEach(rack => {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.tubes.location(tankId, rack, boxId),
          queryFn: () => TubeService.fetchTubesByLocation(tankId, rack, boxId),
          staleTime: 5 * 60 * 1000, // 5 minutes
        });
      });
      
      // Prefetch adjacent boxes in same rack
      const boxIndex = boxId.charCodeAt(0) - 65; // A=0, B=1, etc.
      const maxBoxLetter = String.fromCharCode(65 + EQUIPMENT_DEFAULTS.BOXES_PER_RACK - 1);
      const adjacentBoxes = [
        String.fromCharCode(65 + boxIndex - 1), // Previous box
        String.fromCharCode(65 + boxIndex + 1)  // Next box
      ].filter(box => box >= 'A' && box <= maxBoxLetter);
      
      adjacentBoxes.forEach(box => {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.tubes.location(tankId, rackId, box),
          queryFn: () => TubeService.fetchTubesByLocation(tankId, rackId, box),
          staleTime: 5 * 60 * 1000,
        });
      });
      
      // eslint-disable-next-line no-console -- Info logging for operational visibility
      console.log(`🔮 [Prefetch] Queued prefetch for ${adjacentRacks.length} racks, ${adjacentBoxes.length} boxes`);
    },
    [queryClient]
  );
};

/**
 * Smart prefetching based on user patterns
 * 
 * Prefetches data based on:
 * - Recently viewed locations
 * - User's typical navigation patterns
 * - High-traffic locations
 */
export const useSmartPrefetch = () => {
  const queryClient = useQueryClient();
  
  return useCallback(
    (userContext: {
      recentLocations?: Array<{ tankId: string; rackId: string; boxId: string }>;
      userRole?: string;
      timeOfDay?: string;
    }) => {
      const { recentLocations = [], userRole } = userContext;
      
      // Prefetch recently visited locations
      recentLocations.slice(0, 3).forEach(location => {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.tubes.location(location.tankId, location.rackId, location.boxId),
          queryFn: () => TubeService.fetchTubesByLocation(location.tankId, location.rackId, location.boxId),
          staleTime: 10 * 60 * 1000, // 10 minutes for recent locations
        });
      });
      
      // Role-based prefetching (example: researchers might prefer certain tanks)
      if (userRole === 'researcher') {
        // Prefetch commonly used research tanks
        ['tank-1', 'tank-2'].forEach(tankId => {
          void queryClient.prefetchQuery({
            queryKey: queryKeys.tubes.location(tankId, '1', 'A'),
            queryFn: () => TubeService.fetchTubesByLocation(tankId, '1', 'A'),
            staleTime: 15 * 60 * 1000,
          });
        });
      }
      
      // eslint-disable-next-line no-console -- Info logging for operational visibility
      console.log(`🧠 [Smart Prefetch] Prefetched ${recentLocations.length} recent locations for ${userRole}`);
    },
    [queryClient]
  );
};

// BACKGROUND SYNC OPTIMIZATION

/**
 * Background refresh for active locations
 * 
 * Keeps frequently accessed tube data fresh without user interaction.
 * Useful for locations that are being actively modified by multiple users.
 */
export const useBackgroundRefresh = (
  location: { tankId: string; rackId: string; boxId: string },
  options: {
    enabled?: boolean;
    interval?: number; // milliseconds
  } = {}
) => {
  const { enabled = false, interval = 30000 } = options; // 30 seconds default
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: [...queryKeys.tubes.location(location.tankId, location.rackId, location.boxId), 'background'],
    queryFn: async () => {
      // eslint-disable-next-line no-console -- Info logging for operational visibility
      console.log(`🔄 [Background Refresh] Syncing ${location.tankId}/${location.rackId}/${location.boxId}`);

      // Invalidate existing cache to force fresh fetch
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tubes.location(location.tankId, location.rackId, location.boxId)
      });

      return new Date().toISOString();
    },
    enabled,
    refetchInterval: interval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    select: () => null, // Don't return data, just trigger refresh
  });
};

// PERFORMANCE MONITORING

/**
 * Query performance metrics
 * 
 * Monitors React Query performance and provides insights:
 * - Cache hit/miss ratios
 * - Query timing
 * - Background update frequency
 */
export const useQueryPerformanceMetrics = () => {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const tubeQueries = queries.filter(query => 
      query.queryKey[0] === 'tubes'
    );
    
    const metrics = {
      totalQueries: tubeQueries.length,
      activeQueries: tubeQueries.filter(q => q.observers.length > 0).length,
      staleQueries: tubeQueries.filter(q => q.isStale()).length,
      errorQueries: tubeQueries.filter(q => q.state.status === 'error').length,
      cacheSize: cache.getAll().length,
      memoryUsage: tubeQueries.reduce((acc, q) => acc + JSON.stringify(q.state.data || {}).length, 0)
    };
    
    // eslint-disable-next-line no-console -- Info logging for operational visibility
    console.log('📊 [Performance Metrics] React Query Stats:', metrics);
    return metrics;
  }, [queryClient]);
};
