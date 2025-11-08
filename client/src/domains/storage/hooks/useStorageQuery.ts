import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StorageService } from '../services/StorageService';
import {
  ConfigurationResponse,
  DeleteTankResponse,
  SystemConfiguration,
  LabConfiguration
} from '@odysseus/shared-schemas';
import { queryKeys } from '@app/queryKeys';

/**
 * Load Storage Configuration Hook
 *
 * Loads the complete lab configuration from the server
 */
export const useLoadStorageQuery = (config?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
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
export const useStorageExistsQuery = (config?: {
  enabled?: boolean;
  staleTime?: number;
}) => {
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
    mutationFn: ({ systemConfig, currentLab }: {
      systemConfig: SystemConfiguration;
      currentLab: LabConfiguration;
    }) => StorageService.saveConfiguration(systemConfig, currentLab),

    onSuccess: () => {
      // Invalidate storage cache to reflect server state
      queryClient.invalidateQueries({
        queryKey: queryKeys.storage.storage()
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.storage.exists()
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
  options?: {
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
