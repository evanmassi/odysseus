/**
 * Storage Sync
 *
 * Fresh install detection, multi-tab cache sync, and tubeStore tank alignment.
 */
import { useEffect, useRef } from 'react';

import { SYSTEM_DEFAULTS } from '@odysseus/shared-schemas';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useAuthStore } from '@domains/authentication';
import { useTubeStore } from '@domains/tubes/stores/tubeStore';
import { logger } from '@infra/logger';

import { useInitializeConfigurationMutation } from './useStorageMutations';
import { useLoadStorageQuery } from './useStorageQueries';

export function useStorageSync() {
  const { user } = useAuthStore();
  const hasLab = !!user?.labId;

  const { data, isSuccess, isError } = useLoadStorageQuery({ enabled: hasLab });
  const initializeMutation = useInitializeConfigurationMutation();
  const queryClient = useQueryClient();

  // Track if initial save has been attempted (for fresh installs only)
  const hasInitialized = useRef(false);

  // Initialize server with defaults if no config exists (fresh install)
  // Only runs when server is reachable but returns 404/error for config
  // Does NOT run when offline (query uses cached data or pauses)
  // Skip entirely for users without a lab (system admins)
  useEffect(() => {
    if (!hasLab) return;

    if (isError && !hasInitialized.current && !initializeMutation.isPending) {
      hasInitialized.current = true;

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
  }, [hasLab, isError, initializeMutation]);

  // Remove stale lab-specific queries from cache for users without a lab (system admins)
  // These may persist from a previous user's session via localStorage cache
  useEffect(() => {
    if (!hasLab) {
      queryClient.removeQueries({ queryKey: ['storage'] });
      queryClient.removeQueries({ queryKey: ['tubes'] });
      queryClient.removeQueries({ queryKey: ['researchers'] });
    }
  }, [hasLab, queryClient]);

  // Multi-tab synchronization via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'odysseus-configuration-version' && user?.labId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.storage.data(user.labId),
        });
      }
    };

    // Only fires in other tabs
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [queryClient, user?.labId]);

  // Broadcast version changes to other tabs when data updates
  useEffect(() => {
    if (isSuccess && data?.configuration.systemConfig.version) {
      localStorage.setItem(
        'odysseus-configuration-version',
        String(data.configuration.systemConfig.version)
      );
    }
  }, [isSuccess, data?.configuration.systemConfig.version]);

  // Sync tubeStore with available tanks when configuration loads
  // Critical for demo mode isolation: ensures demo users don't query non-demo tanks
  useEffect(() => {
    if (isSuccess && data?.configuration.currentLab.equipment.tanks) {
      const availableTanks = data.configuration.currentLab.equipment.tanks;
      if (availableTanks.length > 0) {
        const currentTank = useTubeStore.getState().currentTank;
        const tankExists = availableTanks.some(tank => tank.id === currentTank);

        if (!tankExists) {
          const firstTank = availableTanks[0];
          const tubeStore = useTubeStore.getState();

          tubeStore.setCurrentTank(firstTank.id);

          if (firstTank.racks && firstTank.racks.length > 0) {
            const firstRack = firstTank.racks[0];
            tubeStore.setCurrentRack(firstRack.id);
            if (firstRack.boxes && firstRack.boxes.length > 0) {
              tubeStore.setCurrentBox(firstRack.boxes[0].id);
            }
          }

          logger.info('Synced tubeStore to first available tank', {
            previousTank: currentTank,
            newTank: firstTank.id,
          });
        }
      }
    }
  }, [isSuccess, data?.configuration.currentLab.equipment.tanks]);

  if (!hasLab) {
    return { isSyncing: false, isError: false, isSynced: false, hasNoLab: true };
  }

  return {
    isSyncing: !isSuccess && !isError,
    isError: isError && !hasInitialized.current,
    isSynced: isSuccess,
    hasNoLab: false,
  };
}
