import { displayValue } from '../formulas/quantities';
import { createId } from '../ids/createId';

import { seriesPoint } from './plateSeries';

import type { VesselSheet } from './vesselTabs';
import type { BoardCalculation } from '../formulas/boardCalculation';
import type { PlateSeries, VesselMapBlock } from '@odysseus/shared-schemas';

type Direction = PlateSeries['direction'];

export interface SeriesForm {
  lineId: string;
  seriesId: string | undefined;
  isList: boolean;
  start: string;
  unit: string;
  fold: string;
  points: string;
  direction: Direction;
}

interface TypedAmount {
  amount: string;
  unit: string;
}

const PREVIEW_HEAD = 4;
const PREVIEW_ROOM = 6;

const splitPoints = (text: string) =>
  text
    .split(/[,;\n]/)
    .map(point => point.trim())
    .filter(Boolean);

export function seriesFormFor(
  lineId: string,
  seriesId: string | undefined,
  series: PlateSeries | undefined,
  typed: TypedAmount
): SeriesForm {
  const blank = { lineId, seriesId, start: '', unit: '', fold: '', points: '' };
  if (!series) {
    return { ...blank, isList: false, start: typed.amount, unit: typed.unit, direction: 'right' };
  }
  if ('points' in series) {
    return {
      ...blank,
      isList: true,
      points: series.points.join(', '),
      direction: series.direction,
    };
  }
  const { start, unit, fold, direction } = series;
  return { ...blank, isList: false, start, unit, fold, direction };
}

export function seriesTargets(
  block: VesselMapBlock,
  sheet: VesselSheet,
  keys: ReadonlySet<string>,
  form: Pick<SeriesForm, 'lineId' | 'seriesId'>
): string[] {
  const inSeries = (key: string) =>
    form.seriesId !== undefined && block.cells[key]?.[form.lineId]?.seriesId === form.seriesId;
  return sheet.spots.filter(spot => keys.has(spot.key) || inSeries(spot.key)).map(spot => spot.key);
}

export function seriesSteps(
  sheet: VesselSheet,
  keys: readonly string[],
  direction: Direction
): Map<string, number> {
  const isAcross = direction === 'right' || direction === 'left';
  const spots = sheet.spots.filter(spot => keys.includes(spot.key));
  const axisOf = (spot: (typeof spots)[number]) => (isAcross ? spot.col : spot.row);
  const positions = [...new Set(spots.map(axisOf))].sort((a, b) => a - b);
  if (direction === 'left' || direction === 'up') positions.reverse();
  return new Map(spots.map(spot => [spot.key, positions.indexOf(axisOf(spot))]));
}

const seriesShape = (form: SeriesForm): PlateSeries =>
  form.isList
    ? { points: splitPoints(form.points), direction: form.direction }
    : {
        start: form.start.trim(),
        unit: form.unit,
        fold: form.fold.trim(),
        direction: form.direction,
      };

export function writeSeries(
  block: VesselMapBlock,
  sheet: VesselSheet,
  keys: ReadonlySet<string>,
  form: SeriesForm
): string {
  if (!block.lines.some(line => line.id === form.lineId)) {
    block.lines.push({ id: form.lineId, name: '', values: [], role: 'auto' });
  }
  const targets = seriesTargets(block, sheet, keys, form);
  const steps = seriesSteps(sheet, targets, form.direction);
  const seriesId = form.seriesId ?? createId();
  const prep = block.series[seriesId]?.prep;
  block.series[seriesId] = { ...seriesShape(form), ...(prep && { prep }) };
  for (const key of targets) {
    const lines = (block.cells[key] ??= {});
    const valueId = lines[form.lineId]?.valueId;
    lines[form.lineId] = { ...(valueId && { valueId }), seriesId, seriesStep: steps.get(key) ?? 0 };
  }
  return seriesId;
}

export function removeSeries(block: VesselMapBlock, seriesId: string): void {
  for (const [key, lines] of Object.entries(block.cells)) {
    for (const [lineId, cell] of Object.entries(lines)) {
      if (cell.seriesId !== seriesId) continue;
      delete cell.seriesId;
      delete cell.seriesStep;
      if (!cell.valueId && !cell.unit) delete lines[lineId];
    }
    if (!Object.keys(lines).length) delete block.cells[key];
  }
  delete block.series[seriesId];
}

export function seriesPreview(
  block: VesselMapBlock,
  sheet: VesselSheet,
  keys: ReadonlySet<string>,
  form: SeriesForm,
  calculation: BoardCalculation
): string {
  const targets = seriesTargets(block, sheet, keys, form);
  const pointCount = new Set(seriesSteps(sheet, targets, form.direction).values()).size;
  const series = seriesShape(form);
  const values = Array.from({ length: pointCount }, (_, step) => {
    const { amount, unit } = seriesPoint(series, step, calculation);
    return amount ? displayValue(amount, unit) : '';
  });
  const filled = values.filter(Boolean);
  if (!filled.length) {
    return form.isList
      ? 'Type the values, separated by commas.'
      : 'Type a start and a dilution, or pick them from Values.';
  }
  const shown =
    filled.length > PREVIEW_ROOM
      ? [...filled.slice(0, PREVIEW_HEAD), '…', filled[filled.length - 1]]
      : filled;
  const blanks = pointCount - filled.length;
  const stepWord = pointCount === 1 ? 'step' : 'steps';
  return `${pointCount} ${stepWord}: ${shown.join(', ')}${blanks ? `, and ${blanks} left blank` : ''}`;
}
