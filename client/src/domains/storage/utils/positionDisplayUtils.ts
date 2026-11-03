import {
  positionToLabel,
  getDefaultPositionDisplay,
  createAlphanumericConfig,
  createNumericConfig,
  type PositionDisplayConfig,
  type UserSettings,
  type GridConfiguration,
} from '@odysseus/shared-schemas';

function resolvePositionDisplay(
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): PositionDisplayConfig {
  const format = userSettings?.defaultPositionDisplay?.format;
  if (format === 'numeric') return createNumericConfig();
  if (format === 'alphanumeric') {
    return createAlphanumericConfig(gridConfig.rows, gridConfig.cols, 'row-col');
  }
  return getDefaultPositionDisplay(gridConfig.rows, gridConfig.cols);
}

export function formatPositionForBox(
  position: number,
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): string {
  const config = resolvePositionDisplay(gridConfig, userSettings);
  return positionToLabel(position, gridConfig.rows, gridConfig.cols, config);
}

export function getAxisLabelsForBox(
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): { rowLabels: string[]; colLabels: string[] } | null {
  const config = resolvePositionDisplay(gridConfig, userSettings);
  if (config.format !== 'alphanumeric' || !config.alphanumericConfig) {
    return null;
  }
  return {
    rowLabels: config.alphanumericConfig.rowLabels,
    colLabels: config.alphanumericConfig.colLabels,
  };
}

export function buildPositionRangeLabels(
  positions: number[],
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): string[] {
  if (positions.length === 0) return [];

  const sorted = [...new Set(positions)].sort((a, b) => a - b);

  const ranges: { start: number; end: number }[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }
  ranges.push({ start: rangeStart, end: rangeEnd });

  return ranges.map(({ start, end }) => {
    const startLabel = formatPositionForBox(start, gridConfig, userSettings);
    if (start === end) return startLabel;
    return `${startLabel}-${formatPositionForBox(end, gridConfig, userSettings)}`;
  });
}

export function formatPositionRangesForBox(
  positions: number[],
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): string {
  return buildPositionRangeLabels(positions, gridConfig, userSettings).join(', ');
}
