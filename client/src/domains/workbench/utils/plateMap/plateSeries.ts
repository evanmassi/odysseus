import { describeName } from '../formulas/nameDisplay';
import {
  displayValue,
  formatRatio,
  PAIR_NOTATION,
  RATIO_NOTATION,
  readPair,
} from '../formulas/quantities';
import { amountUnit, readTypedAmount } from '../units/textAmounts';

import type { SolvedBoard } from '../formulas/boardCalculation';
import type { PlateLine, PlateSeries, PlateMapBlock } from '@odysseus/shared-schemas';

export type StepSeries = Extract<PlateSeries, { start: string }>;

export interface PointAmount {
  amount: string;
  unit: string;
}

const NUMBER_IN_TEXT = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/;
const NUMBERS_IN_TEXT = new RegExp(NUMBER_IN_TEXT, 'g');
const RATIO_IN_TEXT = /1\s*:\s*(\d+(?:\.\d+)?)/;

export function dilutionFactorOf(text: string): number {
  const ratio = RATIO_IN_TEXT.exec(text);
  if (ratio) return parseFloat(ratio[1]);
  const number = NUMBER_IN_TEXT.exec(text);
  return number ? parseFloat(number[0]) : NaN;
}

function readPart(board: SolvedBoard, text: string) {
  const shown = describeName(board, text.trim());
  const isName = shown.kind === 'value' || shown.kind === 'formula';
  return { text: isName ? shown.text : text.trim(), isName };
}

export const readsSeriesAlike = (
  seriesList: readonly PlateSeries[],
  a: SolvedBoard,
  b: SolvedBoard
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

export function pointAmount(series: PlateSeries, point: number, board: SolvedBoard): PointAmount {
  if ('points' in series) return { amount: series.points[point] ?? '', unit: '' };
  const top = readPart(board, series.start);
  const dilutionFactor = dilutionFactorOf(readPart(board, series.fold).text);
  if (series.unit === PAIR_NOTATION) {
    const ratio = readPair(top.text);
    return ratio && dilutionFactor > 0
      ? { amount: formatRatio(ratio / dilutionFactor ** point), unit: series.unit }
      : { amount: top.text, unit: series.unit };
  }
  const isRatio = series.unit === RATIO_NOTATION;
  const unit = top.isName && !isRatio ? '' : series.unit;
  const numbers = [...top.text.matchAll(NUMBERS_IN_TEXT)];
  const match = isRatio ? numbers.at(-1) : numbers[0];
  if (match?.index === undefined || !(dilutionFactor > 0)) return { amount: top.text, unit };
  const first = parseFloat(match[0]);
  if (isRatio) return { amount: shortNumber(first * dilutionFactor ** point), unit };
  const amount =
    top.text.slice(0, match.index) +
    shortNumber(first / dilutionFactor ** point) +
    top.text.slice(match.index + match[0].length);
  return { amount, unit };
}

export function wellAmount(
  block: PlateMapBlock,
  key: string,
  line: PlateLine,
  board: SolvedBoard
): PointAmount | undefined {
  const entry = block.cells[key]?.[line.id];
  if (!entry) return undefined;
  const series = entry.seriesId === undefined ? undefined : block.series[entry.seriesId];
  return series
    ? pointAmount(series, entry.seriesStep ?? 0, board)
    : { amount: entry.amount?.trim() ?? '', unit: entry.unit ?? '' };
}

export function seriesSummary(series: PlateSeries, board: SolvedBoard): string {
  const arrow = DIRECTION_ARROWS[series.direction];
  if ('points' in series) return [series.points.join(', '), arrow].filter(Boolean).join(' ');
  const top = pointAmount(series, 0, board);
  const dilutionFactor = readPart(board, series.fold).text;
  if (series.unit === PAIR_NOTATION) {
    return [
      top.amount,
      dilutionFactor && `÷${dilutionFactorOf(dilutionFactor) || dilutionFactor}`,
      arrow,
    ]
      .filter(Boolean)
      .join(' ');
  }
  return [
    top.amount && displayValue(top.amount, top.unit),
    dilutionFactor && `1:${dilutionFactorOf(dilutionFactor) || dilutionFactor}`,
    arrow,
  ]
    .filter(Boolean)
    .join(', ');
}

export const seriesDilutionFactor = (series: StepSeries, board: SolvedBoard) =>
  dilutionFactorOf(readPart(board, series.fold).text);

const AMOUNT_WITH_UNIT = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\s*(.*)$/;

export const stepSeriesUnit = (series: StepSeries): string =>
  series.unit || (readTypedAmount(series.start)?.unit ?? '');

export function seriesTop(
  series: StepSeries,
  board: SolvedBoard
): { value: number; unit: string } | undefined {
  const { amount, unit } = pointAmount(series, 0, board);
  const match = AMOUNT_WITH_UNIT.exec(amount);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return undefined;
  const typedUnit = match[2].trim();
  return { value, unit: unit || (amountUnit(typedUnit, value) ?? typedUnit) };
}
