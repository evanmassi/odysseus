/**
 * Configuration Sync Hook
 *
 * Syncs server configuration to client storageStore.
 * This ensures server data is the source of truth and overrides any stale localStorage data.
 *
 * If server has no configuration (fresh install), uses client defaults.
 * Handles multi-tab synchronization via storage events.
 */
import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { logger } from '@shared/infrastructure/logger';

import { useStorageStore } from '../stores/storageStore';

import { useLoadStorageQuery, useSaveStorageMutation } from './useStorageQuery';

export function useConfigurationSync() {
  const { data, isSuccess, isError } = useLoadStorageQuery();
  const saveMutation = useSaveStorageMutation();
  const queryClient = useQueryClient();

  // Track if initial save has been attempted (for fresh installs only)
  const hasInitialized = useRef(false);

  // Sync server data to client store whenever React Query data changes
  // React Query's caching ensures this only runs when data actually changes
  useEffect(() => {
    if (isSuccess && data) {
      const serverSystemConfig = data.configuration.systemConfig;
      const serverCurrentLab = data.configuration.currentLab;
      const serverVersion = serverSystemConfig.version;

      // Get cached version from current store (if exists)
      const currentState = useStorageStore.getState();
      const cachedVersion = currentState.systemConfig.version;

      // Cache invalidation: Check if versions match
      if (cachedVersion !== serverVersion) {
        // Clear localStorage to force fresh data
        localStorage.removeItem('odysseus-configuration-store');
      }

      // Ensure systemConfig.availableLabs contains the current lab
      // The server sends currentLab separately, but we need to update availableLabs
      const updatedAvailableLabs = serverSystemConfig.availableLabs.map(lab =>
        lab.id === serverSystemConfig.currentLabId ? serverCurrentLab : lab
      );

      useStorageStore.setState({
        systemConfig: {
          ...serverSystemConfig,
          availableLabs: updatedAvailableLabs,
        },
        currentLab: serverCurrentLab,
      });
    }
  }, [isSuccess, data]);

  // Initialize server with client defaults if no config exists (only once)
  useEffect(() => {
    if (isError && !hasInitialized.current && !saveMutation.isPending) {
      hasInitialized.current = true;

      const store = useStorageStore.getState();

      saveMutation.mutate(
        {
          systemConfig: store.systemConfig,
          currentLab: store.currentLab,
        },
        {
          onError: saveError => {
            logger.error('Failed to save initial configuration', { saveError });
            hasInitialized.current = false; // Allow retry on error
          },
        }
      );
    }
  }, [isError, saveMutation]);

  // Multi-tab synchronization via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only handle changes to our configuration store
      if (e.key !== 'odysseus-configuration-store') {
        return;
      }

      try {
        if (e.newValue) {
          const parsedState = JSON.parse(e.newValue);
          const newVersion = parsedState?.state?.systemConfig?.version;
          const currentVersion = useStorageStore.getState().systemConfig.version;

          // Only sync if version is newer
          if (newVersion && newVersion > currentVersion) {
            // Invalidate React Query cache to refetch from server
            void queryClient.invalidateQueries({
              queryKey: queryKeys.storage.storage(),
            });
          }
        } else {
          // Storage was cleared in another tab
          void queryClient.invalidateQueries({
            queryKey: queryKeys.storage.storage(),
          });
        }
      } catch (error) {
        logger.error('Error parsing storage event', { error });
        // On error, refetch to be safe
        void queryClient.invalidateQueries({
          queryKey: queryKeys.storage.storage(),
        });
      }
    };

    // Listen for storage events (only fires in other tabs)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [queryClient]);

  return {
    isSyncing: !isSuccess && !isError,
    isError: isError && !hasInitialized.current,
    isSynced: isSuccess,
  };
}
