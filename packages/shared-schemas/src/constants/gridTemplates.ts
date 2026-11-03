import type { GridConfiguration } from '../storage/storageSchemas';

export const GRID_TEMPLATES: readonly GridConfiguration[] = [
  { rows: 5, cols: 5 },
  { rows: 6, cols: 6 },
  { rows: 7, cols: 7 },
  { rows: 8, cols: 8 },
  { rows: 9, cols: 9 },
  { rows: 10, cols: 10 },
] as const;

export const DEFAULT_GRID_CONFIG: GridConfiguration = { rows: 9, cols: 9 };
