import { describeName } from '../formulas/nameDisplay';
import {
  displayValue,
  formatRatio,
  PAIR_NOTATION,
  RATIO_NOTATION,
  readPair,
} from '../formulas/quantities';
import { amountUnit, readTypedAmount } from '../units/textAmounts';

import type { BoardCalculation } from '../formulas/boardCalculation';
import type { PlateLine, PlateSeries, VesselMapBlock } from '@odysseus/shared-schemas';

export type StepSeries = Extract<PlateSeries, { start: string }>;

export interface SeriesPoint {
  amount: string;
  unit: string;
}

const NUMBER_IN_TEXT = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/;
const NUMBERS_IN_TEXT = new RegExp(NUMBER_IN_TEXT, 'g');
const RATIO_IN_TEXT = /1\s*:\s*(\d+(?:\.\d+)?)/;

export function foldOf(text: string): number {
  const ratio = RATIO_IN_TEXT.exec(text);
  if (ratio) return parseFloat(ratio[1]);
  const number = NUMBER_IN_TEXT.exec(text);
  return number ? parseFloat(number[0]) : NaN;
}

function readPart(calculation: BoardCalculation, text: string) {
  const shown = describeName(calculation, text.trim());
  const isName = shown.kind === 'value' || shown.kind === 'formula';
  return { text: isName ? shown.text : text.trim(), isName };
}

export const readsSeriesAlike = (
  seriesList: readonly PlateSeries[],
  a: BoardCalculation,
  b: BoardCalculation
): boolean =>
  a === b ||
  seriesList.every(
    series =>
      'points' in series ||
      [series.start, series.fold].every(text => {
        const before = readPart(a, text);
        const after = readPart(b, text);
        return before.text === after.text && before.isName === after.isName;
      })
  );

const DIRECTION_ARROWS: Readonly<Record<PlateSeries['direction'], string>> = {
  right: '→',
  down: '↓',
  left: '←',
  up: '↑',
};

const shortNumber = (value: number) => String(Number(value.toPrecision(3)));

export function seriesPoint(
  series: PlateSeries,
  step: number,
  calculation: BoardCalculation
): SeriesPoint {
  if ('points' in series) return { amount: series.points[step] ?? '', unit: '' };
  const start = readPart(calculation, series.start);
  const fold = foldOf(readPart(calculation, series.fold).text);
  if (series.unit === PAIR_NOTATION) {
    const ratio = readPair(start.text);
    return ratio && fold > 0
      ? { amount: formatRatio(ratio / fold ** step), unit: series.unit }
      : { amount: start.text, unit: series.unit };
  }
  const isRatio = series.unit === RATIO_NOTATION;
  const unit = start.isName && !isRatio ? '' : series.unit;
  const numbers = [...start.text.matchAll(NUMBERS_IN_TEXT)];
  const match = isRatio ? numbers.at(-1) : numbers[0];
  if (match?.index === undefined || !(fold > 0)) return { amount: start.text, unit };
  const first = parseFloat(match[0]);
  if (isRatio) return { amount: shortNumber(first * fold ** step), unit };
  const amount =
    start.text.slice(0, match.index) +
    shortNumber(first / fold ** step) +
    start.text.slice(match.index + match[0].length);
  return { amount, unit };
}

export function wellAmount(
  block: VesselMapBlock,
  key: string,
  line: PlateLine,
  calculation: BoardCalculation
): SeriesPoint | undefined {
  const cell = block.cells[key]?.[line.id];
  if (!cell) return undefined;
  const series = cell.seriesId === undefined ? undefined : block.series[cell.seriesId];
  return series
    ? seriesPoint(series, cell.seriesStep ?? 0, calculation)
    : { amount: cell.amount?.trim() ?? '', unit: cell.unit ?? '' };
}

export function seriesSummary(series: PlateSeries, calculation: BoardCalculation): string {
  const arrow = DIRECTION_ARROWS[series.direction];
  if ('points' in series) return [series.points.join(', '), arrow].filter(Boolean).join(' ');
  const start = seriesPoint(series, 0, calculation);
  const fold = readPart(calculation, series.fold).text;
  if (series.unit === PAIR_NOTATION) {
    return [start.amount, fold && `÷${foldOf(fold) || fold}`, arrow].filter(Boolean).join(' ');
  }
  return [
    start.amount && displayValue(start.amount, start.unit),
    fold && `1:${foldOf(fold) || fold}`,
    arrow,
  ]
    .filter(Boolean)
    .join(', ');
}

export const seriesFold = (series: StepSeries, calculation: BoardCalculation) =>
  foldOf(readPart(calculation, series.fold).text);

const AMOUNT_WITH_UNIT = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\s*(.*)$/;

export const stepSeriesUnit = (series: StepSeries): string =>
  series.unit || (readTypedAmount(series.start)?.unit ?? '');

export function seriesTop(
  series: StepSeries,
  calculation: BoardCalculation
): { value: number; unit: string } | undefined {
  const { amount, unit } = seriesPoint(series, 0, calculation);
  const match = AMOUNT_WITH_UNIT.exec(amount);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return undefined;
  const typedUnit = match[2].trim();
  return { value, unit: unit || (amountUnit(typedUnit, value) ?? typedUnit) };
}
