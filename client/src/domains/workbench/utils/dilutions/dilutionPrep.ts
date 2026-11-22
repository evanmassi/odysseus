import { unitScale, type Protocol } from '@odysseus/shared-schemas';

import { RATIO_NOTATION, readableAmount, readNumber } from '../formulas/quantities';
import { displayNameOf, materialNamed } from '../materials/materialLookup';
import { seriesDilutionFactor, seriesTop } from '../plateMap/plateSeries';
import { DILUTION_FACTOR, TOP_AMOUNT, TOP_POSITION, TOTAL_WELL_VOLUME } from '../terms/termList';
import { lowerLead } from '../values/valueNames';

import {
  prepInputId,
  prepLineId,
  prepSettingsOf,
  type PrepLine,
  type PrepSettings,
} from './dilutionCalculations';
import { stockFor, type StockReading } from './dilutionStock';
import { dialNumber, pipetteFor, shortNumber, type PipetteUse } from './pipettes';

import type { DilutionRun } from './dilutionRuns';
import type { SolvedBoard } from '../formulas/boardCalculation';

export interface PrepPoint {
  point: number;
  wells: number;
  volume: string;
  final: string;
  workingConc: string;
}

export interface PrepWarning {
  line: PrepLine;
  text: string;
}

interface PrepBase {
  settings: PrepSettings;
  summary: string;
  inheritedWellVolume: string | undefined;
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

export function dilutionPrep(
  run: DilutionRun,
  protocol: Pick<Protocol, 'blocks'>,
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
    top ? show(top.value) : run.series.start || '?',
    `1:${shortNumber(dilutionFactor || 0)}`,
    `${pointCount} ${pointCount === 1 ? 'point' : 'points'}`,
  ].join(' · ');
  const typedWellVolume = settings.wellVolume.trim();
  const experimentWellVolume = typedWellVolume
    ? undefined
    : inMicroliters(answerOf(board, prepInputId(run, 'wellVolume')));
  const base = {
    settings,
    summary,
    inheritedWellVolume:
      experimentWellVolume === undefined ? undefined : shortNumber(experimentWellVolume),
  };
  if (!top || !(dilutionFactor > 1)) {
    return {
      ...base,
      kind: 'problem',
      problem: `Give this series a ${lowerLead(TOP_AMOUNT.word)} with a unit, and a ${lowerLead(DILUTION_FACTOR.word)}, with its Dilution button.`,
    };
  }
  const added = readNumber(settings.volumeAdded) ?? NaN;
  const wellVolume = typedWellVolume ? readNumber(typedWellVolume) : experimentWellVolume;
  if (!(added > 0) || !((wellVolume ?? NaN) >= added)) {
    return {
      ...base,
      kind: 'problem',
      problem: `Set the volume added, and the ${lowerLead(TOTAL_WELL_VOLUME.word)} here or as "${TOTAL_WELL_VOLUME.word}" in Values.`,
    };
  }
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
  const stock = stockFor(protocol, run.subject, unit, isRatio);
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
  const points = Array.from({ length: pointCount }, (_, point) => ({
    point: point + 1,
    wells: run.replicatesByPoint.get(point) ?? 0,
    volume: dialNumber(pipetteFor('series', diluent), point ? diluent : total),
    final: show(inWell(point)),
    workingConc: show(workingConcAt(point)),
  }));
  const topDiluent = inMicroliters(lineAnswer(board, run, 'topDiluent'));
  const diluentTotal = inMicroliters(lineAnswer(board, run, 'diluentTotal'));
  const diluentMaterial = materialNamed(protocol, chosenDiluent);
  const diluentLabel = diluentMaterial ? displayNameOf(diluentMaterial) : chosenDiluent.trim();
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
