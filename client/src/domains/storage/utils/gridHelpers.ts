/**
 * Grid Configuration UI Helpers
 * Computed properties derived from domain model
 */

import {
  GRID_TEMPLATES as SHARED_GRID_TEMPLATES,
  EQUIPMENT_DEFAULTS,
} from '@odysseus/shared-schemas';

import type { GridConfiguration } from '@odysseus/shared-schemas';

/**
 * Get total positions in a grid (rows × cols)
 */
export function getGridTotalPositions(grid: GridConfiguration): number {
  return grid.rows * grid.cols;
}

/**
 * Get user-friendly display name for grid configuration
 */
export function getGridDisplayName(grid: GridConfiguration): string {
  const size = `${grid.rows}×${grid.cols}`;

  switch (grid.template) {
    case 'compact':
      return `Compact ${size} Grid`;
    case 'standard':
      return `Standard ${size} Grid`;
    case 'large':
      return `Large ${size} Grid`;
    case 'rectangular':
      return `Rectangular ${size} Grid`;
    default:
      return `${size} Grid`;
  }
}

/**
 * Get grid type from template (for backward compatibility)
 */
export function getGridType(grid: GridConfiguration): string {
  return grid.template;
}

/**
 * Create grid configuration from dimensions and template
 */
export function createGridConfig(rows: number, cols: number, template: string): GridConfiguration {
  return {
    rows,
    cols,
    template,
  };
}

/**
 * Standard grid templates for UI selection
 * Re-exported from shared-schemas for convenience
 */
export const GRID_TEMPLATES = SHARED_GRID_TEMPLATES;

/**
 * Default grid configuration
 * Derived from shared constants
 */
export const DEFAULT_GRID_CONFIG: GridConfiguration = {
  rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
  cols: EQUIPMENT_DEFAULTS.GRID_COLS,
  template: 'standard',
};
