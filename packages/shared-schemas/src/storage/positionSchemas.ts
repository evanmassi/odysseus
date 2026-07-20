/**
 * Position Display Schemas
 *
 * Supports numeric (1-81) and alphanumeric (A1-I9) position labeling for lab freezer boxes.
 */

import { z } from 'zod';

export const positionDisplayFormatSchema = z.enum(['numeric', 'alphanumeric']);

export const alphanumericConfigSchema = z.object({
  rowLabels: z.array(z.string()).min(1), // ['A', 'B', 'C', ...] or ['1', '2', '3', ...]
  colLabels: z.array(z.string()).min(1), // ['1', '2', '3', ...] or ['A', 'B', 'C', ...]
  format: z.enum(['row-col', 'col-row']).default('row-col'), // "A5" vs "5A"
});

export const positionDisplayConfigSchema = z
  .object({
    format: positionDisplayFormatSchema,
    alphanumericConfig: alphanumericConfigSchema.optional(),
  })
  .refine(
    config => {
      // If format is alphanumeric, alphanumericConfig MUST exist
      if (config.format === 'alphanumeric') {
        return (
          config.alphanumericConfig !== undefined &&
          config.alphanumericConfig !== null &&
          config.alphanumericConfig.rowLabels.length > 0 &&
          config.alphanumericConfig.colLabels.length > 0
        );
      }
      // If format is numeric, alphanumericConfig should NOT exist
      if (config.format === 'numeric') {
        return config.alphanumericConfig === undefined;
      }
      return true;
    },
    {
      message:
        'Alphanumeric format requires valid alphanumericConfig; numeric format must not have alphanumericConfig',
    }
  );

export type PositionDisplayConfig = z.infer<typeof positionDisplayConfigSchema>;

/**
 * For user preferences, only the format is stored (numeric vs alphanumeric).
 * The full alphanumericConfig is generated when applied to a specific box — unlike
 * box overrides or lab defaults, which store complete configs.
 */
export const positionDisplayPreferenceSchema = z.object({
  format: positionDisplayFormatSchema,
});

export type PositionDisplayPreference = z.infer<typeof positionDisplayPreferenceSchema>;

/**
 * Generates alphabetic labels for any count (A, B, ... Z, AA, AB, ... ZZ, AAA, ...)
 *
 * @example
 * generateAlphabeticLabels(3)  // ['A', 'B', 'C']
 * generateAlphabeticLabels(27) // ['A', 'B', ..., 'Z', 'AA']
 */
function generateAlphabeticLabels(count: number): string[] {
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
 * @example
 * generateNumericLabels(5)   // ['1', '2', '3', '4', '5']
 * generateNumericLabels(100) // ['1', '2', ..., '100']
 */
function generateNumericLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String(i + 1));
}

/**
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

export function createNumericConfig(): PositionDisplayConfig {
  return {
    format: 'numeric',
  };
}

/**
 * Returns alphanumeric (row-col) format by default.
 * For custom formats, use createAlphanumericConfig() or createNumericConfig().
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
