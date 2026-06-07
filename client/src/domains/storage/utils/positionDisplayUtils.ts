/**
 * Position Display Utilities
 *
 * Resolves position display config via 4-tier fallback hierarchy
 * (box override → user preference → lab default → system default)
 * and formats numeric positions to display labels.
 */

import {
  positionToLabel,
  getDefaultPositionDisplay,
  createAlphanumericConfig,
  createNumericConfig,
  type PositionDisplayConfig,
  type PositionDisplayPreference,
  type UserSettings,
  type GridConfiguration,
  type LabConfiguration,
} from '@odysseus/shared-schemas';

// Preferences are format-only to avoid storing grid-specific data that varies by box.
// Full configs are generated on-demand for each box.
function preferenceToConfig(
  preference: PositionDisplayPreference | undefined | null,
  gridRows: number,
  gridCols: number
): PositionDisplayConfig {
  if (!preference?.format) {
    return getDefaultPositionDisplay(gridRows, gridCols);
  }

  if (preference.format === 'numeric') {
    return createNumericConfig();
  }

  if (preference.format === 'alphanumeric') {
    return createAlphanumericConfig(gridRows, gridCols, 'row-col');
  }

  return getDefaultPositionDisplay(gridRows, gridCols);
}

/**
 * 4-Tier Hierarchy (highest to lowest priority):
 * 1. Box override — full config stored per-box
 * 2. User preference — format-only, converted to full config on-demand
 * 3. Lab default — full config stored lab-wide
 * 4. System default — alphanumeric (built-in fallback)
 */
function getResolvedPositionDisplay(
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  currentLab: LabConfiguration | null,
  userSettings?: UserSettings | null
): PositionDisplayConfig {
  // 1. Box-specific override
  const tank = currentLab?.equipment.tanks.find(t => t.id === tankId);
  const rack = tank?.racks?.find(r => r.id === rackId);
  const box = rack?.boxes?.find(b => b.id === boxId);
  const boxOverride = box?.positionDisplay;
  if (boxOverride) {
    return boxOverride;
  }

  // 2. User preference
  if (userSettings?.defaultPositionDisplay) {
    return preferenceToConfig(
      userSettings.defaultPositionDisplay,
      gridConfig.rows,
      gridConfig.cols
    );
  }

  // 3. Lab-wide default
  const labDefault = currentLab?.settings?.defaultPositionDisplay;
  if (labDefault) {
    return labDefault;
  }

  // 4. System default
  return getDefaultPositionDisplay(gridConfig.rows, gridConfig.cols);
}

/** @example formatPositionForBox(23, 'tank-1', '1', 'A', { rows: 9, cols: 9 }, currentLab) // "C5" */
export function formatPositionForBox(
  position: number,
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  currentLab: LabConfiguration | null,
  userSettings?: UserSettings | null
): string {
  const config = getResolvedPositionDisplay(
    tankId,
    rackId,
    boxId,
    gridConfig,
    currentLab,
    userSettings
  );

  return positionToLabel(position, gridConfig.rows, gridConfig.cols, config);
}

/** Row/column axis labels for rulers, or null when the box uses numeric (axis-less) positions. */
export function getAxisLabelsForBox(
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  currentLab: LabConfiguration | null,
  userSettings?: UserSettings | null
): { rowLabels: string[]; colLabels: string[] } | null {
  const config = getResolvedPositionDisplay(
    tankId,
    rackId,
    boxId,
    gridConfig,
    currentLab,
    userSettings
  );
  if (config.format !== 'alphanumeric' || !config.alphanumericConfig) {
    return null;
  }
  return {
    rowLabels: config.alphanumericConfig.rowLabels,
    colLabels: config.alphanumericConfig.colLabels,
  };
}

/**
 * Builds consecutive ranges from positions, then formats labels per box config.
 *
 * @example
 * formatPositionRangesForBox([1,2,3,23,24,25], 'T1', 'R1', 'A', grid, lab, settings)
 * // alphanumeric: "A1-A3, C5-C7" | numeric: "1-3, 23-25"
 */
export function formatPositionRangesForBox(
  positions: number[],
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  currentLab: LabConfiguration | null,
  userSettings?: UserSettings | null
): string {
  if (positions.length === 0) return '';
  if (positions.length === 1) {
    return formatPositionForBox(
      positions[0],
      tankId,
      rackId,
      boxId,
      gridConfig,
      currentLab,
      userSettings
    );
  }

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

  const formattedRanges = ranges.map(({ start, end }) => {
    const startLabel = formatPositionForBox(
      start,
      tankId,
      rackId,
      boxId,
      gridConfig,
      currentLab,
      userSettings
    );

    if (start === end) {
      return startLabel;
    }

    const endLabel = formatPositionForBox(
      end,
      tankId,
      rackId,
      boxId,
      gridConfig,
      currentLab,
      userSettings
    );
    return `${startLabel}-${endLabel}`;
  });

  return formattedRanges.join(', ');
}
