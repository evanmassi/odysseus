/**
 * Configuration Sync Hook
 *
 * Handles two responsibilities:
 * 1. Fresh install detection - initializes default config on server if none exists
 * 2. Multi-tab sync - invalidates React Query cache when config changes in another tab
 *
 * Note: React Query is now the single source of truth for server state.
 * Components consume data via useStorageData() hook, not Zustand.
 */
import { useEffect, useRef } from 'react';

import { SYSTEM_DEFAULTS } from '@odysseus/shared-schemas';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { logger } from '@shared/infrastructure/logger';

import { useInitializeConfigurationMutation } from './useStorageEquipmentMutations';
import { useLoadStorageQuery } from './useStorageQuery';

// One-time cleanup of legacy Zustand localStorage (runs once per session)
const legacyStorageCleanedUp = { done: false };

export function useConfigurationSync() {
  const { data, isSuccess, isError } = useLoadStorageQuery();
  const initializeMutation = useInitializeConfigurationMutation();
  const queryClient = useQueryClient();

  // Track if initial save has been attempted (for fresh installs only)
  const hasInitialized = useRef(false);

  // Clean up legacy Zustand localStorage key (one-time migration cleanup)
  useEffect(() => {
    if (!legacyStorageCleanedUp.done) {
      legacyStorageCleanedUp.done = true;
      localStorage.removeItem('odysseus-configuration-store');
    }
  }, []);

  // Initialize server with defaults if no config exists (fresh install)
  useEffect(() => {
    if (isError && !hasInitialized.current && !initializeMutation.isPending) {
      hasInitialized.current = true;

      // Use dedicated initialize endpoint for fresh installs
      initializeMutation.mutate(
        {
          labName: SYSTEM_DEFAULTS.LAB.NAME,
          tankCount: 1,
          racksPerTank: 1,
        },
        {
          onSuccess: () => {
            logger.info('Fresh install: initialized default configuration on server');
          },
          onError: initError => {
            logger.error('Failed to initialize configuration', { initError });
            hasInitialized.current = false; // Allow retry on error
          },
        }
      );
    }
  }, [isError, initializeMutation]);

  // Multi-tab synchronization via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Listen for configuration version changes from other tabs
      if (e.key === 'odysseus-configuration-version') {
        // Invalidate React Query cache to refetch from server
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

  // Broadcast version changes to other tabs when data updates
  useEffect(() => {
    if (isSuccess && data?.configuration.systemConfig.version) {
      // Update localStorage with current version (triggers storage event in other tabs)
      localStorage.setItem(
        'odysseus-configuration-version',
        String(data.configuration.systemConfig.version)
      );
    }
  }, [isSuccess, data?.configuration.systemConfig.version]);

  return {
    isSyncing: !isSuccess && !isError,
    isError: isError && !hasInitialized.current,
    isSynced: isSuccess,
  };
}
