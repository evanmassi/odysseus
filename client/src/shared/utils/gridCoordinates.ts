/**
 * Grid Coordinate Utilities
 *
 * Position-to-coordinate conversions for the tube grid layout.
 */

import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';

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

export function positionToCoordinates(position: number, gridSize: number = 9): GridCoordinates {
  const zeroBasedPosition = position - 1;
  return {
    row: Math.floor(zeroBasedPosition / gridSize),
    col: zeroBasedPosition % gridSize,
  };
}

export function coordinatesToPosition(row: number, col: number, gridSize: number = 9): number {
  return row * gridSize + col + 1;
}

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

export function isValidPosition(
  position: number,
  maxPositions: number = EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX
): boolean {
  return position >= 1 && position <= maxPositions && Number.isInteger(position);
}

export function getSelectionRange(startPos: number, endPos: number): number[] {
  const min = Math.min(startPos, endPos);
  const max = Math.max(startPos, endPos);
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}
