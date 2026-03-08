/**
 * Tube UI Store
 *
 * Client-only UI state for location navigation and grid selection.
 */

import { NAMING_PATTERNS } from '@odysseus/shared-schemas';
import { create } from 'zustand';

import { type PositionKey } from '@shared/types/GridSelection';

import type { SelectionMode } from '@shared/types/Clipboard';

interface TubeStoreState {
  currentTank: string;
  currentRack: string;
  currentBox: string;

  selectedPositions: Set<PositionKey>;
  selectionAnchor: number | null;
  /** Determines paste positioning strategy (rectangular vs sequential) */
  lastSelectionMethod: SelectionMode;
}

interface TubeStoreActions {
  setCurrentTank: (tankId: string) => void;
  setCurrentRack: (rackId: string) => void;
  setCurrentBox: (boxId: string) => void;

  togglePosition: (position: PositionKey) => void;
  clearSelection: () => void;
  setSelection: (positions: Set<PositionKey>) => void;
  setSelectionAnchor: (position: number | null) => void;
  setLastSelectionMethod: (method: SelectionMode) => void;

  resetStore: () => void;
}

const initialState: TubeStoreState = {
  currentTank: NAMING_PATTERNS.TANK.ID_PATTERN(1),
  currentRack: '1',
  currentBox: 'A',
  selectedPositions: new Set<PositionKey>(),
  selectionAnchor: null,
  lastSelectionMethod: 'standard',
};

export const useTubeStore = create<TubeStoreState & TubeStoreActions>((set, get) => ({
  ...initialState,

  // Clear selection on location change
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
  setLastSelectionMethod: method => set({ lastSelectionMethod: method }),

  resetStore: () =>
    set({
      ...initialState,
      // Set must produce new instances to trigger re-renders
      selectedPositions: new Set<PositionKey>(),
    }),
}));
