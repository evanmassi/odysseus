/**
 * Storage Queries
 *
 * React Query hooks for reading storage configuration data.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { MS_PER_MINUTE } from '@shared/utils';

import { StorageService } from '../services/StorageService';

/** Automatically disabled for users without a lab (system admins). */
export const useLoadStorageQuery = (config?: { enabled?: boolean; staleTime?: number }) => {
  const labId = useLabId();
  const hasLab = !!labId;

  return useQuery({
    queryKey: queryKeys.storage.data(labId),
    queryFn: () => StorageService.loadConfiguration(),
    enabled: hasLab && (config?.enabled ?? true),
    staleTime: config?.staleTime ?? 10 * MS_PER_MINUTE,
    gcTime: 30 * MS_PER_MINUTE,
    retry: 2,
    refetchOnWindowFocus: false,
  });
};
