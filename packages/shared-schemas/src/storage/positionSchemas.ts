import { z } from 'zod';

const positionDisplayFormatSchema = z.enum(['numeric', 'alphanumeric']);

const alphanumericConfigSchema = z.object({
  rowLabels: z.array(z.string()).min(1),
  colLabels: z.array(z.string()).min(1),
  format: z.enum(['row-col', 'col-row']).default('row-col'),
});

const positionDisplayConfigSchema = z.object({
  format: positionDisplayFormatSchema,
  alphanumericConfig: alphanumericConfigSchema.optional(),
});

export type PositionDisplayConfig = z.infer<typeof positionDisplayConfigSchema>;

export const positionDisplayPreferenceSchema = z.object({
  format: positionDisplayFormatSchema,
});

export type PositionDisplayPreference = z.infer<typeof positionDisplayPreferenceSchema>;

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

function generateNumericLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String(i + 1));
}

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

export function getDefaultPositionDisplay(
  gridRows: number,
  gridCols: number
): PositionDisplayConfig {
  return createAlphanumericConfig(gridRows, gridCols, 'row-col');
}
