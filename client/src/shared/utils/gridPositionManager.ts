/**
 * Grid Position Manager
 *
 * Centralized service for grid position state. Handles validation, bounds checking,
 * and event emission for position changes from any source (mouse, keyboard, programmatic).
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { logger } from '@shared/infrastructure/logger';

export type PositionSource = 'mouse' | 'keyboard' | 'programmatic' | 'search';

interface GridPositionState {
  currentPosition: number;
  lastSource: PositionSource;
  gridContext: {
    tankId: string;
    rackId: string;
    boxId: string;
    gridSize: number;
  } | null;
}

interface GridPositionActions {
  setPosition: (position: number, source: PositionSource) => void;
  setGridContext: (context: GridPositionState['gridContext']) => void;
  validatePosition: (position: number) => boolean;
  resetToDefault: () => void;
}

type GridPositionStore = GridPositionState & GridPositionActions;

/**
 * Zustand store for grid position management
 * Uses subscribeWithSelector middleware for fine-grained subscriptions
 */
const useGridPositionStore = create<GridPositionStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentPosition: 1,
    lastSource: 'programmatic',
    gridContext: null,

    // Actions
    setPosition: (position: number, source: PositionSource) => {
      const state = get();

      // Validate position bounds
      if (!state.validatePosition(position)) {
        logger.warn(
          `Invalid grid position: ${position}. Keeping current: ${state.currentPosition}`
        );
        return;
      }

      // Only update if position actually changed
      if (state.currentPosition !== position) {
        set({
          currentPosition: position,
          lastSource: source,
        });
      }
    },

    setGridContext: (context: GridPositionState['gridContext']) => {
      const state = get();
      set({ gridContext: context });

      // Reset position to 1 when context changes (new box/rack/tank)
      if (
        context &&
        (!state.gridContext ||
          state.gridContext.tankId !== context.tankId ||
          state.gridContext.rackId !== context.rackId ||
          state.gridContext.boxId !== context.boxId)
      ) {
        set({ currentPosition: 1, lastSource: 'programmatic' });
      }
    },

    validatePosition: (position: number): boolean => {
      const { gridContext } = get();
      if (!gridContext) return true; // Allow any position if no context set

      const maxPosition = gridContext.gridSize * gridContext.gridSize;
      return position >= 1 && position <= maxPosition && Number.isInteger(position);
    },

    resetToDefault: () => {
      set({ currentPosition: 1, lastSource: 'programmatic' });
    },
  }))
);

/**
 * Grid Position Manager Service
 * Provides a clean API for position management with additional utilities
 */
export class GridPositionManager {
  private static instance: GridPositionManager;

  public static getInstance(): GridPositionManager {
    if (!GridPositionManager.instance) {
      GridPositionManager.instance = new GridPositionManager();
    }
    return GridPositionManager.instance;
  }

  /**
   * Set the current grid position
   */
  public setPosition(position: number, source: PositionSource = 'programmatic'): void {
    useGridPositionStore.getState().setPosition(position, source);
  }

  /**
   * Get the current grid position
   */
  public getCurrentPosition(): number {
    return useGridPositionStore.getState().currentPosition;
  }

  /**
   * Set the grid context (tank/rack/box/size)
   */
  public setGridContext(tankId: string, rackId: string, boxId: string, gridSize: number): void {
    useGridPositionStore.getState().setGridContext({
      tankId,
      rackId,
      boxId,
      gridSize,
    });
  }

  /**
   * Subscribe to position changes
   */
  public subscribe(callback: (position: number, source: PositionSource) => void): () => void {
    return useGridPositionStore.subscribe(
      state => ({ position: state.currentPosition, source: state.lastSource }),
      ({ position, source }) => callback(position, source),
      { equalityFn: (a, b) => a.position === b.position }
    );
  }

  /**
   * Validate if a position is within bounds
   */
  public isValidPosition(position: number): boolean {
    return useGridPositionStore.getState().validatePosition(position);
  }

  /**
   * Reset position to default (1)
   */
  public resetPosition(): void {
    useGridPositionStore.getState().resetToDefault();
  }

  /**
   * Get current grid context
   */
  public getGridContext() {
    return useGridPositionStore.getState().gridContext;
  }
}

// Export singleton instance
export const gridPositionManager = GridPositionManager.getInstance();

// Export store hook for React components
export { useGridPositionStore };
