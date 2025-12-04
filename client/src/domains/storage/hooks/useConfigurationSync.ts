/**
 * Configuration Sync Hook
 *
 * Handles two responsibilities:
 * 1. Fresh install detection - saves default config to server if none exists
 * 2. Multi-tab sync - invalidates React Query cache when config changes in another tab
 *
 * Note: React Query is now the single source of truth for server state.
 * Components consume data via useStorageData() hook, not Zustand.
 */
import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/queryKeys';
import { logger } from '@shared/infrastructure/logger';

import { createDefaultConfiguration } from '../utils/defaultConfiguration';

import { useLoadStorageQuery, useSaveStorageMutation } from './useStorageQuery';

export function useConfigurationSync() {
  const { data, isSuccess, isError } = useLoadStorageQuery();
  const saveMutation = useSaveStorageMutation();
  const queryClient = useQueryClient();

  // Track if initial save has been attempted (for fresh installs only)
  const hasInitialized = useRef(false);

  // Initialize server with defaults if no config exists (fresh install)
  useEffect(() => {
    if (isError && !hasInitialized.current && !saveMutation.isPending) {
      hasInitialized.current = true;

      // Create and save default configuration
      const defaults = createDefaultConfiguration();

      saveMutation.mutate(defaults, {
        onSuccess: () => {
          logger.info('Fresh install: saved default configuration to server');
        },
        onError: saveError => {
          logger.error('Failed to save initial configuration', { saveError });
          hasInitialized.current = false; // Allow retry on error
        },
      });
    }
  }, [isError, saveMutation]);

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
