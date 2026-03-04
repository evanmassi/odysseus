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

import { type TubeData as SchemaTubeData } from '@odysseus/shared-schemas';
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { TubeService, type TubeStats } from '@domains/tubes/services/TubeService';
import { normalizeConcentration } from '@shared/utils/concentrationConverter';

import type { TubeData } from '@domains/tubes/types';

/**
 * Convert schema-based TubeData to shared TubeData format
 * Handles concentration type normalization from API responses
 */
function convertSchemaToSharedTubeData(schemaTube: SchemaTubeData): TubeData {
  return {
    ...schemaTube,
    sample: {
      ...schemaTube.sample,
      concentration: normalizeConcentration(schemaTube.sample.concentration),
    },
    timestamps: {
      createdAt: new Date(schemaTube.timestamps.createdAt),
      updatedAt: new Date(schemaTube.timestamps.updatedAt),
    },
  };
}

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
      const schemaTubes = await TubeService.fetchTubes();
      return schemaTubes.map(convertSchemaToSharedTubeData);
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
      const schemaTubes = await TubeService.fetchTubesByLocation(tankId, rackId, boxId);
      return schemaTubes.map(convertSchemaToSharedTubeData);
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
 * Uses initialData from any tube cache (lists, location queries, etc.) for instant loading
 */
export const useTube = (
  id: string,
  options: Omit<UseQueryOptions<TubeData>, 'queryKey' | 'queryFn'> = {}
) => {
  const queryClient = useQueryClient();

  // Search across all cached tube queries to find this tube for instant initial data
  const initialData = (): TubeData | undefined => {
    const allTubeQueries = queryClient.getQueriesData<TubeData[]>({
      queryKey: queryKeys.tubes.all,
    });

    for (const [, tubes] of allTubeQueries) {
      if (Array.isArray(tubes)) {
        const found = tubes.find(tube => tube.id === id);
        if (found) return found;
      }
    }

    return undefined;
  };

  return useQuery({
    queryKey: queryKeys.tubes.detail(id),
    queryFn: async (): Promise<TubeData> => {
      const schemaTube = await TubeService.fetchTubeById(id);
      return convertSchemaToSharedTubeData(schemaTube);
    },
    initialData,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
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
      const schemaTubes = await TubeService.fetchTubes();
      let tubes = schemaTubes.map(convertSchemaToSharedTubeData);

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
      const schemaTubes = await TubeService.searchTubes(query, { limit: 100, offset: 0 });
      return schemaTubes.map(convertSchemaToSharedTubeData);
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
      const schemaTubes = await Promise.all(tubeIds.map(id => TubeService.fetchTubeById(id)));
      return schemaTubes.map(convertSchemaToSharedTubeData);
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
        const schemaTubes = await TubeService.fetchTubesByLocation(tankId, rackId, boxId);
        return schemaTubes.map(convertSchemaToSharedTubeData);
      },
      staleTime: 2 * 60 * 1000,
    });
  };

  return { prefetchLocation };
};

/**
 * Get tube statistics and aggregations
 *
 * Fetches pre-computed statistics from the server instead of
 * downloading all tubes and counting on the client.
 */
export const useTubeStats = (
  options: Omit<UseQueryOptions<TubeStats>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery({
    queryKey: queryKeys.tubes.stats(),
    queryFn: async () => {
      return TubeService.fetchStats();
    },
    staleTime: 10 * 60 * 1000, // Statistics stale slower (10 minutes)
    gcTime: 30 * 60 * 1000, // Keep stats longer in cache
    ...options,
  });
};
