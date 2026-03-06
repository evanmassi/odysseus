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
  const hasLab = !!user?.labId;

  return useQuery({
    queryKey: queryKeys.storage.data(),
    queryFn: () => StorageService.loadConfiguration(),
    enabled: hasLab && (config?.enabled ?? true),
    staleTime: config?.staleTime ?? 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

export const useStorageExistsQuery = (config?: { enabled?: boolean; staleTime?: number }) => {
  return useQuery({
    queryKey: queryKeys.storage.exists(),
    queryFn: () => StorageService.checkConfigurationExists(),
    enabled: config?.enabled ?? true,
    staleTime: config?.staleTime ?? 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};
