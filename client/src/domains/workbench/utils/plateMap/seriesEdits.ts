import { normalizePlateMap } from '@odysseus/shared-schemas';

import { readReference } from '../formulas/nameReferences';
import { displayValue, readNumber } from '../formulas/quantities';
import { createId } from '../ids/createId';
import { DILUTION_FACTOR, TOP_AMOUNT } from '../terms/termList';
import { readTypedAmount } from '../units/textAmounts';
import { lowerLead } from '../values/valueNames';

import { pointAmount, type SeriesDirection } from './plateSeries';

import type { PlateMapSheet } from './plateMapTabs';
import type { SeriesField } from '../dilutions/seriesNumbers';
import type { SolvedBoard } from '../formulas/boardCalculation';
import type { ProtocolSeries, PlateMap, Protocol } from '@odysseus/shared-schemas';

type Direction = SeriesDirection;

type SeriesPrepKey = keyof NonNullable<ProtocolSeries['prep']>;

export function setPrepSetting(
  draft: Protocol,
  seriesId: string,
  key: SeriesPrepKey,
  value: string
): void {
  const series = draft.series[seriesId];
  if (series) series.prep = { ...series.prep, [key]: value };
}

export function setSeriesNumber(
  draft: Protocol,
  seriesId: string,
  field: SeriesField,
  value: string
): void {
  const series = draft.series[seriesId];
  if (!series || !('top' in series)) return;
  if (field === 'top' || field === 'dilutionFactor') series[field] = value;
  else if (value.trim()) series[field] = value.trim();
  else delete series[field];
}

export function setSeriesTopUnit(draft: Protocol, seriesId: string, unit: string): void {
  const series = draft.series[seriesId];
  if (series && 'top' in series) series.unit = unit;
}

export interface SeriesForm {
  lineId: string;
  seriesId: string | undefined;
  isList: boolean;
  top: string;
  unit: string;
  dilutionFactor: string;
  typedValues: string;
  direction: Direction;
}

interface TypedAmount {
  amount: string;
  unit: string;
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

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
  series: ProtocolSeries | undefined,
  direction: Direction,
  typed: TypedAmount
): SeriesForm {
  const blank = { lineId, seriesId, top: '', unit: '', dilutionFactor: '', typedValues: '' };
  if (!series) {
    return { ...blank, isList: false, top: typed.amount, unit: typed.unit, direction: 'right' };
  }
  if ('typedValues' in series) {
    return { ...blank, isList: true, typedValues: series.typedValues.join(', '), direction };
  }
  const { top, unit, dilutionFactor } = series;
  return {
    ...blank,
    isList: false,
    top: readReference(top).name,
    unit,
    dilutionFactor: readReference(dilutionFactor).name,
    direction,
  };
}

export function lineUnitOf(card: PlateMap, seriesById: Protocol['series'], lineId: string): string {
  const cells = Object.values(card.samples).flatMap(lines =>
    lines[lineId] ? [lines[lineId]] : []
  );
  const typed = cells.find(entry => entry.unit)?.unit;
  if (typed) return typed;
  for (const entry of cells) {
    const series = entry.seriesId === undefined ? undefined : seriesById[entry.seriesId];
    if (series && 'top' in series && series.unit) return series.unit;
  }
  return '';
}

export function seriesTargets(
  card: PlateMap,
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>,
  form: Pick<SeriesForm, 'lineId' | 'seriesId'>
): string[] {
  const inSeries = (key: string) =>
    form.seriesId !== undefined && card.samples[key]?.[form.lineId]?.seriesId === form.seriesId;
  const at = new Map(
    sheet.positions.map(position => [`${position.row},${position.col}`, position])
  );
  const chosen = new Set(sheet.positions.filter(position => keys.has(position.key)));
  const unvisited = [...chosen];
  for (let position = unvisited.pop(); position; position = unvisited.pop()) {
    for (const [rows, cols] of NEIGHBORS) {
      const next = at.get(`${position.row + rows},${position.col + cols}`);
      if (!next || chosen.has(next) || !inSeries(next.key)) continue;
      chosen.add(next);
      unvisited.push(next);
    }
  }
  return sheet.positions.filter(position => chosen.has(position)).map(position => position.key);
}

export function wellPoints(
  sheet: PlateMapSheet,
  keys: readonly string[],
  direction: Direction
): Map<string, number> {
  const isAcross = direction === 'right' || direction === 'left';
  const positions = sheet.positions.filter(position => keys.includes(position.key));
  const axisOf = (position: (typeof positions)[number]) => (isAcross ? position.col : position.row);
  const rowsOrColumns = [...new Set(positions.map(axisOf))].sort((a, b) => a - b);
  if (direction === 'left' || direction === 'up') rowsOrColumns.reverse();
  return new Map(
    positions.map(position => [position.key, rowsOrColumns.indexOf(axisOf(position))])
  );
}

function seriesShape(form: SeriesForm): ProtocolSeries {
  if (form.isList) return { typedValues: splitPoints(form.typedValues) };
  const typed = readTypedAmount(form.top);
  return {
    top: typed?.value ?? form.top.trim(),
    unit: typed?.unit ?? form.unit,
    dilutionFactor: form.dilutionFactor.trim(),
  };
}

const plannedPoints = (series: ProtocolSeries | undefined): number | undefined => {
  const points = series && 'top' in series ? readNumber(series.points ?? '') : undefined;
  return points !== undefined && points > 0 ? points : undefined;
};

export interface SeriesFit {
  planned: number;
  fits: number;
}

const selectedKeys = (sheet: PlateMapSheet, keys: ReadonlySet<string>) =>
  sheet.positions.filter(position => keys.has(position.key)).map(position => position.key);

export function seriesFit(
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>,
  direction: Direction,
  series: ProtocolSeries | undefined
): SeriesFit | undefined {
  const planned = plannedPoints(series);
  const fits = new Set(wellPoints(sheet, selectedKeys(sheet, keys), direction).values()).size;
  return planned !== undefined && fits < planned ? { planned, fits } : undefined;
}

export function dilutionLineOf(
  card: PlateMap,
  seriesById: Protocol['series'],
  seriesId: string
): string | undefined {
  const entries = Object.values(card.samples);
  const holds = (lineId: string, matches: (id: string) => boolean) =>
    entries.some(lines => {
      const id = lines[lineId]?.seriesId;
      return id !== undefined && matches(id);
    });
  const isDilution = (id: string) => {
    const series = seriesById[id];
    return !!series && 'top' in series;
  };
  return (
    card.lines.find(line => holds(line.id, id => id === seriesId)) ??
    card.lines.find(line => holds(line.id, isDilution))
  )?.id;
}

export function paintSeries(
  card: PlateMap,
  seriesById: Protocol['series'],
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>,
  lineId: string,
  seriesId: string,
  direction: Direction
): void {
  if (!card.lines.some(line => line.id === lineId)) {
    card.lines.push({ id: lineId, name: '', values: [], role: 'auto' });
  }
  const shownDirection = (card.seriesDirections[seriesId] ??= direction);
  const targets = selectedKeys(sheet, keys);
  const pointByWell = wellPoints(sheet, targets, shownDirection);
  const planned = plannedPoints(seriesById[seriesId]);
  for (const key of targets) {
    const seriesPoint = pointByWell.get(key) ?? 0;
    if (planned !== undefined && seriesPoint >= planned) continue;
    const lines = (card.samples[key] ??= {});
    const valueId = lines[lineId]?.valueId;
    lines[lineId] = { ...(valueId && { valueId }), seriesId, seriesPoint };
  }
}

export function writeSeries(
  card: PlateMap,
  seriesById: Protocol['series'],
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>,
  form: SeriesForm
): string {
  if (!card.lines.some(line => line.id === form.lineId)) {
    card.lines.push({ id: form.lineId, name: '', values: [], role: 'auto' });
  }
  const targets = seriesTargets(card, sheet, keys, form);
  const pointByWell = wellPoints(sheet, targets, form.direction);
  const seriesId = form.seriesId ?? createId();
  const existing = seriesById[seriesId];
  const planned = plannedPoints(existing);
  const shape = seriesShape(form);
  const kept =
    existing && 'top' in existing && 'top' in shape
      ? {
          points: existing.points,
          replicates: existing.replicates,
          materialId: existing.materialId,
        }
      : {};
  seriesById[seriesId] = {
    ...shape,
    ...Object.fromEntries(Object.entries(kept).filter(([, value]) => value !== undefined)),
    ...(existing?.prep && { prep: existing.prep }),
  };
  card.seriesDirections[seriesId] = form.direction;
  for (const key of targets) {
    if (planned !== undefined && (pointByWell.get(key) ?? 0) >= planned) continue;
    const lines = (card.samples[key] ??= {});
    const valueId = lines[form.lineId]?.valueId;
    lines[form.lineId] = {
      ...(valueId && { valueId }),
      seriesId,
      seriesPoint: pointByWell.get(key) ?? 0,
    };
  }
  return seriesId;
}

export function removeSeries(card: PlateMap, seriesId: string): void {
  for (const entry of Object.values(card.samples).flatMap(lines => Object.values(lines))) {
    if (entry.seriesId !== seriesId) continue;
    delete entry.seriesId;
    delete entry.seriesPoint;
  }
  delete card.seriesDirections[seriesId];
}

export function startSeries(draft: Pick<Protocol, 'series'>, materialId: string): string {
  const seriesId = createId();
  draft.series[seriesId] = {
    top: '',
    unit: '',
    dilutionFactor: '',
    materialId,
  };
  return seriesId;
}

export function removeSeriesEverywhere(
  draft: Pick<Protocol, 'plateMaps' | 'series'>,
  seriesIds: readonly string[]
): void {
  const removed = new Set(seriesIds);
  for (const plateMap of draft.plateMaps) {
    for (const lines of Object.values(plateMap.samples)) {
      for (const [lineId, entry] of Object.entries(lines)) {
        if (entry.seriesId !== undefined && removed.has(entry.seriesId)) delete lines[lineId];
      }
    }
    for (const seriesId of seriesIds) delete plateMap.seriesDirections[seriesId];
    normalizePlateMap(plateMap);
  }
  for (const seriesId of seriesIds) delete draft.series[seriesId];
}

export function seriesPreview(
  card: PlateMap,
  sheet: PlateMapSheet,
  keys: ReadonlySet<string>,
  form: SeriesForm,
  board: SolvedBoard
): string {
  const targets = seriesTargets(card, sheet, keys, form);
  const pointCount = new Set(wellPoints(sheet, targets, form.direction).values()).size;
  const series = seriesShape(form);
  const values = Array.from({ length: pointCount }, (_, point) => {
    const { amount, unit } = pointAmount(series, point, board);
    return amount ? displayValue(amount, unit) : '';
  });
  const filled = values.filter(Boolean);
  if (!filled.length) {
    return form.isList
      ? 'Type the values, separated by commas.'
      : `Type a ${lowerLead(TOP_AMOUNT.word)} and a ${lowerLead(DILUTION_FACTOR.word)}, or pick them from Values.`;
  }
  const shown =
    filled.length > PREVIEW_ROOM
      ? [...filled.slice(0, PREVIEW_HEAD), '…', filled[filled.length - 1]]
      : filled;
  const blanks = pointCount - filled.length;
  const pointWord = pointCount === 1 ? 'point' : 'points';
  return `${pointCount} ${pointWord}: ${shown.join(', ')}${blanks ? `, and ${blanks} left blank` : ''}`;
}
