/**
 * Paste Validation Utilities
 *
 * Pure functions for validating paste operations across different grid configurations.
 * Validation patterns with zero side effects.
 */

import type { GridConfiguration} from '@/domains/storage';
import { getGridTotalPositions } from '@/domains/storage';

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
 * Validates a paste operation between source and target grids
 *
 * @param sourcePositions - Original positions of tubes being copied
 * @param targetAnchor - First position in target grid where paste will start
 * @param sourceGrid - Grid configuration of source box
 * @param targetGrid - Grid configuration of target box
 * @returns Validation result with warnings and valid target positions
 */
export function validatePasteOperation(
  sourcePositions: number[],
  targetAnchor: number,
  sourceGrid: GridConfig,
  targetGrid: GridConfig
): PasteValidationResult {
  const warnings: string[] = [];

  // Check grid size mismatch (warn user about layout changes)
  const gridSizeMismatch =
    sourceGrid.rows !== targetGrid.rows ||
    sourceGrid.cols !== targetGrid.cols;

  if (gridSizeMismatch) {
    warnings.push(
      `Source box (${sourceGrid.rows}×${sourceGrid.cols}) and target box (${targetGrid.rows}×${targetGrid.cols}) have different sizes. Relative positions may be adjusted.`
    );
  }

  // Calculate target positions using same relative positioning logic as paste
  const minSource = Math.min(...sourcePositions);
  const targetPositions = sourcePositions.map(
    pos => targetAnchor + (pos - minSource)
  );

  // Check for out-of-bounds positions
  const validPositions = targetPositions.filter(
    pos => pos >= 1 && pos <= getGridTotalPositions(targetGrid)
  );

  if (validPositions.length < targetPositions.length) {
    const skipped = targetPositions.length - validPositions.length;
    warnings.push(
      `${skipped} tube${skipped > 1 ? 's' : ''} would be pasted outside the grid and will be skipped.`
    );
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    validTargetPositions: validPositions
  };
}
