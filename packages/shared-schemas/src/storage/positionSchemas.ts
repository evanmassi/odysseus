import { z } from 'zod';

/**
 * Position Display Format Types
 *
 * Supports both numeric (1-81) and alphanumeric (A1-I9) position labeling
 * to match real-world laboratory freezer box formats.
 *
 * Flexible for ANY grid size - generates labels dynamically.
 */

export const positionDisplayFormatSchema = z.enum(['numeric', 'alphanumeric']);

export type PositionDisplayFormat = z.infer<typeof positionDisplayFormatSchema>;

export const alphanumericConfigSchema = z.object({
  rowLabels: z.array(z.string()).min(1), // ['A', 'B', 'C', ...] or ['1', '2', '3', ...]
  colLabels: z.array(z.string()).min(1), // ['1', '2', '3', ...] or ['A', 'B', 'C', ...]
  format: z.enum(['row-col', 'col-row']).default('row-col'), // "A5" vs "5A"
});

export type AlphanumericConfig = z.infer<typeof alphanumericConfigSchema>;

export const positionDisplayConfigSchema = z.object({
  format: positionDisplayFormatSchema,
  alphanumericConfig: alphanumericConfigSchema.optional(),
}).refine(
  (config) => {
    // If format is alphanumeric, alphanumericConfig MUST exist
    if (config.format === 'alphanumeric') {
      return config.alphanumericConfig !== undefined &&
             config.alphanumericConfig !== null &&
             config.alphanumericConfig.rowLabels.length > 0 &&
             config.alphanumericConfig.colLabels.length > 0;
    }
    // If format is numeric, alphanumericConfig should NOT exist
    if (config.format === 'numeric') {
      return config.alphanumericConfig === undefined;
    }
    return true;
  },
  {
    message: 'Alphanumeric format requires valid alphanumericConfig; numeric format must not have alphanumericConfig',
  }
);

export type PositionDisplayConfig = z.infer<typeof positionDisplayConfigSchema>;

/**
 * Position Display Preference Schema (User Preferences Only)
 *
 * For user preferences, we only store the format preference (numeric vs alphanumeric).
 * The full config with grid-specific alphanumericConfig is generated when applied to actual boxes.
 *
 * This is different from box overrides or lab defaults, which store complete configs.
 */
export const positionDisplayPreferenceSchema = z.object({
  format: positionDisplayFormatSchema,
});

export type PositionDisplayPreference = z.infer<typeof positionDisplayPreferenceSchema>;

/**
 * Generate alphabetic labels for any count (A, B, ... Z, AA, AB, ... ZZ, AAA, ...)
 *
 * @param count - Number of labels to generate
 * @returns Array of alphabetic labels
 *
 * @example
 * generateAlphabeticLabels(3)  // ['A', 'B', 'C']
 * generateAlphabeticLabels(27) // ['A', 'B', ..., 'Z', 'AA']
 */
export function generateAlphabeticLabels(count: number): string[] {
  const labels: string[] = [];

  for (let i = 0; i < count; i++) {
    let num = i;
    let label = '';

    do {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    } while (num >= 0);

    labels.push(label);
  }

  return labels;
}

/**
 * Generate numeric labels for any count (1, 2, 3, ... 100, ...)
 *
 * @param count - Number of labels to generate
 * @returns Array of numeric string labels
 *
 * @example
 * generateNumericLabels(5)   // ['1', '2', '3', '4', '5']
 * generateNumericLabels(100) // ['1', '2', ..., '100']
 */
export function generateNumericLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String(i + 1));
}

/**
 * Create alphanumeric position display config for any grid size
 *
 * @param gridRows - Number of rows in grid
 * @param gridCols - Number of columns in grid
 * @param format - Label format ('row-col' for A1, 'col-row' for 1A)
 * @returns Position display configuration
 *
 * @example
 * // 9x9 grid: A1, A2, ..., I9
 * createAlphanumericConfig(9, 9, 'row-col')
 *
 * // 10x10 grid: A1, A2, ..., J10
 * createAlphanumericConfig(10, 10, 'row-col')
 *
 * // 5x12 grid: 1A, 2A, ..., 12E
 * createAlphanumericConfig(5, 12, 'col-row')
 */
export function createAlphanumericConfig(
  gridRows: number,
  gridCols: number,
  format: 'row-col' | 'col-row' = 'row-col'
): PositionDisplayConfig {
  const rowLabels = generateAlphabeticLabels(gridRows);
  const colLabels = generateNumericLabels(gridCols);

  return {
    format: 'alphanumeric',
    alphanumericConfig: {
      rowLabels,
      colLabels,
      format,
    },
  };
}

/**
 * Create numeric position display config
 *
 * @returns Position display configuration for numeric format
 */
export function createNumericConfig(): PositionDisplayConfig {
  return {
    format: 'numeric',
  };
}

/**
 * Preset configurations for common laboratory freezer box formats
 *
 * Note: These are examples for 9x9 grids. For other grid sizes,
 * use createAlphanumericConfig(rows, cols, format) instead.
 */
export const POSITION_DISPLAY_PRESETS = {
  // Simple numeric labels: 1, 2, 3, ..., 81
  NUMERIC: createNumericConfig(),

  // Standard freezer box format: A1, A2, B1, B2, ..., I9 (9x9 grid)
  // Most common for commercial laboratory freezer boxes
  ALPHANUMERIC_STANDARD: createAlphanumericConfig(9, 9, 'row-col'),

  // Reverse format: 1A, 2A, 1B, 2B, ..., 9I (9x9 grid)
  ALPHANUMERIC_REVERSE: createAlphanumericConfig(9, 9, 'col-row'),
} as const;

/**
 * Get default position display config for a given grid size
 *
 * Returns alphanumeric (row-col) format by default.
 * For custom formats, use createAlphanumericConfig() or createNumericConfig().
 *
 * @param gridRows - Number of rows in grid
 * @param gridCols - Number of columns in grid
 * @returns Position display configuration appropriate for grid size
 *
 * @example
 * getDefaultPositionDisplay(5, 5)   // A1-E5
 * getDefaultPositionDisplay(9, 9)   // A1-I9
 * getDefaultPositionDisplay(10, 10) // A1-J10
 */
export function getDefaultPositionDisplay(
  gridRows: number,
  gridCols: number
): PositionDisplayConfig {
  return createAlphanumericConfig(gridRows, gridCols, 'row-col');
}
