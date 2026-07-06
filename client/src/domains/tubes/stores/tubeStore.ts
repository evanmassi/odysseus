/**
 * Tube UI Store
 *
 * Client-only UI state for location navigation and grid selection.
 */

import { create } from 'zustand';

import type { SelectionMode } from '@domains/tubes/types/clipboardTypes';
import type { PositionKey } from '@domains/tubes/types/gridSelectionTypes';

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

  clearSelection: () => void;
  setSelection: (positions: Set<PositionKey>) => void;
  setSelectionAnchor: (position: number | null) => void;
  setLastSelectionMethod: (method: SelectionMode) => void;

  resetStore: () => void;
}

const initialState: TubeStoreState = {
  currentTank: '',
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
