import { useTubeStore } from '@domains/tubes';

import type { LabConfiguration } from '@odysseus/shared-schemas';

export interface GridLocation {
  tankId: string;
  rackId: string;
  boxId: string;
}

export interface NavigationResult {
  success: boolean;
  error?: string;
  location: GridLocation;
}

/**
 * Grid Navigation Service
 *
 * Provides atomic navigation operations that prevent race conditions
 * and ensure data consistency during location changes.
 *
 * Key principles:
 * - Single atomic operation per navigation
 * - Automatic data loading coordination
 * - Error handling and recovery
 */
export class GridNavigationService {
  private static instance: GridNavigationService;
  private isNavigating = false;

  public static getInstance(): GridNavigationService {
    if (!GridNavigationService.instance) {
      GridNavigationService.instance = new GridNavigationService();
    }
    return GridNavigationService.instance;
  }

  /**
   * Navigate to a specific location atomically
   * This is the ONLY way navigation should happen - prevents race conditions
   */
  public async navigateToLocation(location: GridLocation): Promise<NavigationResult> {
    // Prevent concurrent navigation operations
    if (this.isNavigating) {
      return { success: false, error: 'Navigation in progress', location };
    }

    this.isNavigating = true;

    try {
      const tubeStore = useTubeStore.getState();

      // Atomic state update - all at once, no cascading
      tubeStore.setCurrentTank(location.tankId);
      tubeStore.setCurrentRack(location.rackId);
      tubeStore.setCurrentBox(location.boxId);

      // Force fresh load of ALL tubes to ensure state consistency
      const { useAuthStore } = await import('@/domains/authentication');
      const authStore = useAuthStore.getState();

      if (authStore.isAuthenticated) {
        // Note: Data loading is now handled by React Query in components
        // The React Query hooks will automatically refetch when the location changes
      } else {
        const { logger } = await import('@shared/infrastructure/logger');
        logger.error('Atomic navigation: User not authenticated');
        return { success: false, error: 'Authentication required', location };
      }

      return { success: true, location };
    } catch (error) {
      const { logger } = await import('@shared/infrastructure/logger');
      logger.error('Atomic navigation failed', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed',
        location,
      };
    } finally {
      this.isNavigating = false;
    }
  }

  /**
   * Navigate to tank (selects first available rack and box)
   * @param tankId - The tank to navigate to
   * @param currentLab - Current lab configuration (from React Query)
   */
  public async navigateToTank(
    tankId: string,
    currentLab: LabConfiguration | null
  ): Promise<NavigationResult> {
    // Get racks from the passed lab configuration
    const tank = currentLab?.equipment.tanks.find(t => t.id === tankId);
    const racks = tank?.racks ?? [];

    if (racks.length === 0) {
      const { logger } = await import('@shared/infrastructure/logger');
      logger.error(`No racks found for tank "${tankId}"`);
      return {
        success: false,
        error: 'No racks available in tank',
        location: { tankId, rackId: '1', boxId: 'A' },
      };
    }

    const boxes = racks[0].boxes ?? [];
    if (boxes.length === 0) {
      const { logger } = await import('@shared/infrastructure/logger');
      logger.error(`No boxes found for tank "${tankId}", rack ${racks[0].id}`);
      return {
        success: false,
        error: 'No boxes available in rack',
        location: { tankId, rackId: String(racks[0].id), boxId: 'A' },
      };
    }

    return this.navigateToLocation({
      tankId,
      rackId: String(racks[0].id),
      boxId: boxes[0].id,
    });
  }

  /**
   * Navigate to rack (selects first available box)
   * @param tankId - The tank containing the rack
   * @param rackId - The rack to navigate to
   * @param currentLab - Current lab configuration (from React Query)
   */
  public async navigateToRack(
    tankId: string,
    rackId: string,
    currentLab: LabConfiguration | null
  ): Promise<NavigationResult> {
    // Get boxes from the passed lab configuration
    const tank = currentLab?.equipment.tanks.find(t => t.id === tankId);
    const rack = tank?.racks?.find(r => r.id === rackId);
    const boxes = rack?.boxes ?? [];

    if (boxes.length === 0) {
      return {
        success: false,
        error: 'No boxes available in rack',
        location: { tankId, rackId, boxId: 'A' },
      };
    }

    return this.navigateToLocation({
      tankId,
      rackId,
      boxId: boxes[0].id,
    });
  }

  /**
   * Get current location from store
   */
  public getCurrentLocation(): GridLocation {
    const { currentTank, currentRack, currentBox } = useTubeStore.getState();
    return {
      tankId: currentTank,
      rackId: currentRack,
      boxId: currentBox,
    };
  }

  /**
   * Check if currently navigating (for UI feedback)
   */
  public getIsNavigating(): boolean {
    return this.isNavigating;
  }
}

// Export singleton instance for easy use
export const gridNavigationService = GridNavigationService.getInstance();
