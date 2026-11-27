import { readReference } from '../formulas/nameReferences';
import { DILUTION_FACTOR_NOTATION, readNumber } from '../formulas/quantities';
import { seriesTopTerm } from '../plateMap/plateMapNames';
import { dilutionFactorOf, stepSeriesUnit } from '../plateMap/plateSeries';
import {
  DILUTION_FACTOR,
  POINTS,
  REPLICATES,
  TOP_CONCENTRATION,
  type Term,
} from '../terms/termList';
import { readTypedAmount } from '../units/textAmounts';
import { lowerLead } from '../values/valueNames';

import type { DilutionRun } from './dilutionRuns';

export type SeriesField = 'top' | 'dilutionFactor' | 'points' | 'replicates';

export type CountField = Extract<SeriesField, 'points' | 'replicates'>;

export interface SeriesNumber {
  field: SeriesField;
  id: string;
  term: Term;
  name: string;
  value: string;
  unit: string;
  counted: number | undefined;
}

const STARTS_WITH_NUMBER = /^\s*[-+]?\.?\d/;

export const seriesNumberId = (run: DilutionRun, field: SeriesField): string =>
  `series:${run.key}:${field}`;

export function plateCounts(run: DilutionRun): Record<CountField, number | undefined> {
  if (!run.replicatesByPoint.size) return { points: undefined, replicates: undefined };
  return {
    points: Math.max(...run.replicatesByPoint.keys()) + 1,
    replicates: Math.max(...run.replicatesByPoint.values()),
  };
}

const typedCount = (text: string | undefined): number | undefined => {
  const count = text === undefined ? undefined : readNumber(text);
  return count !== undefined && count > 0 ? count : undefined;
};

export function runCounts(run: DilutionRun): Record<CountField, number | undefined> {
  const counted = plateCounts(run);
  return {
    points: typedCount(run.series.points) ?? counted.points,
    replicates: typedCount(run.series.replicates) ?? counted.replicates,
  };
}

export function seriesNumbers(run: DilutionRun, tag: string): SeriesNumber[] {
  const { series, subject } = run;
  const named = (term: Term) => `${subject} ${lowerLead(term.word)}${tag}`;
  const numbers: SeriesNumber[] = [];
  if (STARTS_WITH_NUMBER.test(series.top)) {
    const term = seriesTopTerm(series.unit, stepSeriesUnit(series));
    numbers.push({
      field: 'top',
      id: seriesNumberId(run, 'top'),
      term,
      name: named(term),
      value: readTypedAmount(series.top)?.value ?? series.top.trim(),
      unit: stepSeriesUnit(series),
      counted: undefined,
    });
  }
  if (STARTS_WITH_NUMBER.test(series.dilutionFactor)) {
    numbers.push({
      field: 'dilutionFactor',
      id: seriesNumberId(run, 'dilutionFactor'),
      term: DILUTION_FACTOR,
      name: named(DILUTION_FACTOR),
      value: String(dilutionFactorOf(series.dilutionFactor)),
      unit: DILUTION_FACTOR_NOTATION,
      counted: undefined,
    });
  }
  const counted = plateCounts(run);
  const counts = runCounts(run);
  for (const [field, term] of [
    ['points', POINTS],
    ['replicates', REPLICATES],
  ] as const) {
    numbers.push({
      field,
      id: seriesNumberId(run, field),
      term,
      name: named(term),
      value: counts[field] === undefined ? '' : String(counts[field]),
      unit: '',
      counted: counted[field],
    });
  }
  return numbers;
}

export const isTypedCount = (run: DilutionRun, field: CountField): boolean =>
  typedCount(run.series[field]) !== undefined;

export interface SeriesCountView {
  value: string;
  counted: number | undefined;
  isTyped: boolean;
}

export interface SeriesRowView {
  topWord: string;
  top: string;
  unit: string;
  dilutionFactor: string;
  counts: Record<CountField, SeriesCountView>;
}

export function seriesRowView(run: DilutionRun): SeriesRowView {
  const { series } = run;
  const counted = plateCounts(run);
  const countView = (field: CountField): SeriesCountView => ({
    value: series[field] ?? '',
    counted: counted[field],
    isTyped: isTypedCount(run, field),
  });
  return {
    topWord: STARTS_WITH_NUMBER.test(series.top)
      ? seriesTopTerm(series.unit, stepSeriesUnit(series)).word
      : TOP_CONCENTRATION.word,
    top: readReference(series.top).name,
    unit: series.unit,
    dilutionFactor: readReference(series.dilutionFactor).name,
    counts: { points: countView('points'), replicates: countView('replicates') },
  };
}
