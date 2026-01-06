import { NAMING_PATTERNS } from '@odysseus/shared-schemas';
import { create } from 'zustand';

import { type PositionKey } from '@shared/types/grid';

/**
 * Tube Store - Client State Management
 *
 * Client-only UI state. Server state is handled by React Query hooks.
 *
 * Responsibilities:
 * - UI State: Navigation (tank/rack/box), selections
 * - Socket Connection: Real-time updates integration
 * - Client Utilities: Duplicate cleanup
 */

/**
 * Pure client UI state - no server/domain type dependencies
 */
interface CleanTubeState {
  // Navigation state
  currentTank: string;
  currentRack: string;
  currentBox: string;

  // Selection state
  selectedPositions: Set<PositionKey>;
  selectionAnchor: number | null; // Last clicked position for Shift+Click range selection

  // Socket connection state (managed centrally by AppBootstrapService)
  isConnected: boolean;
}

interface CleanTubeActions {
  // Navigation actions (used by GridNavigationService)
  setCurrentTank: (tankId: string) => void;
  setCurrentRack: (rackId: string) => void;
  setCurrentBox: (boxId: string) => void;

  // Selection actions
  togglePosition: (position: PositionKey) => void;
  clearSelection: () => void;
  setSelection: (positions: Set<PositionKey>) => void;
  setSelectionAnchor: (position: number | null) => void; // Set anchor for range selection

  // Store reset (used on logout)
  resetStore: () => void;
}

interface CleanTubeStore extends CleanTubeState, CleanTubeActions {}

export const useTubeStore = create<CleanTubeStore>((set, get) => ({
  // Pure UI state - server state handled by React Query
  selectedPositions: new Set<PositionKey>(),
  selectionAnchor: null, // No anchor until first click
  currentTank: NAMING_PATTERNS.TANK.ID_PATTERN(1),
  currentRack: '1',
  currentBox: 'A',

  // Socket connection is now managed centrally (legacy state preserved for compatibility)
  isConnected: true, // Always true since bootstrap handles connection

  // NAVIGATION ACTIONS - Used by GridNavigationService
  // Clear selection on location change (matches Excel/Figma behavior)
  setCurrentTank: tankId => {
    const { currentTank } = get();
    if (tankId !== currentTank) {
      set({
        currentTank: tankId,
        selectedPositions: new Set<PositionKey>(),
        selectionAnchor: null,
      });
    }
  },

  setCurrentRack: rackId => {
    const { currentRack } = get();
    if (rackId !== currentRack) {
      set({
        currentRack: rackId,
        selectedPositions: new Set<PositionKey>(),
        selectionAnchor: null,
      });
    }
  },

  setCurrentBox: boxId => {
    const { currentBox } = get();
    if (boxId !== currentBox) {
      set({ currentBox: boxId, selectedPositions: new Set<PositionKey>(), selectionAnchor: null });
    }
  },

  // SELECTION ACTIONS - Pure client state
  togglePosition: position => {
    const { selectedPositions } = get();
    const newSelection = new Set(selectedPositions);
    if (newSelection.has(position)) {
      newSelection.delete(position);
    } else {
      newSelection.add(position);
    }
    set({ selectedPositions: newSelection });
  },

  clearSelection: () => set({ selectedPositions: new Set<PositionKey>(), selectionAnchor: null }),
  setSelection: positions => set({ selectedPositions: positions }),
  setSelectionAnchor: position => set({ selectionAnchor: position }),

  // Socket connection is now managed centrally by AppBootstrapService → SocketQueryBridge
  // Legacy methods removed - no longer needed

  // Reset store to initial state (used on logout)
  resetStore: () =>
    set({
      selectedPositions: new Set<PositionKey>(),
      selectionAnchor: null,
      currentTank: NAMING_PATTERNS.TANK.ID_PATTERN(1),
      currentRack: '1',
      currentBox: 'A',
    }),
}));
