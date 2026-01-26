/**
 * Configuration Sync Hook
 *
 * Handles two responsibilities:
 * 1. Fresh install detection - initializes default config on server if none exists
 * 2. Multi-tab sync - invalidates React Query cache when config changes in another tab
 */
import { useEffect, useRef } from 'react';

import { SYSTEM_DEFAULTS } from '@odysseus/shared-schemas';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { logger } from '@shared/infrastructure/logger';

import { useInitializeConfigurationMutation } from './useStorageEquipmentMutations';
import { useLoadStorageQuery } from './useStorageQuery';

export function useConfigurationSync() {
  const { data, isSuccess, isError } = useLoadStorageQuery();
  const initializeMutation = useInitializeConfigurationMutation();
  const queryClient = useQueryClient();

  // Track if initial save has been attempted (for fresh installs only)
  const hasInitialized = useRef(false);

  // Initialize server with defaults if no config exists (fresh install)
  // Note: Only runs when server is reachable but returns 404/error for config
  // Does NOT run when offline (query uses cached data or pauses)
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
            // Only allow retry for transient errors (network, server issues)
            // Do NOT retry for "config already exists" - that means config IS there
            const errorMessage = initError instanceof Error ? initError.message : String(initError);
            const isAlreadyExists = errorMessage.toLowerCase().includes('already exists');
            const isOffline =
              typeof initError === 'object' &&
              initError !== null &&
              'code' in initError &&
              (initError as { code: unknown }).code === 'OFFLINE_WRITE_BLOCKED';

            if (isAlreadyExists || isOffline) {
              // Config exists or we're offline - don't retry, just wait for query to succeed
              logger.debug('Configuration init skipped', {
                reason: isAlreadyExists ? 'already exists' : 'offline',
              });
            } else {
              // Transient error - allow retry
              logger.error('Failed to initialize configuration', { initError });
              hasInitialized.current = false;
            }
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
