import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';

import { StorageService } from '../services/StorageService';

import type { SystemConfiguration, LabConfiguration } from '@odysseus/shared-schemas';

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
 * Save Storage Configuration Mutation Hook
 *
 * Saves configuration to server and invalidates cache
 */
export const useSaveStorageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['storage', 'save'],
    mutationFn: ({
      systemConfig,
      currentLab,
    }: {
      systemConfig: SystemConfiguration;
      currentLab: LabConfiguration;
    }) => StorageService.saveConfiguration(systemConfig, currentLab),

    onSuccess: () => {
      // Invalidate storage cache to reflect server state
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.storage(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storage.exists(),
      });
    },
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

/**
 * Custom hook for storage configuration sync with auto-save
 */
export const useStorageSync = (
  systemConfig: SystemConfiguration,
  currentLab: LabConfiguration,
  _options?: {
    autoSave?: boolean;
    debounceMs?: number;
  }
) => {
  const saveStorageMutation = useSaveStorageMutation();

  // Manual save function
  const saveStorage = () => {
    return saveStorageMutation.mutateAsync({
      systemConfig,
      currentLab,
    });
  };

  return {
    saveStorage,
    isSaving: saveStorageMutation.isPending,
    saveError: saveStorageMutation.error,
    lastSaveSuccess: saveStorageMutation.isSuccess,
  };
};
