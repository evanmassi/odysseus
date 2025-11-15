/**
 * Tube Query Hooks
 *
 * React Query hooks for tube read operations.
 *
 * - Uses TubeService
 * - Type-safe with centralized query keys
 * - Smart caching and background refresh
 * - Consistent error handling and loading states
 */

import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { TubeService } from '@domains/tubes/services/TubeService';

import type { TubeData } from '@domains/tubes/types';

// QUERY HOOKS (READ OPERATIONS)

/**
 * Get all tubes with optional filtering
 *
 * Uses canonical base query with client-side filtering via select
 * Replaces: tubeStore.loadTubes()
 */
export const useTubes = (
  filters: {
    tankId?: string;
    rackId?: string;
    boxId?: string;
    searchTerm?: string;
  } = {},
  options: Omit<
    UseQueryOptions<TubeData[], Error, TubeData[]>,
    'queryKey' | 'queryFn' | 'select'
  > = {}
) => {
  return useQuery<TubeData[], Error, TubeData[]>({
    queryKey: queryKeys.tubes.lists(),
    queryFn: async (): Promise<TubeData[]> => {
      return (await TubeService.fetchTubes()) as TubeData[];
    },
    select: (tubes: TubeData[]): TubeData[] => {
      let filtered = tubes;

      if (filters.tankId) {
        filtered = filtered.filter(tube => tube.location.tankId === filters.tankId);
      }

      if (filters.rackId !== undefined) {
        filtered = filtered.filter(tube => tube.location.rackId === filters.rackId);
      }

      if (filters.boxId) {
        filtered = filtered.filter(tube => tube.location.boxId === filters.boxId);
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(
          tube =>
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for multi-field search
            tube.sample.cellType?.toLowerCase().includes(searchLower) ||
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for multi-field search
            tube.sample.donorInternalId?.toLowerCase().includes(searchLower) ||
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for multi-field search
            tube.sample.donorSourceId?.toLowerCase().includes(searchLower) ||
            tube.sample.notes?.toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Get tubes by specific location (tank/rack/box)
 *
 * Replaces: tubeStore.loadTubesForLocation()
 */
export const useTubesByLocation = (
  tankId: string,
  rackId: string,
  boxId: string,
  options: Omit<UseQueryOptions<TubeData[]>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery({
    queryKey: queryKeys.tubes.location(tankId, rackId, boxId),
    queryFn: async (): Promise<TubeData[]> => {
      return await TubeService.fetchTubesByLocation(tankId, rackId, boxId);
    },
    enabled: !!(tankId && rackId && boxId), // Only run if all params provided
    staleTime: 5 * 60 * 1000, // 5 minutes - WebSocket keeps data fresh
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Get single tube by ID
 *
 * New functionality - enables individual tube queries
 */
export const useTube = (
  id: string,
  options: Omit<UseQueryOptions<TubeData>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery({
    queryKey: queryKeys.tubes.detail(id),
    queryFn: async (): Promise<TubeData> => {
      return await TubeService.fetchTubeById(id);
    },
    enabled: !!id, // Only run if ID provided
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000, // Individual tubes cached longer
    ...options,
  });
};

/**
 * Get tubes with infinite scrolling for large datasets
 *
 * Replaces: tubeStore.loadMoreTubes() pagination logic
 */
export const useInfiniteTubes = (
  filters: {
    tankId?: string;
    rackId?: string;
    boxId?: string;
    searchTerm?: string;
  } = {},
  options: Omit<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Query generic types for flexible query data structure
    UseInfiniteQueryOptions<any, Error, any, any, number>,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
  > = {}
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.tubes.paginated(filters),
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      let tubes = await TubeService.fetchTubes();

      // Apply client-side filtering
      if (filters.tankId) {
        tubes = tubes.filter(tube => tube.location.tankId === filters.tankId);
      }

      if (filters.rackId !== undefined) {
        tubes = tubes.filter(tube => tube.location.rackId === filters.rackId);
      }

      if (filters.boxId) {
        tubes = tubes.filter(tube => tube.location.boxId === filters.boxId);
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        tubes = tubes.filter(
          tube =>
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for multi-field search
            tube.sample.cellType?.toLowerCase().includes(searchLower) ||
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for multi-field search
            tube.sample.donorInternalId?.toLowerCase().includes(searchLower) ||
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for multi-field search
            tube.sample.donorSourceId?.toLowerCase().includes(searchLower) ||
            tube.sample.notes?.toLowerCase().includes(searchLower)
        );
      }

      const hasMore = tubes.length === 50; // Client-side pagination

      return {
        tubes,
        nextOffset: hasMore ? pageParam + 50 : undefined,
        hasMore,
      };
    },
    getNextPageParam: lastPage => lastPage.nextOffset,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Search tubes with advanced filtering
 *
 * New functionality - dedicated search queries
 */
export const useSearchTubes = (
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic search filters with varying field types
  filters: Record<string, any> = {},
  options: Omit<UseQueryOptions<TubeData[]>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery({
    queryKey: queryKeys.search.results(query, filters),
    queryFn: async (): Promise<TubeData[]> => {
      return await TubeService.searchTubes(query, { limit: 100, offset: 0 });
    },
    enabled: !!query && query.length >= 2, // Only search with 2+ characters
    staleTime: 2 * 60 * 1000, // Search results stale faster
    gcTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get bulk tubes by IDs
 *
 * Used by bulk operations and multi-select scenarios
 */
export const useBulkTubes = (
  tubeIds: string[],
  options: Omit<UseQueryOptions<TubeData[]>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery({
    queryKey: ['tubes', 'bulk', { tubeIds: tubeIds.sort(), length: tubeIds.length }],
    queryFn: async (): Promise<TubeData[]> => {
      if (tubeIds.length === 0) {
        return [];
      }

      // Fetch all tubes in parallel
      const tubes = await Promise.all(tubeIds.map(id => TubeService.fetchTubeById(id)));
      return tubes;
    },
    enabled: tubeIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};

// UTILITY HOOKS

/**
 * Prefetch tubes for a location (for smooth navigation)
 *
 * Replaces: Manual cache warming in navigation
 */
export const usePrefetchTubeLocation = () => {
  const queryClient = useQueryClient();

  const prefetchLocation = async (tankId: string, rackId: string, boxId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.tubes.location(tankId, rackId, boxId),
      queryFn: async () => {
        return await TubeService.fetchTubesByLocation(tankId, rackId, boxId);
      },
      staleTime: 2 * 60 * 1000,
    });
  };

  return { prefetchLocation };
};

/**
 * Get tube statistics and aggregations
 *
 * New functionality - analytics queries
 */
export const useTubeStats = (
  tankId?: string,
  rackId?: string,
  boxId?: string, // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic stats data structure
  options: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery({
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string IDs are invalid, use 'all' for aggregated queries
    queryKey: [...queryKeys.tubes.locationStats(tankId || 'all', rackId || 'all'), boxId || 'all'],
    queryFn: async () => {
      // Get all tubes for statistics
      let tubes = await TubeService.fetchTubes();

      // Filter by location if specified
      if (tankId && tankId !== 'all') {
        tubes = tubes.filter(tube => tube.location.tankId === tankId);
      }
      if (rackId !== undefined) {
        tubes = tubes.filter(tube => tube.location.rackId === rackId);
      }
      if (boxId) {
        tubes = tubes.filter(tube => tube.location.boxId === boxId);
      }

      // Calculate statistics
      const stats = {
        total: tubes.length,
        byTank: {} as Record<string, number>,
        byRack: {} as Record<string, number>,
        byBox: {} as Record<string, number>,
        byResearcher: {} as Record<string, number>,
        byCellType: {} as Record<string, number>,
        emptyPositions: 0,
        occupiedPositions: tubes.length,
      };

      tubes.forEach(tube => {
        // Tank statistics
        stats.byTank[tube.location.tankId] = (stats.byTank[tube.location.tankId] || 0) + 1;

        // Rack statistics
        stats.byRack[tube.location.rackId] = (stats.byRack[tube.location.rackId] || 0) + 1;

        // Box statistics
        stats.byBox[tube.location.boxId] = (stats.byBox[tube.location.boxId] || 0) + 1;

        // Researcher statistics
        if (tube.researcherId) {
          stats.byResearcher[tube.researcherId] = (stats.byResearcher[tube.researcherId] || 0) + 1;
        }

        // Cell type statistics
        if (tube.sample.cellType) {
          stats.byCellType[tube.sample.cellType] =
            (stats.byCellType[tube.sample.cellType] || 0) + 1;
        }
      });

      return stats;
    },
    staleTime: 10 * 60 * 1000, // Statistics stale slower (10 minutes)
    gcTime: 30 * 60 * 1000, // Keep stats longer in cache
    ...options,
  });
};
