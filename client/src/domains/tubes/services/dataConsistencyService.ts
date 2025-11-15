import { NAMING_PATTERNS } from '@odysseus/shared-schemas';

import { queryKeys } from '@app/queryKeys';
import { useStorageStore } from '@domains/storage';
import { logger } from '@shared/infrastructure/logger';

import type { TankConfiguration } from '@odysseus/shared-schemas';
import type { TubeData } from '@shared/types/tubeTypes';
import type { useQueryClient } from '@tanstack/react-query';

/**
 * Data Consistency Service
 *
 * Ensures tank IDs are consistent between configuration and actual tube data.
 * Fixes the "main-tank" vs "tank-1" mismatch issue.
 */
export class DataConsistencyService {
  private static instance: DataConsistencyService;

  public static getInstance(): DataConsistencyService {
    if (!DataConsistencyService.instance) {
      DataConsistencyService.instance = new DataConsistencyService();
    }
    return DataConsistencyService.instance;
  }

  /**
   * Get the authoritative tank ID based on actual tube data from React Query cache
   * This is the SINGLE SOURCE OF TRUTH for tank IDs
   */
  public getAuthoritativeTankId(queryClient?: ReturnType<typeof useQueryClient>): string {
    try {
      // Get tubes data from React Query cache
      const tubes = queryClient?.getQueryData(queryKeys.tubes.lists()) || [];

      // If we have tube data, use the tank ID from the actual data
      if (Array.isArray(tubes) && tubes.length > 0) {
        const actualTankIds = [
          ...new Set(tubes.map((t: TubeData) => t.location?.tankId).filter(Boolean)),
        ];
        if (actualTankIds.length > 0) {
          const authoritative = actualTankIds[0]; // Use first real tank ID
          logger.info(
            `📋 DATA CONSISTENCY: Authoritative tank ID from React Query data: "${authoritative}"`
          );
          return authoritative;
        }
      }
    } catch (error) {
      logger.warn('📋 DATA CONSISTENCY: Could not access React Query cache', { error });
    }

    // Fallback to default
    logger.info(
      `📋 DATA CONSISTENCY: No tube data found, using default: "${NAMING_PATTERNS.TANK.ID_PATTERN(1)}"`
    );
    return NAMING_PATTERNS.TANK.ID_PATTERN(1);
  }

  /**
   * Sync configuration tank IDs with actual data
   * Call this during app initialization
   */
  public async syncConfigurationWithData(
    queryClient?: ReturnType<typeof useQueryClient>
  ): Promise<void> {
    const authoritativeTankId = this.getAuthoritativeTankId(queryClient);
    const configStore = useStorageStore.getState();
    const currentTanks = configStore.getCurrentTanks();

    logger.info('📋 DATA CONSISTENCY: Current config tanks', {
      tanks: currentTanks.map(t => ({ id: t.id, name: t.name })),
    });

    // Check if configuration has mismatched tank IDs
    const hasMismatch = currentTanks.some(
      tank =>
        tank.id !== authoritativeTankId &&
        (tank.id === 'main-tank' || authoritativeTankId === NAMING_PATTERNS.TANK.ID_PATTERN(1))
    );

    if (hasMismatch) {
      logger.info('📋 DATA CONSISTENCY: Found tank ID mismatch, correcting directly in store...');

      // Find the mismatched tank
      const mismatchedTank = currentTanks.find(tank => tank.id === 'main-tank');
      if (mismatchedTank) {
        logger.info(
          `📋 DATA CONSISTENCY: Updating tank ID from "${mismatchedTank.id}" to "${authoritativeTankId}"`
        );

        // Update the tank directly in the store's state
        this.forceUpdateTankId(mismatchedTank, authoritativeTankId);
      }
    } else {
      logger.info('📋 DATA CONSISTENCY: Tank IDs are consistent');
    }
  }

  /**
   * Force update tank ID directly in the configuration store
   */
  private forceUpdateTankId(oldTank: TankConfiguration, newTankId: string): void {
    const configStore = useStorageStore.getState();

    try {
      // Get current lab config
      const currentLab = configStore.currentLab;

      // Update the tank ID in the tanks array
      const updatedTanks = currentLab.equipment.tanks.map(tank =>
        tank.id === oldTank.id ? { ...tank, id: newTankId } : tank
      );

      // Update the lab configuration with new tank ID
      const updatedLab = {
        ...currentLab,
        equipment: {
          ...currentLab.equipment,
          tanks: updatedTanks,
        },
      };

      // Force the store to update with corrected data
      configStore.setCurrentLab(updatedLab.id);

      // Also update the systemConfig to include the corrected lab
      const updatedSystemConfig = {
        ...configStore.systemConfig,
        availableLabs: configStore.systemConfig.availableLabs.map(lab =>
          lab.id === updatedLab.id ? updatedLab : lab
        ),
      };

      // Force store state update
      useStorageStore.setState({
        currentLab: updatedLab,
        systemConfig: updatedSystemConfig,
      });

      logger.info(`📋 DATA CONSISTENCY: Tank ID forcibly updated to "${newTankId}"`);
    } catch (error) {
      logger.error('Failed to force update tank ID', { error });
    }
  }

  /**
   * Clear persisted configuration to force rebuild with correct IDs
   */
  private clearPersistedConfiguration(): void {
    try {
      // Clear localStorage for the configuration store
      const keys = Object.keys(localStorage).filter(
        key =>
          key.includes('configuration-store') ||
          key.includes('odysseus-config') ||
          key.includes('lab-config')
      );

      keys.forEach(key => {
        logger.info(`📋 DATA CONSISTENCY: Clearing cached config: ${key}`);
        localStorage.removeItem(key);
      });

      // Also try common Zustand persist keys
      localStorage.removeItem('odysseus-configuration-storage');
      localStorage.removeItem('configuration-storage');
    } catch (error) {
      logger.error('Failed to clear persisted configuration', { error });
    }
  }

  /**
   * Get consistent navigation location based on actual data
   */
  public getConsistentLocation(queryClient?: ReturnType<typeof useQueryClient>): {
    tankId: string;
    rackId: number;
    boxId: string;
  } {
    const authoritativeTankId = this.getAuthoritativeTankId(queryClient);

    return {
      tankId: authoritativeTankId,
      rackId: 1,
      boxId: 'A',
    };
  }
}

export const dataConsistencyService = DataConsistencyService.getInstance();
