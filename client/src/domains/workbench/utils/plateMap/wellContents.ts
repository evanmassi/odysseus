import {
  isFilledEntry,
  lineValueOf,
  type PlateLine,
  type PlateMapBlock,
} from '@odysseus/shared-schemas';

import { displayValue, readableAmount } from '../formulas/quantities';

import { wellAmount } from './plateSeries';

import type { SolvedBoard } from '../formulas/boardCalculation';

export interface WellLine {
  label: string;
  amount: string;
  readable: string;
}

export interface WellColor {
  color: string;
  tint: number;
}

const PLAIN_TINT = 34;
const STRONGEST_TINT = 58;
const TINT_FADE = 46;

export function wellLine(
  block: PlateMapBlock,
  key: string,
  line: PlateLine,
  board: SolvedBoard
): WellLine | undefined {
  const entry = block.cells[key]?.[line.id];
  const point = wellAmount(block, key, line, board);
  if (!isFilledEntry(entry) || !point) return undefined;
  const { amount, unit } = point;
  return {
    label: lineValueOf(line, entry)?.text.trim() ?? '',
    amount: amount ? displayValue(amount, unit) : '',
    readable: amount ? readableAmount(amount, unit) : '',
  };
}

export const wellLineText = ({ label, readable }: WellLine) =>
  [label, readable].filter(Boolean).join(' · ');

export const wellDetails = (block: PlateMapBlock, key: string, board: SolvedBoard) =>
  block.lines.flatMap(line => {
    const shown = wellLine(block, key, line, board);
    const text = shown && wellLineText(shown);
    return text ? [text] : [];
  });

export function seriesProgress(
  block: PlateMapBlock,
  key: string,
  line: PlateLine
): number | undefined {
  const entry = block.cells[key]?.[line.id];
  if (entry?.seriesId === undefined) return undefined;
  const lastStep = Math.max(
    ...Object.values(block.cells)
      .map(lines => lines[line.id])
      .filter(other => other?.seriesId === entry.seriesId)
      .map(other => other.seriesStep ?? 0)
  );
  return lastStep > 0 ? (entry.seriesStep ?? 0) / lastStep : undefined;
}

export function wellColor(
  block: PlateMapBlock,
  key: string,
  colorLine: PlateLine | undefined
): WellColor | undefined {
  const entry = colorLine && block.cells[key]?.[colorLine.id];
  const color = colorLine && lineValueOf(colorLine, entry)?.color;
  if (!colorLine || !entry || !color) return undefined;
  const progress = seriesProgress(block, key, colorLine);
  return {
    color,
    tint: progress === undefined ? PLAIN_TINT : Math.round(STRONGEST_TINT - progress * TINT_FADE),
  };
}
