/**
 * Position Formatting Utilities
 *
 * Converts between integer database positions and configurable display labels for box grids.
 */

import type { PositionDisplayConfig, AlphanumericConfig } from './positionSchemas';

/**
 * @returns Formatted label ("23" or "C5" depending on config)
 * @throws Error if position is out of bounds or config is invalid
 *
 * @example
 * // Numeric format
 * positionToLabel(23, 9, 9, { format: 'numeric' }) // "23"
 *
 * // Alphanumeric format (9x9 grid)
 * positionToLabel(23, 9, 9, ALPHANUMERIC_STANDARD) // "C5"
 */
export function positionToLabel(
  position: number,
  gridRows: number,
  gridCols: number,
  config: PositionDisplayConfig
): string {
  if (config.format === 'numeric') {
    return position.toString();
  }

  if (!config.alphanumericConfig) {
    throw new Error('Alphanumeric config required for alphanumeric format');
  }

  const { rowLabels, colLabels, format } = config.alphanumericConfig;

  if (rowLabels.length !== gridRows) {
    throw new Error(`Row labels (${rowLabels.length}) must match grid rows (${gridRows})`);
  }
  if (colLabels.length !== gridCols) {
    throw new Error(`Column labels (${colLabels.length}) must match grid cols (${gridCols})`);
  }

  // Convert 1-based position to 0-based row/col
  const index = position - 1;
  const row = Math.floor(index / gridCols);
  const col = index % gridCols;

  if (row >= gridRows || col >= gridCols || row < 0 || col < 0) {
    throw new Error(`Position ${position} out of bounds for ${gridRows}x${gridCols} grid`);
  }

  const rowLabel = rowLabels[row];
  const colLabel = colLabels[col];

  return format === 'row-col' ? `${rowLabel}${colLabel}` : `${colLabel}${rowLabel}`;
}

/**
 * @returns 1-based position number
 * @throws Error if label is invalid or out of bounds
 *
 * @example
 * // Numeric format
 * labelToPosition('23', 9, 9, { format: 'numeric' }) // 23
 *
 * // Alphanumeric format (9x9 grid)
 * labelToPosition('C5', 9, 9, ALPHANUMERIC_STANDARD) // 23
 */
export function labelToPosition(
  label: string,
  gridRows: number,
  gridCols: number,
  config: PositionDisplayConfig
): number {
  if (config.format === 'numeric') {
    const position = parseInt(label, 10);
    if (isNaN(position) || position < 1 || position > gridRows * gridCols) {
      throw new Error(`Invalid numeric position: ${label}`);
    }
    return position;
  }

  if (!config.alphanumericConfig) {
    throw new Error('Alphanumeric config required for alphanumeric format');
  }

  const { rowLabels, colLabels, format } = config.alphanumericConfig;

  let rowLabel: string;
  let colLabel: string;

  if (format === 'row-col') {
    // A5 format: letter first, then number
    const match = label.match(/^([A-Za-z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid alphanumeric label (expected format like A5): ${label}`);
    }
    rowLabel = match[1].toUpperCase();
    colLabel = match[2];
  } else {
    // 5A format: number first, then letter
    const match = label.match(/^(\d+)([A-Za-z]+)$/);
    if (!match) {
      throw new Error(`Invalid alphanumeric label (expected format like 5A): ${label}`);
    }
    colLabel = match[1];
    rowLabel = match[2].toUpperCase();
  }

  const rowIndex = rowLabels.findIndex(l => l.toUpperCase() === rowLabel);
  const colIndex = colLabels.findIndex(l => l === colLabel);

  if (rowIndex === -1) {
    throw new Error(`Invalid row label: ${rowLabel}`);
  }
  if (colIndex === -1) {
    throw new Error(`Invalid column label: ${colLabel}`);
  }

  // Convert 0-based row/col to 1-based position
  return rowIndex * gridCols + colIndex + 1;
}

export function isValidPositionLabel(
  label: string,
  gridRows: number,
  gridCols: number,
  config: PositionDisplayConfig
): boolean {
  try {
    labelToPosition(label, gridRows, gridCols, config);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates all position labels for a grid in row-major order.
 *
 * @example
 * // Numeric 3x3
 * generatePositionLabels(3, 3, { format: 'numeric' })
 * // ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
 *
 * // Alphanumeric 3x3
 * generatePositionLabels(3, 3, ALPHANUMERIC_STANDARD)
 * // ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"]
 */
export function generatePositionLabels(
  gridRows: number,
  gridCols: number,
  config: PositionDisplayConfig
): string[] {
  const totalPositions = gridRows * gridCols;
  const labels: string[] = [];

  for (let position = 1; position <= totalPositions; position++) {
    labels.push(positionToLabel(position, gridRows, gridCols, config));
  }

  return labels;
}
