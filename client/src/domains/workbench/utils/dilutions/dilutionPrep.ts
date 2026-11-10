import { unitScale, type Protocol } from '@odysseus/shared-schemas';

import { RATIO_NOTATION, readableAmount, readNumber } from '../formulas/quantities';
import { seriesFold, seriesTop } from '../vessels/plateSeries';

import { prepLineId, prepSettingsOf, type PrepLine, type PrepSettings } from './dilutionFormulas';
import { stockFor, type StockReading } from './dilutionStock';
import { dialNumber, PIPETTES, pipetteFor, shortNumber, type Pipette } from './pipettes';

import type { DilutionRun } from './dilutionRuns';
import type { BoardCalculation } from '../formulas/boardCalculation';

export interface PrepPoint {
  point: number;
  wells: number;
  volume: string;
  final: string;
  working: string;
}

export interface PrepWarning {
  line: PrepLine;
  text: string;
}

interface PrepBase {
  settings: PrepSettings;
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
      stockPipette: string | undefined;
      stockShown: string | undefined;
      stock: StockReading;
      notes: Array<[label: string, value: string]>;
      warnings: PrepWarning[];
    });

const PREP_PLATES = [
  { label: '500 µL deep-well plate', fill: 450 },
  { label: '1 mL deep-well plate', fill: 900 },
  { label: '2 mL deep-well plate', fill: 1800 },
];
const MICROLITER = unitScale('µL')?.factor ?? 1;

const dialText = (pipette: Pipette | undefined, volume: number) =>
  `${dialNumber(pipette, volume)} µL`;
const microliters = (volume: number) => readableAmount(String(volume), 'µL');

type LineAnswer = { magnitude: number } | { problem: string };

function lineAnswer(calculation: BoardCalculation, run: DilutionRun, line: PrepLine): LineAnswer {
  const result = calculation.results.get(prepLineId(run, line));
  if (result?.status === 'ok') return { magnitude: result.quantity.magnitude };
  return {
    problem: result?.message ?? 'Name this treatment on the plate map to work out its prep.',
  };
}

const inMicroliters = (answer: LineAnswer) =>
  'magnitude' in answer ? answer.magnitude / MICROLITER : undefined;

export function dilutionPrep(
  run: DilutionRun,
  protocol: Pick<Protocol, 'blocks'>,
  calculation: BoardCalculation
): DilutionPrep {
  const settings = prepSettingsOf(run);
  const fold = seriesFold(run.series, calculation);
  const top = seriesTop(run.series, calculation);
  const pointCount = Math.max(...run.wellsPerPoint.keys()) + 1;
  const isRatio = run.series.unit === RATIO_NOTATION;
  const unit = top?.unit ?? '';
  const show = (value: number) =>
    isRatio ? `1:${shortNumber(value)}` : readableAmount(String(value), unit);
  const summary = [
    top ? show(top.value) : run.series.start || '?',
    `1:${shortNumber(fold || 0)}`,
    `${pointCount} points`,
  ].join(' · ');
  const base = { settings, summary };
  if (!top || !(fold > 1)) {
    return {
      ...base,
      kind: 'problem',
      problem: 'Give this series a starting amount with a unit, and a fold, on the plate map.',
    };
  }
  const added = readNumber(settings.volumeAdded) ?? NaN;
  if (!(added > 0) || !((readNumber(settings.wellVolume) ?? NaN) >= added)) {
    return { ...base, kind: 'problem', problem: 'Set the well volume and the volume added.' };
  }
  const strengthAnswer = lineAnswer(calculation, run, 'strength');
  const volumeAnswers = (['transfer', 'diluent', 'topVolume'] as const).map(line =>
    lineAnswer(calculation, run, line)
  );
  const blocked = [strengthAnswer, ...volumeAnswers].find(answer => 'problem' in answer);
  if (blocked && 'problem' in blocked)
    return { ...base, kind: 'problem', problem: blocked.problem };
  const strength = 'magnitude' in strengthAnswer ? strengthAnswer.magnitude : NaN;
  const [transfer, diluent, total] = volumeAnswers.map(answer => inMicroliters(answer) ?? NaN);

  const inWell = (point: number) =>
    isRatio ? top.value * fold ** point : top.value / fold ** point;
  const working = (point: number) =>
    isRatio ? inWell(point) / strength : inWell(point) * strength;
  const stock = stockFor(protocol, run.subject, unit, isRatio);
  const warnings: PrepWarning[] = [];
  const warn = (line: PrepLine, text: string) => warnings.push({ line, text });
  if (isRatio && top.value / strength < 1) {
    warn(
      'topWorking',
      `At ${shortNumber(strength)}× the top well would need stock stronger than undiluted.`
    );
  }
  const stockAnswer = lineAnswer(calculation, run, 'stock');
  if (stock.kind === 'ready' && 'problem' in stockAnswer) warn('stock', stockAnswer.problem);
  let rawStock = inMicroliters(stockAnswer);
  if (rawStock !== undefined && rawStock > total) {
    const stockName =
      stock.kind === 'ready' ? `${stock.shown} ${stock.material}` : 'undiluted stock';
    warn(
      'stock',
      `The stock (${stockName}) is weaker than the top well needs (${show(working(0))}).`
    );
    rawStock = undefined;
  }
  const stockPipette = rawStock === undefined ? undefined : pipetteFor('stock', rawStock);
  if (rawStock !== undefined && !stockPipette) {
    const [smallest] = PIPETTES.stock;
    const largest = PIPETTES.stock[PIPETTES.stock.length - 1];
    warn(
      'stock',
      rawStock < smallest.min
        ? `${shortNumber(rawStock)} µL of stock is below a ${smallest.name}'s range. Make an intermediate dilution first.`
        : `${shortNumber(rawStock)} µL of stock is more than a ${largest.name} takes in one go.`
    );
  }
  const transferPipette = pipetteFor('series', transfer);
  if (!transferPipette)
    warn('transfer', `No 12-channel covers a ${shortNumber(transfer)} µL transfer.`);
  if (!pipetteFor('plating', added)) {
    warn('needed', `No 24-channel covers adding ${shortNumber(added)} µL per well.`);
  }
  const plate = PREP_PLATES.find(candidate => candidate.fill >= total);
  if (!plate) {
    warn(
      'topVolume',
      `${microliters(total)} per well is more than a 2 mL deep-well plate holds comfortably. Use tubes.`
    );
  }
  const diluentPipette = pipetteFor('series', diluent);
  const points = Array.from({ length: pointCount }, (_, point) => ({
    point: point + 1,
    wells: run.wellsPerPoint.get(point) ?? 0,
    volume: dialNumber(diluentPipette, point ? diluent : total),
    final: show(inWell(point)),
    working: show(working(point)),
  }));
  const topDiluent = inMicroliters(lineAnswer(calculation, run, 'topDiluent'));
  const diluentTotal = inMicroliters(lineAnswer(calculation, run, 'diluentTotal'));
  const notes: Array<[string, string]> = [];
  if (rawStock !== undefined && topDiluent !== undefined) {
    notes.push([
      'Well 1',
      `${dialText(stockPipette, rawStock)} stock + ${dialText(pipetteFor('stock', topDiluent), topDiluent)} diluent`,
    ]);
    if (diluentTotal !== undefined) notes.push(['Diluent total', microliters(diluentTotal)]);
  } else {
    notes.push(['Diluent total', `about ${microliters(diluent * pointCount)}`]);
  }
  if (plate) notes.push(['Recommended', plate.label]);
  return {
    ...base,
    kind: 'ready',
    strength: `${shortNumber(strength)}×`,
    points,
    isUneven: new Set(run.wellsPerPoint.values()).size > 1,
    transferText: dialText(transferPipette, transfer),
    stockText: rawStock === undefined ? undefined : dialText(stockPipette, rawStock),
    stockPipette: stockPipette?.name,
    stockShown:
      stock.kind === 'ready' ? stock.shown : stock.kind === 'undiluted' ? 'undiluted' : undefined,
    stock,
    notes,
    warnings,
  };
}
