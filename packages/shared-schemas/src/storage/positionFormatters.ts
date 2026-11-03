import type { PositionDisplayConfig } from './positionSchemas';

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
