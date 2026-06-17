/**
 * Tube Query Hooks
 *
 * React Query hooks for tube read operations.
 */

import {
  type TubeData as SchemaTubeData,
  type TubeFilterableField,
} from '@odysseus/shared-schemas';
import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
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
    timestamps: schemaTube.timestamps,
  };
}

export const useTubesByLocation = (
  tankId: string,
  rackId: string,
  boxId: string,
  options: Omit<UseQueryOptions<TubeData[]>, 'queryKey' | 'queryFn'> = {}
) => {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.tubes.location(labId, tankId, rackId, boxId),
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

/** Slim per-tube color feed for an open rack's box minimaps; mounts only when the rack is expanded. */
export const useTubesByRack = (tankId: string, rackId: string) => {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.tubes.byRack(labId, tankId, rackId),
    queryFn: () => TubeService.fetchTubesByRack(tankId, rackId),
    enabled: !!(labId && tankId && rackId),
    staleTime: 5 * 60 * 1000, // WebSocket keeps data fresh
    gcTime: 10 * 60 * 1000,
  });
};

/** Per-box occupancy counts across the lab; loaded once on navigator mount. */
export const useLocationCounts = () => {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.tubes.locationCounts(labId),
    queryFn: () => TubeService.fetchLocationCounts(),
    enabled: !!labId,
    staleTime: 5 * 60 * 1000, // WebSocket keeps data fresh
    gcTime: 10 * 60 * 1000,
  });
};

/** Searches all cached tube queries for initialData to avoid loading flash. */
export const useTube = (
  id: string,
  options: Omit<UseQueryOptions<TubeData>, 'queryKey' | 'queryFn'> = {}
) => {
  const queryClient = useQueryClient();
  const labId = useLabId();

  const initialData = (): TubeData | undefined => {
    const allTubeQueries = queryClient.getQueriesData<TubeData[]>({
      queryKey: queryKeys.tubes.all(labId),
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
    queryKey: queryKeys.tubes.detail(labId, id),
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

export const useTubeFilterOptionsQuery = (fields: TubeFilterableField[]) => {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.tubes.filterOptions(labId, fields),
    queryFn: () => TubeService.fetchFilterOptions(fields),
    enabled: !!labId && fields.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useBulkTubes = (
  tubeIds: string[],
  options: Omit<UseQueryOptions<TubeData[]>, 'queryKey' | 'queryFn'> = {}
) => {
  const labId = useLabId();

  return useQuery({
    queryKey: queryKeys.tubes.bulk(labId, tubeIds),
    queryFn: async (): Promise<TubeData[]> => {
      if (tubeIds.length === 0) {
        return [];
      }

      const schemaTubes = await TubeService.bulkFetchTubes(tubeIds);
      return schemaTubes.map(convertSchemaToSharedTubeData);
    },
    enabled: tubeIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};
