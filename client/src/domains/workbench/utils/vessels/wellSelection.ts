import { isFilledCell, type CellLine, type VesselMapBlock } from '@odysseus/shared-schemas';

import type { VesselSheet } from './vesselTabs';

export interface GridPoint {
  row: number;
  col: number;
}

export interface CopiedWell {
  rowOffset: number;
  colOffset: number;
  lines: Record<string, CellLine>;
}

const between = (value: number, a: number, b: number) =>
  value >= Math.min(a, b) && value <= Math.max(a, b);

export const keysInRect = (sheet: VesselSheet, from: GridPoint, to: GridPoint): string[] =>
  sheet.spots
    .filter(spot => between(spot.row, from.row, to.row) && between(spot.col, from.col, to.col))
    .map(spot => spot.key);

export const movedPoint = (
  sheet: VesselSheet,
  from: GridPoint,
  rowStep: number,
  colStep: number
): GridPoint => ({
  row: Math.max(0, Math.min(sheet.rows - 1, from.row + rowStep)),
  col: Math.max(0, Math.min(sheet.cols - 1, from.col + colStep)),
});

export function selectionName(sheet: VesselSheet, keys: ReadonlySet<string>): string {
  const spots = sheet.spots.filter(spot => keys.has(spot.key));
  if (!sheet.isPlate || !spots.length) return '';
  const rows = spots.map(spot => spot.row);
  const cols = spots.map(spot => spot.col);
  const top = Math.min(...rows);
  const left = Math.min(...cols);
  const bottom = Math.max(...rows);
  const right = Math.max(...cols);
  const labelAt = (row: number, col: number) =>
    sheet.spots.find(spot => spot.row === row && spot.col === col)?.label ?? '';
  if (spots.length === 1) return labelAt(top, left);
  const isRectangle = (bottom - top + 1) * (right - left + 1) === spots.length;
  return isRectangle ? `${labelAt(top, left)}–${labelAt(bottom, right)}` : '';
}

export const isWellFilled = (block: VesselMapBlock, key: string) =>
  Object.values(block.cells[key] ?? {}).some(isFilledCell);

function cornerOf(sheet: VesselSheet, keys: ReadonlySet<string>): GridPoint {
  const spots = sheet.spots.filter(spot => keys.has(spot.key));
  return {
    row: Math.min(...spots.map(spot => spot.row)),
    col: Math.min(...spots.map(spot => spot.col)),
  };
}

export function copyWells(
  block: VesselMapBlock,
  sheet: VesselSheet,
  keys: ReadonlySet<string>
): CopiedWell[] {
  const corner = cornerOf(sheet, keys);
  return sheet.spots
    .filter(spot => keys.has(spot.key))
    .map(spot => ({
      rowOffset: spot.row - corner.row,
      colOffset: spot.col - corner.col,
      lines: structuredClone(block.cells[spot.key] ?? {}),
    }));
}

export function pasteTargets(
  sheet: VesselSheet,
  copied: readonly CopiedWell[],
  keys: ReadonlySet<string>
): Array<{ key: string; lines: Record<string, CellLine> }> {
  const corner = cornerOf(sheet, keys);
  return copied.flatMap(({ rowOffset, colOffset, lines }) => {
    const target = sheet.spots.find(
      spot => spot.row === corner.row + rowOffset && spot.col === corner.col + colOffset
    );
    return target ? [{ key: target.key, lines }] : [];
  });
}
