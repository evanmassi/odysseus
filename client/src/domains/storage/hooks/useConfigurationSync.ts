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
import { useLoadStorageQuery, useSaveStorageMutation } from './useStorageQuery';
import { useStorageStore } from '../stores/storageStore';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@app/queryKeys';

export function useConfigurationSync() {
  const { data, isSuccess, isError } = useLoadStorageQuery();
  const saveMutation = useSaveStorageMutation();
  const queryClient = useQueryClient();

  // Track if we've already synced to prevent infinite loops
  const hasSynced = useRef(false);
  const hasInitialized = useRef(false);

  // Sync server data to client store with cache invalidation
  useEffect(() => {
    if (isSuccess && data && !hasSynced.current) {
      hasSynced.current = true;

      const serverSystemConfig = data.configuration.systemConfig;
      const serverCurrentLab = data.configuration.currentLab;
      const serverVersion = serverSystemConfig.version;

      // Get cached version from current store (if exists)
      const currentState = useStorageStore.getState();
      const cachedVersion = currentState.systemConfig.version;

      // Cache invalidation: Check if versions match
      if (cachedVersion !== serverVersion) {
        console.log('🔄 [ConfigSync] Version mismatch detected - invalidating cache');
        console.log(`   Cached: v${cachedVersion} → Server: v${serverVersion}`);

        // Clear localStorage to force fresh data
        localStorage.removeItem('odysseus-configuration-store');

        console.log('🗑️  [ConfigSync] Cleared stale localStorage cache');
      } else {
        console.log(`✅ [ConfigSync] Cache valid (v${serverVersion})`);
      }

      console.log('📥 [ConfigSync] Syncing configuration from server');

      // Ensure systemConfig.availableLabs contains the current lab
      // The server sends currentLab separately, but we need to update availableLabs
      const updatedAvailableLabs = serverSystemConfig.availableLabs.map(lab =>
        lab.id === serverSystemConfig.currentLabId ? serverCurrentLab : lab
      );

      useStorageStore.setState({
        systemConfig: {
          ...serverSystemConfig,
          availableLabs: updatedAvailableLabs
        },
        currentLab: serverCurrentLab
      });
    }
  }, [isSuccess, data]);

  // Initialize server with client defaults if no config exists (only once)
  useEffect(() => {
    if (isError && !hasInitialized.current && !saveMutation.isPending) {
      hasInitialized.current = true;

      console.warn('⚠️ [ConfigSync] No configuration on server (fresh install).');
      console.log('📤 [ConfigSync] Saving initial configuration to server...');

      const store = useStorageStore.getState();

      // Log what we're about to send
      console.log('📋 [ConfigSync] Client config to save:', {
        systemConfig: store.systemConfig,
        currentLabTanks: store.currentLab.equipment.tanks.length,
        firstTank: store.currentLab.equipment.tanks[0]?.racks[0]?.boxes[0]
      });

      saveMutation.mutate({
        systemConfig: store.systemConfig,
        currentLab: store.currentLab
      }, {
        onSuccess: () => {
          console.log('✅ [ConfigSync] Initial configuration saved to server');
          hasSynced.current = true;
        },
        onError: (saveError) => {
          console.error('❌ [ConfigSync] Failed to save initial configuration:', saveError);
          hasInitialized.current = false; // Allow retry on error
        }
      });
    }
  }, [isError, saveMutation.isPending]);

  // Multi-tab synchronization via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only handle changes to our configuration store
      if (e.key !== 'odysseus-configuration-store') {
        return;
      }

      // Another tab updated localStorage
      console.log('🔄 [ConfigSync] Storage change detected from another tab');

      try {
        if (e.newValue) {
          const parsedState = JSON.parse(e.newValue);
          const newVersion = parsedState?.state?.systemConfig?.version;
          const currentVersion = useStorageStore.getState().systemConfig.version;

          console.log('📊 [ConfigSync] Multi-tab version check:', {
            current: currentVersion,
            incoming: newVersion
          });

          // Only sync if version is newer
          if (newVersion && newVersion > currentVersion) {
            console.log('✅ [ConfigSync] Syncing newer configuration from other tab');

            // Invalidate React Query cache to refetch from server
            queryClient.invalidateQueries({
              queryKey: queryKeys.storage.storage()
            });
          } else {
            console.log('⚠️ [ConfigSync] Ignoring older/same version from other tab');
          }
        } else {
          // Storage was cleared in another tab
          console.log('🗑️  [ConfigSync] Storage cleared in another tab, refetching from server');
          queryClient.invalidateQueries({
            queryKey: queryKeys.storage.storage()
          });
        }
      } catch (error) {
        console.error('❌ [ConfigSync] Error parsing storage event:', error);
        // On error, refetch to be safe
        queryClient.invalidateQueries({
          queryKey: queryKeys.storage.storage()
        });
      }
    };

    // Listen for storage events (only fires in other tabs)
    window.addEventListener('storage', handleStorageChange);

    console.log('👂 [ConfigSync] Listening for multi-tab storage events');

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      console.log('🔇 [ConfigSync] Stopped listening for storage events');
    };
  }, [queryClient]);

  return {
    isSyncing: !isSuccess && !isError && !hasSynced.current,
    isError: isError && !hasInitialized.current,
    isSynced: hasSynced.current
  };
}
