// Pure selection action functions - easy to test and reason about
import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';

import { type PositionKey } from '@shared/types/grid';

export interface SelectionActions {
  singleSelect: (positionKey: PositionKey, onSelectionChange: (positions: Set<PositionKey>) => void, setAnimationKey: (fn: (prev: number) => number) => void) => void;
  multiToggle: (positionKey: PositionKey, selectedPositions: Set<PositionKey>, onSelectionChange: (positions: Set<PositionKey>) => void, setAnimationKey: (fn: (prev: number) => number) => void) => void;
  rangeSelect: (start: number, end: number, selectedPositions: Set<PositionKey>, onSelectionChange: (positions: Set<PositionKey>) => void, getPositionKey: (position: number) => PositionKey, setAnimationKey: (fn: (prev: number) => number) => void, gridCols?: number) => void;
  clearSelection: (onSelectionChange: (positions: Set<PositionKey>) => void, setAnimationKey: (fn: (prev: number) => number) => void) => void;
}

export const createSelectionActions = (): SelectionActions => ({
  singleSelect: (positionKey, onSelectionChange, setAnimationKey) => {
    const newSelection = new Set<PositionKey>();
    newSelection.add(positionKey);
    onSelectionChange(newSelection);
    setAnimationKey(prev => prev + 1);
  },

  multiToggle: (positionKey, selectedPositions, onSelectionChange, setAnimationKey) => {
    const newSelection = new Set(selectedPositions);
    if (newSelection.has(positionKey)) {
      newSelection.delete(positionKey);
    } else {
      newSelection.add(positionKey);
    }
    onSelectionChange(newSelection);
    setAnimationKey(prev => prev + 1);
  },

  rangeSelect: (start, end, selectedPositions, onSelectionChange, getPositionKey, setAnimationKey, gridCols = EQUIPMENT_DEFAULTS.GRID_COLS) => {
    const newSelection = new Set(selectedPositions);

    // Calculate range of positions
    const minPos = Math.min(start, end);
    const maxPos = Math.max(start, end);

    // Convert position numbers to row/col to handle 2D selection
    const startRow = Math.floor((minPos - 1) / gridCols);
    const startCol = (minPos - 1) % gridCols;
    const endRow = Math.floor((maxPos - 1) / gridCols);
    const endCol = (maxPos - 1) % gridCols;

    // Select rectangle area
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    const maxPositions = EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX;

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const pos = row * gridCols + col + 1;
        if (pos >= 1 && pos <= maxPositions) {
          newSelection.add(getPositionKey(pos));
        }
      }
    }

    onSelectionChange(newSelection);
    setAnimationKey(prev => prev + 1);
  },

  clearSelection: (onSelectionChange, setAnimationKey) => {
    onSelectionChange(new Set());
    setAnimationKey(prev => prev + 1);
  }
});
