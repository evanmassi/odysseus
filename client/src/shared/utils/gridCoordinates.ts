/**
 * Grid Coordinate Utilities
 *
 * Conversions between box positions and row/column coordinates, plus
 * selection-range helpers for the tube grid.
 */

export interface GridCoordinates {
  row: number;
  col: number;
}

export function positionToCoordinates(position: number, gridCols: number): GridCoordinates {
  const zeroBasedPosition = position - 1;
  return {
    row: Math.floor(zeroBasedPosition / gridCols),
    col: zeroBasedPosition % gridCols,
  };
}

export function coordinatesToPosition(row: number, col: number, gridCols: number): number {
  return row * gridCols + col + 1;
}

export function getPositionsInRectangle(
  start: GridCoordinates,
  end: GridCoordinates,
  gridCols: number
): number[] {
  const positions: number[] = [];

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      positions.push(coordinatesToPosition(row, col, gridCols));
    }
  }

  return positions;
}

export function getSelectionRange(startPos: number, endPos: number): number[] {
  const min = Math.min(startPos, endPos);
  const max = Math.max(startPos, endPos);
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}
