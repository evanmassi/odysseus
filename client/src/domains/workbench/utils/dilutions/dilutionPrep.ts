import { lineValueOf, type Protocol, type VesselMapBlock } from '@odysseus/shared-schemas';

import { RATIO_NOTATION, readableAmount, readNumber } from '../formulas/quantities';
import { seriesFold, seriesTop, type StepSeries } from '../vessels/plateSeries';

import { stockFor, type StockReading } from './dilutionStock';
import {
  dialNearest,
  dialNumber,
  dialUp,
  PIPETTES,
  pipetteFor,
  shortNumber,
  type Pipette,
} from './pipettes';

import type { BoardCalculation } from '../formulas/boardCalculation';

export interface DilutionRun {
  plateId: string;
  seriesId: string;
  series: StepSeries;
  subject: string;
  wellsPerPoint: Map<number, number>;
}

export interface PrepSettings {
  volumeAdded: string;
  wellVolume: string;
  extraPercent: string;
  roundTo: string;
}

export interface PrepPoint {
  point: number;
  wells: number;
  volume: string;
  final: string;
  working: string;
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
      warnings: string[];
    });

const PREP_DEFAULTS: PrepSettings = {
  volumeAdded: '',
  wellVolume: '',
  extraPercent: '20',
  roundTo: '5',
};
const PREP_PLATES = [
  { label: '500 µL deep-well plate', fill: 450 },
  { label: '1 mL deep-well plate', fill: 900 },
  { label: '2 mL deep-well plate', fill: 1800 },
];
const EPSILON = 1e-9;

const dialText = (pipette: Pipette | undefined, volume: number) =>
  `${dialNumber(pipette, volume)} µL`;
const microliters = (volume: number) => readableAmount(String(volume), 'µL');

export function dilutionRuns(protocol: Protocol): DilutionRun[] {
  return protocol.blocks
    .filter((block): block is VesselMapBlock => block.type === 'plate')
    .flatMap(plate =>
      plate.lines.flatMap(line => {
        const runs = new Map<string, DilutionRun>();
        for (const lines of Object.values(plate.cells)) {
          const cell = lines[line.id];
          const series = cell?.seriesId === undefined ? undefined : plate.series[cell.seriesId];
          if (!cell?.seriesId || !series || !('start' in series)) continue;
          const run = runs.get(cell.seriesId) ?? {
            plateId: plate.id,
            seriesId: cell.seriesId,
            series,
            subject: lineValueOf(line, cell)?.text.trim() ?? '',
            wellsPerPoint: new Map<number, number>(),
          };
          runs.set(cell.seriesId, run);
          const step = cell.seriesStep ?? 0;
          run.wellsPerPoint.set(step, (run.wellsPerPoint.get(step) ?? 0) + 1);
        }
        return [...runs.values()];
      })
    );
}

export function dilutionPrep(
  run: DilutionRun,
  protocol: Protocol,
  calculation: BoardCalculation
): DilutionPrep {
  const settings = { ...PREP_DEFAULTS, ...run.series.prep };
  const fold = seriesFold(run.series, calculation);
  const top = seriesTop(run.series, calculation);
  const pointCount = Math.max(...run.wellsPerPoint.keys()) + 1;
  const busiest = Math.max(...run.wellsPerPoint.values());
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
  const wellVolume = readNumber(settings.wellVolume) ?? NaN;
  if (!(added > 0) || !(wellVolume >= added)) {
    return { ...base, kind: 'problem', problem: 'Set the well volume and the volume added.' };
  }
  const strength = wellVolume / added;
  const extra = Math.max(0, readNumber(settings.extraPercent) ?? 0) / 100;
  const roundTo = (readNumber(settings.roundTo) ?? 0) > 0 ? (readNumber(settings.roundTo) ?? 1) : 1;
  const need = busiest * added * (1 + extra);
  const roughTransfer = Math.ceil(need / (fold - 1) / roundTo - EPSILON) * roundTo;
  const transferPipette = pipetteFor('series', roughTransfer);
  const transfer = dialUp(transferPipette, roughTransfer);
  const diluentPipette = pipetteFor('series', transfer * (fold - 1));
  const diluent = dialNearest(diluentPipette, transfer * (fold - 1));
  const total = transfer + diluent;
  const inWell = (point: number) =>
    isRatio ? top.value * fold ** point : top.value / fold ** point;
  const working = (point: number) =>
    isRatio ? inWell(point) / strength : inWell(point) * strength;
  const stock = stockFor(protocol, run.subject, unit, isRatio);
  const warnings: string[] = [];
  const stockStrength =
    stock.kind === 'undiluted' ? 1 : stock.kind === 'ready' ? stock.inSeriesUnit : undefined;
  let rawStock =
    stockStrength === undefined
      ? undefined
      : isRatio
        ? total / (top.value / strength)
        : (total * top.value * strength) / stockStrength;
  if (isRatio && top.value / strength < 1) {
    warnings.push(
      `At ${shortNumber(strength)}× the top well would need stock stronger than undiluted.`
    );
  }
  if (rawStock !== undefined && rawStock > total) {
    const stockName =
      stock.kind === 'ready' ? `${stock.shown} ${stock.material}` : 'undiluted stock';
    warnings.push(
      `The stock (${stockName}) is weaker than the top well needs (${show(working(0))}).`
    );
    rawStock = undefined;
  }
  const stockPipette = rawStock === undefined ? undefined : pipetteFor('stock', rawStock);
  if (rawStock !== undefined && !stockPipette) {
    const [smallest] = PIPETTES.stock;
    const largest = PIPETTES.stock[PIPETTES.stock.length - 1];
    warnings.push(
      rawStock < smallest.min
        ? `${shortNumber(rawStock)} µL of stock is below a ${smallest.name}'s range. Make an intermediate dilution first.`
        : `${shortNumber(rawStock)} µL of stock is more than a ${largest.name} takes in one go.`
    );
  }
  const stockVolume = rawStock === undefined ? undefined : dialNearest(stockPipette, rawStock);
  const topPipette =
    stockVolume === undefined ? undefined : pipetteFor('stock', total - stockVolume);
  const topDiluent =
    stockVolume === undefined ? undefined : dialNearest(topPipette, total - stockVolume);
  if (!transferPipette)
    warnings.push(`No 12-channel covers a ${shortNumber(roughTransfer)} µL transfer.`);
  if (!pipetteFor('plating', added)) {
    warnings.push(`No 24-channel covers adding ${shortNumber(added)} µL per well.`);
  }
  const plate = PREP_PLATES.find(candidate => candidate.fill >= total);
  if (!plate) {
    warnings.push(
      `${microliters(total)} per well is more than a 2 mL deep-well plate holds comfortably. Use tubes.`
    );
  }
  const points = Array.from({ length: pointCount }, (_, point) => ({
    point: point + 1,
    wells: run.wellsPerPoint.get(point) ?? 0,
    volume: dialNumber(diluentPipette, point ? diluent : total),
    final: show(inWell(point)),
    working: show(working(point)),
  }));
  const notes: Array<[string, string]> = [];
  if (stockVolume !== undefined && topDiluent !== undefined) {
    notes.push([
      'Well 1',
      `${dialText(stockPipette, stockVolume)} stock + ${dialText(topPipette, topDiluent)} diluent`,
    ]);
    notes.push(['Diluent total', microliters(topDiluent + diluent * (pointCount - 1))]);
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
    stockText: stockVolume === undefined ? undefined : dialText(stockPipette, stockVolume),
    stockPipette: stockPipette?.name,
    stockShown:
      stock.kind === 'ready' ? stock.shown : stock.kind === 'undiluted' ? 'undiluted' : undefined,
    stock,
    notes,
    warnings,
  };
}
