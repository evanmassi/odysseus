/**
 * Grid Configuration Helpers
 *
 * Computed properties and constants for storage grid configurations.
 */

import type { GridConfiguration } from '@odysseus/shared-schemas';

export { GRID_TEMPLATES, DEFAULT_GRID_CONFIG } from '@odysseus/shared-schemas';

export function getGridTotalPositions(grid: GridConfiguration): number {
  return grid.rows * grid.cols;
}
