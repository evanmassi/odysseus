/**
 * React Query hooks for tube data management
 * Provides type-safe server state management with automatic caching and invalidation
 * Uses TubeService for all API operations with comprehensive Zod validation
 */

import {
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type TubeQueryFilters,
  EQUIPMENT_DEFAULTS,
  UNKNOWN_RESEARCHER,
  type TubeData as SchemaTubeData,
  type BatchResult,
} from '@odysseus/shared-schemas';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

import { DOMAIN_QUERY_OPTIONS } from '@app/queryClient';
import { queryKeys } from '@app/queryKeys';
import { normalizeConcentration } from '@shared/utils/concentrationConverter';

import { TubeService } from '../services/TubeService';

import type { TubeData } from '@shared/types/Tube';

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

/**
 * Hook to fetch all tubes with optional filtering
 *
 * Uses canonical base query with client-side filtering via select
 */
export function useTubesQuery(options?: {
  filters?: TubeQueryFilters;
  queryOptions?: Omit<
    UseQueryOptions<TubeData[], Error, TubeData[]>,
    'queryKey' | 'queryFn' | 'select'
  >;
}) {
  const { filters, queryOptions } = options ?? {};

  return useQuery<TubeData[], Error, TubeData[]>({
    queryKey: queryKeys.tubes.lists(),
    queryFn: async () => {
      const schemaTubes = await TubeService.fetchTubes();
      return schemaTubes.map(convertSchemaToSharedTubeData);
    },
    select: tubes => {
      if (!filters) return tubes;

      let filtered = tubes;
      if (filters.tankId) filtered = filtered.filter(t => t.location.tankId === filters.tankId);
      if (filters.rackId) filtered = filtered.filter(t => t.location.rackId === filters.rackId);
      if (filters.boxId) filtered = filtered.filter(t => t.location.boxId === filters.boxId);
      if (filters.researcherId)
        filtered = filtered.filter(t => t.researcherId === filters.researcherId);

      return filtered;
    },
    ...DOMAIN_QUERY_OPTIONS.tubes,
    ...queryOptions,
  });
}

/**
 * Hook to fetch a single tube by ID
 * Uses initialData from any tube cache (lists, location queries, etc.) for instant loading
 */
export function useTubeQuery(
  tubeId: string,
  options?: {
    queryOptions?: Omit<UseQueryOptions<TubeData, Error>, 'queryKey' | 'queryFn' | 'enabled'>;
  }
) {
  const queryClient = useQueryClient();

  // Search across all tube caches to find this tube for instant initial data
  const initialData = (): TubeData | undefined => {
    // Get all cached tube queries (location-based, lists, etc.)
    const allTubeQueries = queryClient.getQueriesData<TubeData[]>({
      queryKey: queryKeys.tubes.all,
    });

    // Search through all cached tube arrays to find this tube
    for (const [_, tubes] of allTubeQueries) {
      if (Array.isArray(tubes)) {
        const found = tubes.find(tube => tube.id === tubeId);
        if (found) return found;
      }
    }

    return undefined;
  };

  return useQuery({
    queryKey: queryKeys.tubes.detail(tubeId),
    queryFn: async () => {
      const schemaTube = await TubeService.fetchTubeById(tubeId);
      return convertSchemaToSharedTubeData(schemaTube);
    },
    initialData,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!tubeId,
    ...options?.queryOptions,
  });
}

/**
 * Hook for tube creation mutation
 */
export function useCreateTubeMutation(options?: {
  mutationOptions?: Omit<UseMutationOptions<TubeData, Error, CreateTubeRequest>, 'mutationFn'>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tubeData: CreateTubeRequest) => {
      const schemaTube = await TubeService.createTube(tubeData);
      return convertSchemaToSharedTubeData(schemaTube);
    },
    onSuccess: (newTube, _variables) => {
      // Add to cache immediately for optimistic updates
      queryClient.setQueryData(queryKeys.tubes.detail(newTube.id), newTube);

      // Invalidate and refetch tubes list to ensure consistency
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },
    retry: 1,
    ...options?.mutationOptions,
  });
}

/**
 * Hook for tube update mutation
 */
export function useUpdateTubeMutation(options?: {
  mutationOptions?: Omit<
    UseMutationOptions<TubeData, Error, { id: string; data: UpdateTubeRequest }>,
    'mutationFn'
  >;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTubeRequest }) => {
      const schemaTube = await TubeService.updateTube(id, data);
      return convertSchemaToSharedTubeData(schemaTube);
    },
    onSuccess: (updatedTube, _variables) => {
      // Update specific tube in cache immediately
      queryClient.setQueryData(queryKeys.tubes.detail(updatedTube.id), updatedTube);

      // Invalidate lists to ensure consistency across filtered views
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },
    retry: 1,
    ...options?.mutationOptions,
  });
}

/**
 * Hook for tube deletion mutation
 */
export function useDeleteTubeMutation(options?: {
  mutationOptions?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tubeId: string) => TubeService.deleteTube(tubeId),
    onSuccess: (_, tubeId) => {
      // Remove from cache immediately
      queryClient.removeQueries({ queryKey: queryKeys.tubes.detail(tubeId) });

      // Invalidate lists and stats to reflect deletion
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.stats() });
    },
    retry: 1,
    ...options?.mutationOptions,
  });
}

/**
 * Hook for batch tube operations
 */
export function useBatchTubeMutation(options?: {
  mutationOptions?: Omit<
    UseMutationOptions<
      BatchResult<SchemaTubeData>,
      Error,
      {
        action: 'create' | 'update' | 'delete';
        data: CreateTubeRequest[] | Array<{ id: string; data: UpdateTubeRequest }> | string[];
      }
    >,
    'mutationFn'
  >;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, data }): Promise<BatchResult<TubeData>> => {
      // Client-side batch operations using parallel execution
      switch (action) {
        case 'create': {
          const createResults = await Promise.all(
            (data as CreateTubeRequest[]).map(tube => TubeService.createTube(tube))
          );
          return {
            successful: createResults as TubeData[],
            failed: [],
            summary: { total: createResults.length, successful: createResults.length, failed: 0 },
          };
        }
        case 'update': {
          const updateResults = await Promise.all(
            (data as Array<{ id: string; data: UpdateTubeRequest }>).map(({ id, data }) =>
              TubeService.updateTube(id, data)
            )
          );
          return {
            successful: updateResults as TubeData[],
            failed: [],
            summary: { total: updateResults.length, successful: updateResults.length, failed: 0 },
          };
        }
        case 'delete': {
          const deleteCount = (data as string[]).length;
          await Promise.all((data as string[]).map(id => TubeService.deleteTube(id)));
          return {
            successful: [] as TubeData[],
            failed: [],
            summary: { total: deleteCount, successful: deleteCount, failed: 0 },
          };
        }
        default:
          throw new Error(`Unsupported batch operation: ${action}`);
      }
    },
    onSuccess: (_result, _variables) => {
      // Invalidate all tube-related queries for batch operations
      // This ensures consistency across the entire dataset
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
    },
    retry: 1,
    ...options?.mutationOptions,
  });
}

/**
 * Hook to get tube statistics
 */
export function useTubeStatsQuery(options?: {
  queryOptions?: Omit<
    UseQueryOptions<
      {
        totalTubes: number;
        tubesByTank: Record<string, number>;
        tubesByResearcher: Record<string, number>;
        tubesByCellType: Record<string, number>;
        recentActivity: Array<{ date: string; count: number }>;
      },
      Error
    >,
    'queryKey' | 'queryFn'
  >;
}) {
  return useQuery({
    queryKey: queryKeys.tubes.stats(),
    queryFn: async () => {
      // Modern service doesn't have getTubeStats - compute client-side
      const tubes = await TubeService.fetchTubes();
      return {
        totalTubes: tubes.length,
        tubesByTank: tubes.reduce(
          (acc, t) => ({ ...acc, [t.location.tankId]: (acc[t.location.tankId] || 0) + 1 }),
          {} as Record<string, number>
        ),
        tubesByResearcher: tubes.reduce(
          (acc, t) => {
            const researcherId = t.researcherId ?? UNKNOWN_RESEARCHER;
            return { ...acc, [researcherId]: (acc[researcherId] || 0) + 1 };
          },
          {} as Record<string, number>
        ),
        tubesByCellType: tubes.reduce(
          (acc, t) => {
            const cellType = t.sample.cellType ?? 'Unknown';
            return { ...acc, [cellType]: (acc[cellType] || 0) + 1 };
          },
          {} as Record<string, number>
        ),
        recentActivity: [],
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options?.queryOptions,
  });
}

/**
 * Hook to check if a position is available
 */
export function usePositionAvailabilityQuery(
  tankId: string,
  rackId: string,
  boxId: string,
  position: number,
  _options?: {
    queryOptions?: Omit<
      UseQueryOptions<{ available: boolean; occupiedBy?: TubeData }, Error>,
      'queryKey' | 'queryFn'
    >;
  }
) {
  const isValidPosition = Boolean(
    tankId && rackId && boxId && position >= 1 && position <= EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX
  );

  return useQuery({
    queryKey: [
      ...queryKeys.tubes.all,
      'position-check',
      { tankId, rackId, boxId, position },
    ] as const,
    queryFn: async () => {
      // Modern service doesn't have checkPositionAvailability - check client-side
      const tubes = await TubeService.fetchTubesByLocation(tankId, rackId, boxId);
      const occupiedBy = tubes.find(t => t.location.position === position);
      return {
        available: !occupiedBy,
        occupiedBy,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: isValidPosition,
  });
}
