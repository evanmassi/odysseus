/**
 * Grid Configuration Helpers
 *
 * Computed properties and constants for storage grid configurations.
 */

import {
  GRID_TEMPLATES as SHARED_GRID_TEMPLATES,
  EQUIPMENT_DEFAULTS,
} from '@odysseus/shared-schemas';

import type { GridConfiguration } from '@odysseus/shared-schemas';

export function getGridTotalPositions(grid: GridConfiguration): number {
  return grid.rows * grid.cols;
}

export const GRID_TEMPLATES = SHARED_GRID_TEMPLATES;

export const DEFAULT_GRID_CONFIG: GridConfiguration = {
  rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
  cols: EQUIPMENT_DEFAULTS.GRID_COLS,
  template: 'standard',
};
