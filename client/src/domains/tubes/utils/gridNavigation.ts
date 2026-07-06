/**
 * Grid Navigation
 *
 * Coordinates location changes across the tube store with reentrancy protection.
 */

import { useTubeStore } from '@domains/tubes';
import { logger } from '@infra/logger';

import type { PositionContext } from '@domains/tubes/types/gridSelectionTypes';

let isNavigating = false;

export async function navigateToLocation(location: PositionContext) {
  if (isNavigating) return;

  isNavigating = true;

  try {
    const tubeStore = useTubeStore.getState();
    tubeStore.setCurrentTank(location.tankId);
    tubeStore.setCurrentRack(location.rackId);
    tubeStore.setCurrentBox(location.boxId);
  } catch (error) {
    logger.error('Grid navigation failed', { error });
  } finally {
    isNavigating = false;
  }
}
