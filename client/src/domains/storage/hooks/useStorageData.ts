/**
 * Storage Data Access
 *
 * Primary hook for accessing storage configuration data from React Query cache.
 */
import { useCallback } from 'react';

import { queryKeys } from '@app/cache/queryKeys';

import { useLoadStorageQuery } from './useStorageQueries';

import type {
  LabConfiguration,
  SystemConfiguration,
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
} from '@odysseus/shared-schemas';
import type { useQueryClient } from '@tanstack/react-query';

interface StorageDataResult {
  currentLab: LabConfiguration | null;
  systemConfig: SystemConfiguration | null;

  isLoading: boolean;
  isError: boolean;
  isFetched: boolean;

  getCurrentTanks: () => TankConfiguration[];
  getCurrentRacks: (tankId?: string) => RackConfiguration[];
  getCurrentBoxes: (tankId: string, rackId: string) => BoxConfiguration[];
  getBox: (tankId: string, rackId: string, boxId: string) => BoxConfiguration | undefined;
}

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
  };
}

/** Use sparingly — prefer passing data as parameters. */
export function getStorageDataFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  labId: string | undefined
): {
  currentLab: LabConfiguration | null;
  systemConfig: SystemConfiguration | null;
} {
  const data = queryClient.getQueryData<{
    configuration: { systemConfig: SystemConfiguration; currentLab: LabConfiguration };
  }>(queryKeys.storage.data(labId));

  return {
    currentLab: data?.configuration.currentLab ?? null,
    systemConfig: data?.configuration.systemConfig ?? null,
  };
}
