import { describeName } from '../formulas/nameDisplay';
import { displayValue, RATIO_NOTATION } from '../formulas/quantities';

import type { BoardCalculation } from '../formulas/boardCalculation';
import type { PlateSeries } from '@odysseus/shared-schemas';

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

export function seriesSummary(series: PlateSeries, calculation: BoardCalculation): string {
  const arrow = DIRECTION_ARROWS[series.direction];
  if ('points' in series) return [series.points.join(', '), arrow].filter(Boolean).join(' ');
  const start = seriesPoint(series, 0, calculation);
  const fold = readPart(calculation, series.fold).text;
  return [
    start.amount && displayValue(start.amount, start.unit),
    fold && `1:${foldOf(fold) || fold}`,
    arrow,
  ]
    .filter(Boolean)
    .join(', ');
}
