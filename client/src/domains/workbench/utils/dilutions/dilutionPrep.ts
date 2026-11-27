import { unitScale, type Protocol } from '@odysseus/shared-schemas';

import { quantityOfName, type BoardName, type SolvedBoard } from '../formulas/boardCalculation';
import { describeName } from '../formulas/nameDisplay';
import { readReference } from '../formulas/nameReferences';
import { RATIO_NOTATION, readableAmount } from '../formulas/quantities';
import { displayNameOf } from '../materials/materialLookup';
import { linkOwner } from '../materials/plateLinks';
import { seriesDilutionFactor, seriesTop } from '../plateMap/plateSeries';
import {
  DILUTION_FACTOR,
  TOP_AMOUNT,
  TOP_POSITION,
  TOTAL_WELL_VOLUME,
  VOLUME_PER_WELL,
} from '../terms/termList';
import { lowerLead } from '../values/valueNames';
import { valueSourceOf, type ValueSource } from '../values/valueSources';

import {
  ownPrepValueName,
  prepLineId,
  prepSettingsOf,
  SHARED_PREP_KEYS,
  SHARED_PREP_VALUES,
  sharedPrepSource,
  type PrepLine,
  type PrepSettings,
  type SharedPrepKey,
} from './dilutionCalculations';
import { diluentChoice } from './dilutionDiluents';
import { runMaterial, stockFor, type StockReading } from './dilutionStock';
import { dialNumber, pipetteFor, shortNumber, type PipetteUse } from './pipettes';

import type { DilutionRun } from './dilutionRuns';

export interface PrepPoint {
  point: number;
  wells: number;
  volume: string;
  level: number;
  final: string;
  workingConc: string;
}

export interface PrepWarning {
  line: PrepLine;
  text: string;
}

export type SharedPrepEdit =
  | { kind: 'source'; source: ValueSource }
  | { kind: 'new'; name: string; unit: string }
  | { kind: 'readOnly'; hint: string };

export interface SharedPrepField {
  key: SharedPrepKey;
  value: string;
  unit: string;
  isAssaySetup: boolean;
  edit: SharedPrepEdit;
}

interface PrepBase {
  settings: PrepSettings;
  shared: Record<SharedPrepKey, SharedPrepField>;
  summary: string;
}

export type DilutionPrep =
  | (PrepBase & { kind: 'problem'; problem: string })
  | (PrepBase & {
      kind: 'ready';
      strength: string;
      points: PrepPoint[];
      isUneven: boolean;
      transferText: string;
      stockText: string | undefined;
      stockShown: string | undefined;
      stock: StockReading;
      notes: Array<[label: string, value: string]>;
      warnings: PrepWarning[];
    });

const MICROLITER = unitScale('µL')?.factor ?? 1;

const MICROLITERS_PER_MILLILITER = 1000;

const microliters = (volume: number) => readableAmount(String(volume), 'µL');
const dialed = (use: PipetteUse, volume: number) =>
  volume >= MICROLITERS_PER_MILLILITER
    ? microliters(volume)
    : `${dialNumber(pipetteFor(use, volume), volume)} µL`;

type LineAnswer = { magnitude: number } | { problem: string };

function answerOf(board: SolvedBoard, id: string): LineAnswer {
  const result = board.results.get(id);
  if (result?.status === 'ok') return { magnitude: result.quantity.magnitude };
  return {
    problem: result?.message ?? 'Name this treatment in its wells to work out its prep.',
  };
}

const lineAnswer = (board: SolvedBoard, run: DilutionRun, line: PrepLine) =>
  answerOf(board, prepLineId(run, line));

const inMicroliters = (answer: LineAnswer) =>
  'magnitude' in answer ? answer.magnitude / MICROLITER : undefined;

const READ_ONLY_HINTS: Readonly<Record<BoardName['kind'], string>> = {
  calculation: 'Worked out in Calculations',
  value: 'Set on the card it comes from',
  count: 'Counted from the plate',
  item: 'Set on the card it comes from',
};

function sharedPrepField(
  protocol: Pick<Protocol, 'materials' | 'plateMaps' | 'series' | 'values'>,
  board: SolvedBoard,
  run: DilutionRun,
  key: SharedPrepKey
): SharedPrepField {
  const found = sharedPrepSource(board.kinds, linkOwner(protocol, run, run.subject), key);
  const { term, unit } = SHARED_PREP_VALUES[key];
  if (!found) {
    const name = key === 'totalWellVolume' ? term.word : ownPrepValueName(run.subject, key);
    return { key, value: '', unit, isAssaySetup: false, edit: { kind: 'new', name, unit } };
  }
  const { entry, isAssaySetup } = found;
  const source = valueSourceOf(protocol, entry.id);
  if (source && entry.kind === 'value') {
    const edit: SharedPrepEdit = { kind: 'source', source };
    return { key, value: entry.value, unit: entry.unit, isAssaySetup, edit };
  }
  const edit: SharedPrepEdit = { kind: 'readOnly', hint: READ_ONLY_HINTS[entry.kind] };
  return { key, value: describeName(board, entry).text, unit: '', isAssaySetup, edit };
}

function sharedMicroliters(
  protocol: Pick<Protocol, 'materials'>,
  board: SolvedBoard,
  run: DilutionRun,
  key: SharedPrepKey
) {
  const entry = sharedPrepSource(board.kinds, linkOwner(protocol, run, run.subject), key)?.entry;
  const quantity = entry && quantityOfName(board, entry);
  return quantity && quantity.magnitude / MICROLITER;
}

export function dilutionPrep(
  run: DilutionRun,
  protocol: Pick<Protocol, 'materials' | 'plateMaps' | 'series' | 'values'>,
  board: SolvedBoard,
  chosenDiluent: string
): DilutionPrep {
  const settings = prepSettingsOf(run);
  const dilutionFactor = seriesDilutionFactor(run.series, board);
  const top = seriesTop(run.series, board);
  const pointCount = Math.max(...run.replicatesByPoint.keys()) + 1;
  const isRatio = run.series.unit === RATIO_NOTATION;
  const unit = top?.unit ?? '';
  const show = (value: number) =>
    isRatio ? `1:${shortNumber(value)}` : readableAmount(String(value), unit);
  const summary = [
    top ? show(top.value) : readReference(run.series.top).name || '?',
    `1:${shortNumber(dilutionFactor || 0)}`,
    `${pointCount} ${pointCount === 1 ? 'point' : 'points'}`,
  ].join(' · ');
  const base = {
    settings,
    shared: Object.fromEntries(
      SHARED_PREP_KEYS.map(key => [key, sharedPrepField(protocol, board, run, key)])
    ) as Record<SharedPrepKey, SharedPrepField>,
    summary,
  };
  if (!top || !(dilutionFactor > 1)) {
    return {
      ...base,
      kind: 'problem',
      problem: `Give this series a ${lowerLead(TOP_AMOUNT.word)} with a unit, and a ${lowerLead(DILUTION_FACTOR.word)}, with its Dilution button.`,
    };
  }
  const added = sharedMicroliters(protocol, board, run, 'volumePerWell');
  const wellVolume = sharedMicroliters(protocol, board, run, 'totalWellVolume');
  const shownVolume = lowerLead(VOLUME_PER_WELL.word);
  const shownWellVolume = lowerLead(TOTAL_WELL_VOLUME.word);
  const problem = !(added && added > 0)
    ? `Set the ${shownVolume} here, or as "${ownPrepValueName(run.subject, 'volumePerWell')}" in Values.`
    : !(wellVolume && wellVolume > 0)
      ? `Set the ${shownWellVolume} here, or as "${TOTAL_WELL_VOLUME.word}" in Values.`
      : wellVolume < added
        ? `The ${shownVolume} is more than the ${shownWellVolume}.`
        : undefined;
  if (problem) return { ...base, kind: 'problem', problem };
  const strengthAnswer = lineAnswer(board, run, 'strength');
  const volumeAnswers = (['transfer', 'diluent', 'topVolume'] as const).map(line =>
    lineAnswer(board, run, line)
  );
  const blocked = [strengthAnswer, ...volumeAnswers].find(answer => 'problem' in answer);
  if (blocked && 'problem' in blocked)
    return { ...base, kind: 'problem', problem: blocked.problem };
  const strength = 'magnitude' in strengthAnswer ? strengthAnswer.magnitude : NaN;
  const [transfer, diluent, total] = volumeAnswers.map(answer => inMicroliters(answer) ?? NaN);

  const inWell = (point: number) =>
    isRatio ? top.value * dilutionFactor ** point : top.value / dilutionFactor ** point;
  const workingConcAt = (point: number) =>
    isRatio ? inWell(point) / strength : inWell(point) * strength;
  const stock = stockFor(runMaterial(protocol, run), run.subject, unit, isRatio);
  const warnings: PrepWarning[] = [];
  const warn = (line: PrepLine, text: string) => warnings.push({ line, text });
  if (isRatio && top.value / strength < 1) {
    warn(
      'topWorking',
      `At ${shortNumber(strength)}× the top would need stock stronger than undiluted.`
    );
  }
  const stockAnswer = lineAnswer(board, run, 'stock');
  if (stock.kind === 'ready' && 'problem' in stockAnswer) warn('stock', stockAnswer.problem);
  let rawStock = inMicroliters(stockAnswer);
  if (rawStock !== undefined && rawStock > total) {
    const stockName =
      stock.kind === 'ready' ? `${stock.shown} ${stock.material}` : 'undiluted stock';
    warn(
      'stock',
      `The stock (${stockName}) is weaker than the top needs (${show(workingConcAt(0))}).`
    );
    rawStock = undefined;
  }
  const fullest = diluent + transfer;
  const points = Array.from({ length: pointCount }, (_, point) => ({
    point: point + 1,
    wells: run.replicatesByPoint.get(point) ?? 0,
    volume: dialNumber(pipetteFor('series', diluent), point ? diluent : total),
    level: point === pointCount - 1 ? 1 : diluent / fullest,
    final: show(inWell(point)),
    workingConc: show(workingConcAt(point)),
  }));
  const topDiluent = inMicroliters(lineAnswer(board, run, 'topDiluent'));
  const diluentTotal = inMicroliters(lineAnswer(board, run, 'diluentTotal'));
  const { material: diluentMaterial, name: typedDiluent } = diluentChoice(protocol, chosenDiluent);
  const diluentLabel = diluentMaterial ? displayNameOf(diluentMaterial) : typedDiluent;
  const diluentName = diluentLabel || 'diluent';
  const restWells = pointCount > 2 ? `Then 2–${pointCount}` : 'Then 2';
  const totalLabel = `${diluentLabel || 'Diluent'} total`;
  const notes: Array<[string, string]> = [];
  if (rawStock !== undefined && topDiluent !== undefined) {
    notes.push([
      TOP_POSITION,
      `${dialed('series', total)} (${dialed('stock', rawStock)} stock + ${dialed('stock', topDiluent)} ${diluentName})`,
    ]);
  }
  if (pointCount > 1) {
    notes.push([
      restWells,
      `${dialed('series', diluent)} ${diluentName}${pointCount > 2 ? ' each' : ''}`,
    ]);
  }
  if (rawStock !== undefined && diluentTotal !== undefined) {
    notes.push([totalLabel, microliters(diluentTotal)]);
  } else {
    notes.push([totalLabel, `about ${microliters(diluent * pointCount)}`]);
  }
  return {
    ...base,
    kind: 'ready',
    strength: `${shortNumber(strength)}×`,
    points,
    isUneven: new Set(run.replicatesByPoint.values()).size > 1,
    transferText: dialed('series', transfer),
    stockText: rawStock === undefined ? undefined : dialed('stock', rawStock),
    stockShown:
      stock.kind === 'ready' ? stock.shown : stock.kind === 'undiluted' ? 'undiluted' : undefined,
    stock,
    notes,
    warnings,
  };
}
