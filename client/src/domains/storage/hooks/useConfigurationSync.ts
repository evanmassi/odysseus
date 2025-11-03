/**
 * Configuration Sync Hook
 *
 * Syncs server configuration to client storageStore.
 * This ensures server data is the source of truth and overrides any stale localStorage data.
 *
 * If server has no configuration (fresh install), uses client defaults.
 */
import { useEffect, useRef } from 'react';
import { useLoadStorageQuery, useSaveStorageMutation } from './useStorageQuery';
import { useStorageStore } from '../stores/storageStore';

export function useConfigurationSync() {
  const { data, isSuccess, isError } = useLoadStorageQuery();
  const saveMutation = useSaveStorageMutation();

  // Track if we've already synced to prevent infinite loops
  const hasSynced = useRef(false);
  const hasInitialized = useRef(false);

  // Sync server data to client store (only once)
  useEffect(() => {
    if (isSuccess && data && !hasSynced.current) {
      hasSynced.current = true;

      const serverSystemConfig = data.configuration.systemConfig;

      console.log('📥 [ConfigSync] Syncing configuration from server');
      useStorageStore.setState({
        systemConfig: serverSystemConfig
      });
      // currentLab automatically synced from availableLabs
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

  return {
    isSyncing: !isSuccess && !isError && !hasSynced.current,
    isError: isError && !hasInitialized.current,
    isSynced: hasSynced.current
  };
}
