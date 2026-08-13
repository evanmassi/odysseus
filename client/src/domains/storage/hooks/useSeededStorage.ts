/**
 * Seeded Storage State
 *
 * A demo lab's shared vocabulary freezes once its storage is seeded, because every
 * record points at it. Both the demo limits and the taxonomy lock key off that.
 */

import { useIsDemo } from '@domains/authentication';

import { useStorageData } from './useStorageData';

export function useHasSeededStorage(): boolean {
  const { currentLab } = useStorageData();

  return (
    currentLab?.equipment.tanks.some(
      tank =>
        tank.isSeeded ??
        tank.racks.some(rack => rack.isSeeded ?? rack.boxes.some(box => box.isSeeded))
    ) ?? false
  );
}

export function useDemoTaxonomyLock(): boolean {
  const isDemo = useIsDemo();
  const hasSeededStorage = useHasSeededStorage();

  return isDemo && hasSeededStorage;
}
