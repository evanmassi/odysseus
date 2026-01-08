/**
 * Grid System Types
 * Grid layout and positioning system
 */

export interface GridPosition {
  row: number;
  column: number;
  position: number; // Sequential position (1-based)
  isValid: boolean;
  isOccupied: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
}

export interface GridPixelCoordinates {
  x: number;
  y: number;
}

export interface GridDimensions {
  width: number;
  height: number;
  cellSize: number;
  gap: number;
}

export interface GridLayout {
  id: string;
  rows: number;
  columns: number;
  totalPositions: number;
  positions: GridPosition[];
  dimensions: GridDimensions;
  displaySettings: GridDisplaySettings;
}

export interface GridDisplaySettings {
  showGrid: boolean;
  showLabels: boolean;
  showRowNumbers: boolean;
  showColumnLetters: boolean;
  cellBorderWidth: number;
  cellBorderColor: string;
  highlightColor: string;
  selectionColor: string;
  occupiedColor: string;
  emptyColor: string;
}

export interface GridRenderingOptions {
  responsive: boolean;
  autoScale: boolean;
  minCellSize: number;
  maxCellSize: number;
  aspectRatio: number;
}

// Grid calculation utilities
export const calculateGridPosition = (
  index: number,
  columns: number
): { row: number; column: number } => ({
  row: Math.floor(index / columns) + 1,
  column: (index % columns) + 1,
});

export const calculateGridIndex = (row: number, column: number, columns: number): number =>
  (row - 1) * columns + (column - 1);

export const createGridLayout = (
  id: string,
  rows: number,
  columns: number,
  displaySettings?: Partial<GridDisplaySettings>
): GridLayout => {
  const totalPositions = rows * columns;
  const positions: GridPosition[] = Array.from({ length: totalPositions }, (_, i) => {
    const { row, column } = calculateGridPosition(i, columns);
    return {
      row,
      column,
      position: i + 1,
      isValid: true,
      isOccupied: false,
      isSelected: false,
      isHighlighted: false,
    };
  });

  const defaultDisplaySettings: GridDisplaySettings = {
    showGrid: true,
    showLabels: true,
    showRowNumbers: true,
    showColumnLetters: true,
    cellBorderWidth: 1,
    cellBorderColor: '#e2e8f0',
    highlightColor: '#3b82f6',
    selectionColor: '#1d4ed8',
    occupiedColor: '#10b981',
    emptyColor: '#f8fafc',
    ...displaySettings,
  };

  return {
    id,
    rows,
    columns,
    totalPositions,
    positions,
    dimensions: {
      width: 0, // Will be calculated during rendering
      height: 0,
      cellSize: 0,
      gap: 2,
    },
    displaySettings: defaultDisplaySettings,
  };
};

// Grid validation utilities
export const isValidGridPosition = (
  row: number,
  column: number,
  maxRows: number,
  maxColumns: number
): boolean => {
  return row >= 1 && row <= maxRows && column >= 1 && column <= maxColumns;
};

export const isValidGridSize = (rows: number, columns: number): boolean => {
  return rows >= 1 && rows <= 20 && columns >= 1 && columns <= 20;
};

// Grid layout algorithms
export class GridLayoutEngine {
  static calculateOptimalCellSize(
    containerWidth: number,
    containerHeight: number,
    rows: number,
    columns: number,
    gap: number = 2
  ): number {
    const availableWidth = containerWidth - gap * (columns - 1);
    const availableHeight = containerHeight - gap * (rows - 1);

    const cellWidthFromContainer = availableWidth / columns;
    const cellHeightFromContainer = availableHeight / rows;

    // Use the smaller dimension to maintain square cells
    return Math.min(cellWidthFromContainer, cellHeightFromContainer);
  }

  static calculateGridDimensions(
    rows: number,
    columns: number,
    cellSize: number,
    gap: number = 2
  ): GridDimensions {
    const width = columns * cellSize + (columns - 1) * gap;
    const height = rows * cellSize + (rows - 1) * gap;

    return {
      width,
      height,
      cellSize,
      gap,
    };
  }

  static generatePositionLabels(
    rows: number,
    columns: number,
    labelStyle: 'numeric' | 'alpha' | 'mixed' = 'mixed'
  ): string[] {
    const labels: string[] = [];

    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= columns; col++) {
        switch (labelStyle) {
          case 'numeric':
            labels.push(`${row}-${col}`);
            break;
          case 'alpha':
            labels.push(`${String.fromCharCode(64 + row)}${col}`);
            break;
          case 'mixed':
          default:
            labels.push(`${String.fromCharCode(64 + row)}${col}`);
            break;
        }
      }
    }

    return labels;
  }
}
