/**
 * Grid coordinate utilities
 */
import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';

/**
 * Get all positions within a rectangular selection
 */
export function getPositionsInRectangle(
  start: GridCoordinates,
  end: GridCoordinates,
  gridCols: number = 9
): number[] {
  const positions: number[] = [];

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const position = row * gridCols + col + 1;
      positions.push(position);
    }
  }

  return positions;
}

export interface GridCoordinates {
  row: number;
  col: number;
}

export interface PositionInfo {
  position: number;
  row: number;
  col: number;
  x: number;
  y: number;
}

/**
 * Convert 1-based position to grid coordinates
 * @param position 1-based position (1-81 for 9x9 grid)
 * @param gridSize Number of columns (default 9)
 * @returns Grid coordinates (0-based)
 */
export function positionToCoordinates(position: number, gridSize: number = 9): GridCoordinates {
  const zeroBasedPosition = position - 1;
  return {
    row: Math.floor(zeroBasedPosition / gridSize),
    col: zeroBasedPosition % gridSize,
  };
}

/**
 * Convert grid coordinates to 1-based position
 * @param row 0-based row
 * @param col 0-based column
 * @param gridSize Number of columns (default 9)
 * @returns 1-based position
 */
export function coordinatesToPosition(row: number, col: number, gridSize: number = 9): number {
  return row * gridSize + col + 1;
}

/**
 * Get pixel coordinates for grid position
 * @param position 1-based position
 * @param cellSize Size of each cell in pixels
 * @param gridSize Number of columns (default 9)
 * @returns Pixel coordinates
 */
export function getPixelCoordinates(
  position: number,
  cellSize: number,
  gridSize: number = 9
): { x: number; y: number } {
  const coords = positionToCoordinates(position, gridSize);
  return {
    x: coords.col * cellSize,
    y: coords.row * cellSize,
  };
}

/**
 * Check if position is valid for grid
 * @param position 1-based position
 * @param maxPositions Maximum positions (defaults to standard equipment configuration)
 * @returns Whether position is valid
 */
export function isValidPosition(
  position: number,
  maxPositions: number = EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX
): boolean {
  return position >= 1 && position <= maxPositions && Number.isInteger(position);
}

/**
 * Get all positions in a sequential range between two positions
 * @param startPos Start position (1-based)
 * @param endPos End position (1-based)
 * @returns Array of selected positions
 */
export function getSelectionRange(startPos: number, endPos: number): number[] {
  const min = Math.min(startPos, endPos);
  const max = Math.max(startPos, endPos);
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}
