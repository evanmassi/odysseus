/**
 * Paste Validation Utilities
 *
 * Pure functions for validating paste operations across different grid configurations.
 * Validation patterns with zero side effects.
 */

import type { GridConfiguration } from '@/domains/storage';
import { getGridTotalPositions } from '@/domains/storage';

import type { SelectionMode } from '@shared/types/Clipboard';

/**
 * Grid configuration for validation (re-export shared schema type)
 */
type GridConfig = GridConfiguration;

/**
 * Result of paste validation operation
 */
export interface PasteValidationResult {
  isValid: boolean;
  warnings: string[];
  validTargetPositions: number[];
}

/**
 * Validates a paste operation between source and target grids.
 * Uses coordinate-based mapping for drag selections and sequential mapping otherwise,
 * matching the actual paste positioning logic.
 */
export function validatePasteOperation(
  sourcePositions: number[],
  targetAnchor: number,
  sourceGrid: GridConfig,
  targetGrid: GridConfig,
  selectionMode: SelectionMode = 'standard'
): PasteValidationResult {
  const warnings: string[] = [];
  const totalTargetPositions = getGridTotalPositions(targetGrid);

  const gridSizeMismatch =
    sourceGrid.rows !== targetGrid.rows || sourceGrid.cols !== targetGrid.cols;

  if (gridSizeMismatch) {
    warnings.push(
      `Source box (${sourceGrid.rows}×${sourceGrid.cols}) and target box (${targetGrid.rows}×${targetGrid.cols}) have different sizes. Relative positions may be adjusted.`
    );
  }

  let targetPositions: number[];

  if (selectionMode === 'drag') {
    // Coordinate-based mapping matching rectangular paste logic
    const posToRowCol = (pos: number, cols: number) => ({
      row: Math.floor((pos - 1) / cols),
      col: (pos - 1) % cols,
    });
    const rowColToPos = (row: number, col: number, cols: number) => row * cols + col + 1;

    const sourceCoords = sourcePositions.map(pos => posToRowCol(pos, sourceGrid.cols));
    const minRow = Math.min(...sourceCoords.map(c => c.row));
    const minCol = Math.min(...sourceCoords.map(c => c.col));
    const anchorCoords = posToRowCol(targetAnchor, targetGrid.cols);

    targetPositions = sourceCoords.map(({ row, col }) => {
      const targetRow = anchorCoords.row + (row - minRow);
      const targetCol = anchorCoords.col + (col - minCol);

      if (
        targetRow < 0 ||
        targetRow >= targetGrid.rows ||
        targetCol < 0 ||
        targetCol >= targetGrid.cols
      ) {
        return -1; // Out of bounds marker
      }

      return rowColToPos(targetRow, targetCol, targetGrid.cols);
    });
  } else {
    // Sequential mapping: anchor, anchor+1, anchor+2, ...
    targetPositions = sourcePositions.map((_, index) => targetAnchor + index);
  }

  const validPositions = targetPositions.filter(pos => pos >= 1 && pos <= totalTargetPositions);

  if (validPositions.length < targetPositions.length) {
    const skipped = targetPositions.length - validPositions.length;
    warnings.push(
      `${skipped} tube${skipped > 1 ? 's' : ''} would be pasted outside the grid and will be skipped.`
    );
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    validTargetPositions: validPositions,
  };
}
