import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';

import { StorageService } from '../services/StorageService';

/**
 * Load Storage Configuration Hook
 *
 * Loads the complete lab configuration from the server
 */
export const useLoadStorageQuery = (config?: { enabled?: boolean; staleTime?: number }) => {
  return useQuery({
    queryKey: queryKeys.storage.storage(),
    queryFn: () => StorageService.loadConfiguration(),
    enabled: config?.enabled ?? true,
    staleTime: config?.staleTime ?? 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Check Storage Configuration Exists Hook
 *
 * Checks if configuration exists on server
 */
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

/**
 * Update Resource Label Mutation Hook
 *
 * Updates custom label for a rack or box using fine-grained permissions.
 * Users can update labels on resources they own, not just admins.
 * Invalidates storage cache on success to keep UI in sync.
 */
export const useUpdateResourceLabelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'updateResourceLabel'],
    mutationFn: ({
      resourceType,
      tankId,
      rackId,
      boxId,
      customLabel,
    }: {
      resourceType: 'rack' | 'box';
      tankId: string;
      rackId: string;
      boxId?: string;
      customLabel?: string;
    }) => StorageService.updateResourceLabel(resourceType, tankId, rackId, boxId, customLabel),

    onSuccess: () => {
      // Invalidate storage cache to reflect updated labels
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.storage(),
      });
    },
  });
};
