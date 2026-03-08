/**
 * Tube Query Hooks
 *
 * React Query hooks for tube read operations.
 */

import { type TubeData as SchemaTubeData } from '@odysseus/shared-schemas';
import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { TubeService } from '@domains/tubes/services/TubeService';
import { normalizeConcentration } from '@shared/utils/concentrationConverter';

import type { TubeData } from '@domains/tubes/types';

/** Normalizes concentration type from API responses (string → number). */
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

/** Canonical base query — all other tube queries derive from or invalidate against this. */
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
    queryKey: queryKeys.tubes.listAll(),
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
    enabled: !!(tankId && rackId && boxId),
    staleTime: 5 * 60 * 1000, // WebSocket keeps data fresh
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};

/** Searches all cached tube queries for initialData to avoid loading flash. */
export const useTube = (
  id: string,
  options: Omit<UseQueryOptions<TubeData>, 'queryKey' | 'queryFn'> = {}
) => {
  const queryClient = useQueryClient();

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

export const useBulkTubes = (
  tubeIds: string[],
  options: Omit<UseQueryOptions<TubeData[]>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery({
    queryKey: queryKeys.tubes.bulk(tubeIds),
    queryFn: async (): Promise<TubeData[]> => {
      if (tubeIds.length === 0) {
        return [];
      }

      const schemaTubes = await Promise.all(tubeIds.map(id => TubeService.fetchTubeById(id)));
      return schemaTubes.map(convertSchemaToSharedTubeData);
    },
    enabled: tubeIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};
