/**
 * Storage Data Hook
 *
 * Primary hook for accessing storage configuration data.
 * Reads from React Query cache.
 */
import { useCallback } from 'react';

import { queryKeys } from '@app/cache/queryKeys';

import { GRID_TEMPLATES } from '../utils/gridHelpers';

import { useLoadStorageQuery } from './useStorageQuery';

import type {
  LabConfiguration,
  SystemConfiguration,
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
  PositionDisplayConfig,
} from '@odysseus/shared-schemas';
import type { useQueryClient } from '@tanstack/react-query';

interface StorageDataResult {
  // Core data
  currentLab: LabConfiguration | null;
  systemConfig: SystemConfiguration | null;

  // Loading states
  isLoading: boolean;
  isError: boolean;
  isFetched: boolean;

  // Derived getters (stable references via useCallback)
  getCurrentTanks: () => TankConfiguration[];
  getCurrentRacks: (tankId?: string) => RackConfiguration[];
  getCurrentBoxes: (tankId: string, rackId: string) => BoxConfiguration[];
  getBox: (tankId: string, rackId: string, boxId: string) => BoxConfiguration | undefined;
  getBoxPositionDisplay: (
    tankId: string,
    rackId: string,
    boxId: string
  ) => PositionDisplayConfig | undefined;
  getAvailableGridTemplates: () => readonly GridConfiguration[];
}

/**
 * Primary hook for accessing storage configuration data
 *
 * Replaces direct Zustand store access for server state.
 * Data comes directly from React Query cache.
 */
export function useStorageData(config?: { enabled?: boolean }): StorageDataResult {
  const { data, isLoading, isError, isFetched } = useLoadStorageQuery({ enabled: config?.enabled });

  const currentLab = data?.configuration.currentLab ?? null;
  const systemConfig = data?.configuration.systemConfig ?? null;

  const getCurrentTanks = useCallback((): TankConfiguration[] => {
    return currentLab?.equipment.tanks ?? [];
  }, [currentLab]);

  const getCurrentRacks = useCallback(
    (tankId?: string): RackConfiguration[] => {
      const tanks = currentLab?.equipment.tanks ?? [];

      if (!tankId) {
        // Return all racks from all tanks
        return tanks.flatMap(tank => tank.racks ?? []);
      }

      const tank = tanks.find(t => t.id === tankId);
      return tank?.racks ?? [];
    },
    [currentLab]
  );

  const getCurrentBoxes = useCallback(
    (tankId: string, rackId: string): BoxConfiguration[] => {
      const tanks = currentLab?.equipment.tanks ?? [];
      const tank = tanks.find(t => t.id === tankId);
      const rack = tank?.racks?.find(r => r.id === rackId);
      return rack?.boxes ?? [];
    },
    [currentLab]
  );

  const getBox = useCallback(
    (tankId: string, rackId: string, boxId: string): BoxConfiguration | undefined => {
      const tanks = currentLab?.equipment.tanks ?? [];
      const tank = tanks.find(t => t.id === tankId);
      const rack = tank?.racks?.find(r => r.id === rackId);
      return rack?.boxes?.find(b => b.id === boxId);
    },
    [currentLab]
  );

  const getBoxPositionDisplay = useCallback(
    (tankId: string, rackId: string, boxId: string): PositionDisplayConfig | undefined => {
      const tanks = currentLab?.equipment.tanks ?? [];
      const tank = tanks.find(t => t.id === tankId);
      const rack = tank?.racks?.find(r => r.id === rackId);
      const box = rack?.boxes?.find(b => b.id === boxId);
      return box?.positionDisplay;
    },
    [currentLab]
  );

  const getAvailableGridTemplates = useCallback((): readonly GridConfiguration[] => {
    return GRID_TEMPLATES;
  }, []);

  return {
    currentLab,
    systemConfig,
    isLoading,
    isError,
    isFetched,
    getCurrentTanks,
    getCurrentRacks,
    getCurrentBoxes,
    getBox,
    getBoxPositionDisplay,
    getAvailableGridTemplates,
  };
}

/**
 * Imperative access to storage data (for services outside React)
 *
 * Use sparingly - prefer passing data as parameters.
 * Reads from React Query cache, not Zustand.
 */
export function getStorageDataFromCache(queryClient: ReturnType<typeof useQueryClient>): {
  currentLab: LabConfiguration | null;
  systemConfig: SystemConfiguration | null;
} {
  const data = queryClient.getQueryData<{
    configuration: { systemConfig: SystemConfiguration; currentLab: LabConfiguration };
  }>(queryKeys.storage.storage());

  return {
    currentLab: data?.configuration.currentLab ?? null,
    systemConfig: data?.configuration.systemConfig ?? null,
  };
}
