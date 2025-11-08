/**
 * Position Display Utilities (Client-Side)
 *
 * Wraps shared-schemas position formatters with storage store integration
 * for automatic position display config lookup.
 *
 * Handles conversion from user preferences (format-only) to full configs with grid-specific details.
 */

import {
  positionToLabel,
  labelToPosition,
  isValidPositionLabel,
  generatePositionLabels,
  getDefaultPositionDisplay,
  createAlphanumericConfig,
  createNumericConfig,
  type PositionDisplayConfig,
  type PositionDisplayPreference,
  type UserSettings   ,
 GridConfiguration } from '@odysseus/shared-schemas';

import { useStorageStore } from '../stores/storageStore';

/**
 * Convert user preference to full position display config
 *
 * User preferences store only format (numeric/alphanumeric).
 * This function generates the full config with grid-specific alphanumericConfig.
 *
 * This is INTENTIONAL: preferences are format-only to avoid storing grid-specific
 * data that varies by box. Full configs are generated on-demand for each box.
 *
 * @param preference - User's format preference (from user settings)
 * @param gridRows - Number of rows for generating alphanumeric config
 * @param gridCols - Number of columns for generating alphanumeric config
 * @returns Complete position display config ready for formatting
 */
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

  // Fallback to default
  return getDefaultPositionDisplay(gridRows, gridCols);
}

/**
 * Get resolved position display config with proper fallback hierarchy
 *
 * 4-Tier Hierarchy (highest to lowest priority):
 * 1. Box override - full config stored per-box
 * 2. User preference - format-only, converted to full config on-demand
 * 3. Lab default - full config stored lab-wide
 * 4. System default - alphanumeric (built-in fallback)
 *
 * @param tankId - Tank identifier
 * @param rackId - Rack identifier
 * @param boxId - Box identifier
 * @param gridConfig - Grid configuration for dimensions
 * @param userSettings - Optional user settings (for user preference tier)
 * @returns Resolved position display configuration
 */
function getResolvedPositionDisplay(
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): PositionDisplayConfig {
  const state = useStorageStore.getState();

  // 1. Check for box-specific override (highest priority)
  // Box overrides are full configs, validated by schema
  const boxOverride = state.getBoxPositionDisplay(tankId, rackId, boxId);
  if (boxOverride) {
    return boxOverride;
  }

  // 2. Check for user preference
  // User preferences are format-only, converted to full config here
  if (userSettings?.defaultPositionDisplay) {
    return preferenceToConfig(userSettings.defaultPositionDisplay, gridConfig.rows, gridConfig.cols);
  }

  // 3. Check for lab-wide default
  // Lab defaults are full configs, validated by schema
  const currentLab = state.currentLab;
  const labDefault = currentLab?.settings?.defaultPositionDisplay;
  if (labDefault) {
    return labDefault;
  }

  // 4. Fall back to system default (alphanumeric)
  return getDefaultPositionDisplay(gridConfig.rows, gridConfig.cols);
}

/**
 * Format a numeric position to display label using box's configuration
 *
 * Automatically retrieves position display config from storage store.
 * 4-Tier Hierarchy: box override → user preference → lab default → system default
 *
 * @param position - 1-based position number (1-81 for 9x9 grid)
 * @param tankId - Tank identifier
 * @param rackId - Rack identifier
 * @param boxId - Box identifier
 * @param gridConfig - Grid configuration for dimensions
 * @param userSettings - Optional user settings for user preference tier
 * @returns Formatted label ("23" or "C5" depending on config)
 *
 * @example
 * formatPositionForBox(23, 'tank-1', '1', 'A', { rows: 9, cols: 9 }) // "C5"
 */
export function formatPositionForBox(
  position: number,
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): string {
  const config = getResolvedPositionDisplay(tankId, rackId, boxId, gridConfig, userSettings);

  // Config is guaranteed to be valid by schema validation and preference conversion
  return positionToLabel(position, gridConfig.rows, gridConfig.cols, config);
}

/**
 * Parse a display label to numeric position using box's configuration
 *
 * Automatically retrieves position display config from storage store.
 * 4-Tier Hierarchy: box override → user preference → lab default → system default
 *
 * @param label - Display label ("23" or "C5")
 * @param tankId - Tank identifier
 * @param rackId - Rack identifier
 * @param boxId - Box identifier
 * @param gridConfig - Grid configuration for dimensions
 * @param userSettings - Optional user settings for user preference tier
 * @returns 1-based position number
 * @throws Error if label is invalid
 *
 * @example
 * parsePositionLabelForBox('C5', 'tank-1', '1', 'A', { rows: 9, cols: 9 }) // 23
 */
export function parsePositionLabelForBox(
  label: string,
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): number {
  const config = getResolvedPositionDisplay(tankId, rackId, boxId, gridConfig, userSettings);
  return labelToPosition(label, gridConfig.rows, gridConfig.cols, config);
}

/**
 * Validate a position label for a specific box
 *
 * @param label - Display label to validate
 * @param tankId - Tank identifier
 * @param rackId - Rack identifier
 * @param boxId - Box identifier
 * @param gridConfig - Grid configuration for dimensions
 * @param userSettings - Optional user settings for user preference tier
 * @returns true if label is valid, false otherwise
 */
export function isValidLabelForBox(
  label: string,
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): boolean {
  const config = getResolvedPositionDisplay(tankId, rackId, boxId, gridConfig, userSettings);
  return isValidPositionLabel(label, gridConfig.rows, gridConfig.cols, config);
}

/**
 * Generate all position labels for a box using its configuration
 *
 * @param tankId - Tank identifier
 * @param rackId - Rack identifier
 * @param boxId - Box identifier
 * @param gridConfig - Grid configuration for dimensions
 * @param userSettings - Optional user settings for user preference tier
 * @returns Array of all valid position labels in order
 *
 * @example
 * // Box with numeric config
 * generateLabelsForBox('tank-1', '1', 'A', { rows: 3, cols: 3 })
 * // ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
 *
 * // Box with alphanumeric config
 * generateLabelsForBox('tank-1', '1', 'B', { rows: 3, cols: 3 })
 * // ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"]
 */
export function generateLabelsForBox(
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): string[] {
  const config = getResolvedPositionDisplay(tankId, rackId, boxId, gridConfig, userSettings);
  return generatePositionLabels(gridConfig.rows, gridConfig.cols, config);
}

/**
 * Get position display config for a box (with fallback hierarchy)
 *
 * 4-Tier Hierarchy: box override → user preference → lab default → system default
 *
 * @param tankId - Tank identifier
 * @param rackId - Rack identifier
 * @param boxId - Box identifier
 * @param gridConfig - Grid configuration for dimensions
 * @param userSettings - Optional user settings for user preference tier
 * @returns Position display configuration
 */
export function getPositionDisplayForBox(
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): PositionDisplayConfig {
  return getResolvedPositionDisplay(tankId, rackId, boxId, gridConfig, userSettings);
}

/**
 * Check if a box has a custom position display configuration
 *
 * @param tankId - Tank identifier
 * @param rackId - Rack identifier
 * @param boxId - Box identifier
 * @returns true if box has custom config, false if using default
 */
export function hasCustomPositionDisplay(
  tankId: string,
  rackId: string,
  boxId: string
): boolean {
  const positionDisplay = useStorageStore.getState().getBoxPositionDisplay(tankId, rackId, boxId);
  return positionDisplay !== undefined;
}

/**
 * Format position ranges for display with proper labels based on box configuration
 *
 * Combines position formatting (numeric vs alphanumeric) with smart range building.
 * Respects the 4-tier hierarchy: box override → user preference → lab default → system default
 *
 * @param positions - Array of 1-based position numbers
 * @param tankId - Tank identifier
 * @param rackId - Rack identifier
 * @param boxId - Box identifier
 * @param gridConfig - Grid configuration for dimensions
 * @param userSettings - Optional user settings for user preference tier
 * @returns Formatted ranges string (e.g., "A1-A3, C5-C7" or "1-3, 23-25")
 *
 * @example
 * // With alphanumeric format
 * formatPositionRangesForBox([1,2,3,23,24,25], 'T1', 'R1', 'A', grid, settings)
 * // "A1-A3, C5-C7"
 *
 * // With numeric format
 * formatPositionRangesForBox([1,2,3,23,24,25], 'T1', 'R1', 'A', grid, settings)
 * // "1-3, 23-25"
 */
export function formatPositionRangesForBox(
  positions: number[],
  tankId: string,
  rackId: string,
  boxId: string,
  gridConfig: GridConfiguration,
  userSettings?: UserSettings | null
): string {
  if (positions.length === 0) return '';
  if (positions.length === 1) {
    return formatPositionForBox(positions[0], tankId, rackId, boxId, gridConfig, userSettings);
  }

  // Remove duplicates and sort
  const sorted = [...new Set(positions)].sort((a, b) => a - b);

  // Build ranges using numeric positions first
  const ranges: { start: number; end: number }[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      // Consecutive - extend range
      rangeEnd = sorted[i];
    } else {
      // Gap - save current range and start new one
      ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }
  // Add final range
  ranges.push({ start: rangeStart, end: rangeEnd });

  // Convert ranges to labels using box-specific formatting
  const formattedRanges = ranges.map(({ start, end }) => {
    const startLabel = formatPositionForBox(start, tankId, rackId, boxId, gridConfig, userSettings);

    if (start === end) {
      return startLabel;
    }

    const endLabel = formatPositionForBox(end, tankId, rackId, boxId, gridConfig, userSettings);
    return `${startLabel}-${endLabel}`;
  });

  return formattedRanges.join(', ');
}
