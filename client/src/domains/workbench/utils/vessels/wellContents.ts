import {
  isFilledCell,
  lineValueOf,
  type PlateLine,
  type VesselMapBlock,
} from '@odysseus/shared-schemas';

import { displayValue, readableAmount } from '../formulas/quantities';

import { seriesPoint } from './plateSeries';

import type { BoardCalculation } from '../formulas/boardCalculation';

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
  block: VesselMapBlock,
  key: string,
  line: PlateLine,
  calculation: BoardCalculation
): WellLine | undefined {
  const cell = block.cells[key]?.[line.id];
  if (!isFilledCell(cell)) return undefined;
  const series = cell.seriesId === undefined ? undefined : block.series[cell.seriesId];
  const { amount, unit } = series
    ? seriesPoint(series, cell.seriesStep ?? 0, calculation)
    : { amount: cell.amount?.trim() ?? '', unit: cell.unit ?? '' };
  return {
    label: lineValueOf(line, cell)?.text.trim() ?? '',
    amount: amount ? displayValue(amount, unit) : '',
    readable: amount ? readableAmount(amount, unit) : '',
  };
}

export const wellLineText = ({ label, readable }: WellLine) =>
  [label, readable].filter(Boolean).join(' · ');

export const wellDetails = (block: VesselMapBlock, key: string, calculation: BoardCalculation) =>
  block.lines.flatMap(line => {
    const shown = wellLine(block, key, line, calculation);
    const text = shown && wellLineText(shown);
    return text ? [text] : [];
  });

export function wellColor(
  block: VesselMapBlock,
  key: string,
  colorLine: PlateLine | undefined
): WellColor | undefined {
  const cell = colorLine && block.cells[key]?.[colorLine.id];
  const color = colorLine && lineValueOf(colorLine, cell)?.color;
  if (!colorLine || !cell || !color) return undefined;
  if (cell.seriesId === undefined) return { color, tint: PLAIN_TINT };
  const lastStep = Math.max(
    ...Object.values(block.cells)
      .map(lines => lines[colorLine.id])
      .filter(other => other?.seriesId === cell.seriesId)
      .map(other => other.seriesStep ?? 0)
  );
  if (lastStep <= 0) return { color, tint: PLAIN_TINT };
  return {
    color,
    tint: Math.round(STRONGEST_TINT - ((cell.seriesStep ?? 0) / lastStep) * TINT_FADE),
  };
}
