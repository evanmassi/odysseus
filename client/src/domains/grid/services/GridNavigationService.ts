/**
 * Grid Navigation
 *
 * Coordinates location changes across the tube store with reentrancy protection.
 */

import { useTubeStore } from '@domains/tubes';
import { logger } from '@shared/infrastructure/logger';

interface GridLocation {
  tankId: string;
  rackId: string;
  boxId: string;
}

let isNavigating = false;

export async function navigateToLocation(location: GridLocation) {
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
