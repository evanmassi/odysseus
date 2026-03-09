/**
 * Grid Templates and Configuration
 *
 * Storage boxes are square and range from 5x5 to 10x10 positions.
 */

import type { GridConfiguration } from '../storage/configurationSchemas';

export const GRID_TEMPLATES: readonly GridConfiguration[] = [
  { rows: 5, cols: 5, template: 'extra-small' },   // 25 positions
  { rows: 6, cols: 6, template: 'small' },          // 36 positions
  { rows: 7, cols: 7, template: 'compact' },        // 49 positions
  { rows: 8, cols: 8, template: 'medium' },         // 64 positions
  { rows: 9, cols: 9, template: 'standard' },       // 81 positions (default)
  { rows: 10, cols: 10, template: 'large' },        // 100 positions
] as const;

export const DEFAULT_GRID_CONFIG: GridConfiguration = {
  rows: 9,
  cols: 9,
  template: 'standard',
};
