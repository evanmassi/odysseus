import { isFilledEntry, type SampleEntry, type PlateMapBlock } from '@odysseus/shared-schemas';

import type { PlateMapSheet } from './plateMapTabs';

export interface GridPoint {
  row: number;
  col: number;
}

export interface CopiedWell {
  rowOffset: number;
  colOffset: number;
  lines: Record<string, SampleEntry>;
  stainId: string | undefined;
}

const between = (value: number, a: number, b: number) =>
  value >= Math.min(a, b) && value <= Math.max(a, b);

export const keysInRect = (sheet: PlateMapSheet, from: GridPoint, to: GridPoint): string[] =>
  sheet.positions
    .filter(
      position => between(position.row, from.row, to.row) && between(position.col, from.col, to.col)
    )
    .map(position => position.key);

export const movedPoint = (
  sheet: PlateMapSheet,
  from: GridPoint,
  rowStep: number,
  colStep: number
): GridPoint => ({
  row: Math.max(0, Math.min(sheet.rows - 1, from.row + rowStep)),
  col: Math.max(0, Math.min(sheet.cols - 1, from.col + colStep)),
});

export function selectionName(sheet: PlateMapSheet, keys: ReadonlySet<string>): string {
  const positions = sheet.positions.filter(position => keys.has(position.key));
  if (!sheet.isPlate || !positions.length) return '';
  const rows = positions.map(position => position.row);
  const cols = positions.map(position => position.col);
  const top = Math.min(...rows);
  const left = Math.min(...cols);
  const bottom = Math.max(...rows);
  const right = Math.max(...cols);
  const labelAt = (row: number, col: number) =>
    sheet.positions.find(position => position.row === row && position.col === col)?.label ?? '';
  if (positions.length === 1) return labelAt(top, left);
  const isRectangle = (bottom - top + 1) * (right - left + 1) === positions.length;
  return isRectangle ? `${labelAt(top, left)}–${labelAt(bottom, right)}` : '';
}

export const isWellFilled = (block: PlateMapBlock, key: string) =>
  Object.values(block.cells[key] ?? {}).some(isFilledEntry);

function cornerOf(sheet: PlateMapSheet, keys: ReadonlySet<string>): GridPoint {
  const positions = sheet.positions.filter(position => keys.has(position.key));
  return {
    row: Math.min(...positions.map(position => position.row)),
    col: Math.min(...positions.map(position => position.col)),
  };
}

export function copyWells(
  block: PlateMapBlock,
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>
): CopiedWell[] {
  const corner = cornerOf(sheet, keys);
  return sheet.positions
    .filter(position => keys.has(position.key))
    .map(position => ({
      rowOffset: position.row - corner.row,
      colOffset: position.col - corner.col,
      lines: structuredClone(block.cells[position.key] ?? {}),
      stainId: block.stain[position.key],
    }));
}

export function pasteTargets(
  sheet: PlateMapSheet,
  copied: readonly CopiedWell[],
  keys: ReadonlySet<string>
): Array<{ key: string; lines: Record<string, SampleEntry>; stainId: string | undefined }> {
  const corner = cornerOf(sheet, keys);
  return copied.flatMap(({ rowOffset, colOffset, lines, stainId }) => {
    const target = sheet.positions.find(
      position => position.row === corner.row + rowOffset && position.col === corner.col + colOffset
    );
    return target ? [{ key: target.key, lines, stainId }] : [];
  });
}

export function shiftedTargets(
  sheet: PlateMapSheet,
  fromKeys: ReadonlySet<string>,
  toKeys: ReadonlySet<string>
): string[] | undefined {
  const from = cornerOf(sheet, fromKeys);
  const to = cornerOf(sheet, toKeys);
  const landing = sheet.positions
    .filter(position => fromKeys.has(position.key))
    .map(
      position =>
        sheet.positions.find(
          candidate =>
            candidate.row === to.row + position.row - from.row &&
            candidate.col === to.col + position.col - from.col
        )?.key
    );
  return landing.every((key): key is string => key !== undefined) ? landing : undefined;
}
