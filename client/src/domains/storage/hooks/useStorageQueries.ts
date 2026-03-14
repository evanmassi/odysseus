/**
 * Storage Queries
 *
 * React Query hooks for reading storage configuration data.
 */
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useAuthStore } from '@domains/authentication';

import { StorageService } from '../services/StorageService';

/** Automatically disabled for users without a lab (system admins). */
export const useLoadStorageQuery = (config?: { enabled?: boolean; staleTime?: number }) => {
  const { user } = useAuthStore();
  const labId = user?.labId;
  const hasLab = !!labId;

  return useQuery({
    queryKey: queryKeys.storage.data(labId),
    queryFn: () => StorageService.loadConfiguration(),
    enabled: hasLab && (config?.enabled ?? true),
    staleTime: config?.staleTime ?? 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};
