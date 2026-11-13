import { unitScale, type MaterialItem, type Protocol } from '@odysseus/shared-schemas';

import { nameKey, type BoardName, type WorkedOutGroup } from '../formulas/boardCalculation';
import { dimensionKey, FOLD_UNIT, RATIO_NOTATION, readNumber } from '../formulas/quantities';
import { fieldName, materialFields } from '../materials/materialCatalog';
import { normalizeMaterialKey } from '../materials/materialKey';
import { materialNamed } from '../materials/materialLookup';
import { plateAmounts } from '../vessels/vesselMapNames';

import { dilutionRuns, type DilutionRun } from './dilutionRuns';
import { STOCK_FIELD, stockFor, WEIGHT_FIELD } from './dilutionStock';

export interface PrepSettings {
  volumeAdded: string;
  wellVolume: string;
  extraPercent: string;
  roundTo: string;
}

const PREP_DEFAULTS: PrepSettings = {
  volumeAdded: '',
  wellVolume: '',
  extraPercent: '20',
  roundTo: '5',
};

export const prepSettingsOf = (run: DilutionRun): PrepSettings => ({
  ...PREP_DEFAULTS,
  ...run.series.prep,
});

const PREP_INPUTS: Readonly<Record<keyof PrepSettings, [label: string, unit: string]>> = {
  wellVolume: ['well volume', 'µL'],
  volumeAdded: ['volume added', 'µL'],
  extraPercent: ['extra', '%'],
  roundTo: ['round to', 'µL'],
};

export const PREP_LINES = {
  strength: 'working strength',
  needed: 'volume needed',
  transfer: 'transfer',
  diluent: 'diluent per point',
  topVolume: 'top well volume',
  topWorking: 'top working',
  stock: 'stock to take',
  topDiluent: 'diluent in well 1',
  diluentTotal: 'diluent total',
} as const;

export type PrepLine = keyof typeof PREP_LINES;

const INTERMEDIATE_LINES: ReadonlySet<PrepLine> = new Set([
  'strength',
  'needed',
  'topVolume',
  'topWorking',
]);

export const prepLineId = (run: DilutionRun, line: PrepLine): string => `${run.key}:prep:${line}`;

const MASS_CONCENTRATION = dimensionKey({ mass: 1, volume: -1 });

const dimensionOf = (unit: string) => dimensionKey(unitScale(unit)?.dimension ?? {});

function seriesName(protocol: Protocol, run: DilutionRun, field: 'start' | 'fold'): string {
  const [first] = run.members;
  const plate = protocol.blocks.find(block => block.id === first.plateId);
  const amount =
    plate?.type === 'plate'
      ? plateAmounts(plate).find(
          candidate =>
            candidate.source.kind === 'series' &&
            candidate.source.seriesId === first.seriesId &&
            candidate.source.field === field
        )
      : undefined;
  return amount?.name ?? run.series[field].trim();
}

function fieldNameOf(material: MaterialItem, key: string): string | undefined {
  const definition = materialFields(material).find(candidate => candidate.key === key);
  return definition && fieldName(material, definition);
}

type StockSource =
  | { expr: (topVolume: string, topWorking: string) => string }
  | { problem: string };

function stockSource(
  protocol: Protocol,
  run: DilutionRun,
  takenKeys: ReadonlySet<string>
): StockSource {
  const isRatio = run.series.unit === RATIO_NOTATION;
  const reading = stockFor(protocol, run.subject, run.series.unit, isRatio);
  if (reading.kind === 'undiluted') return { expr: (volume, working) => `${volume} × ${working}` };
  if (reading.kind !== 'ready') return { problem: reading.issue };
  const material = materialNamed(protocol, run.subject);
  const stock = material && fieldNameOf(material, STOCK_FIELD);
  if (!material || !stock || !takenKeys.has(nameKey(stock))) {
    return { problem: `${reading.material}'s stock concentration isn't shown in Materials.` };
  }
  const stockKind = dimensionOf(material.units[STOCK_FIELD] ?? '');
  const seriesKind = dimensionOf(run.series.unit);
  if (stockKind === seriesKind)
    return { expr: (volume, working) => `${volume} × ${working} ÷ ${stock}` };
  const weight = fieldNameOf(material, WEIGHT_FIELD);
  if (!weight || !takenKeys.has(nameKey(weight))) {
    return { problem: `${material.name.trim()}'s molecular weight isn't shown in Materials.` };
  }
  return stockKind === MASS_CONCENTRATION
    ? { expr: (volume, working) => `${volume} × ${working} × ${weight} ÷ ${stock}` }
    : { expr: (volume, working) => `${volume} × ${working} ÷ (${stock} × ${weight})` };
}

function runNames(
  protocol: Protocol,
  run: DilutionRun,
  tag: string,
  takenKeys: ReadonlySet<string>,
  dilutionsBlockId: string | undefined
): BoardName[] {
  const subject = run.subject;
  const settings = prepSettingsOf(run);
  const named = (label: string) => `${subject} ${label}${tag}`;
  const input = (key: keyof PrepSettings) => named(PREP_INPUTS[key][0]);
  const line = (key: PrepLine) => named(PREP_LINES[key]);
  const top = seriesName(protocol, run, 'start');
  const fold = seriesName(protocol, run, 'fold');
  const busiest = named('wells per point');
  const pointCount = Math.max(...run.wellsPerPoint.keys()) + 1;
  const roundsTo = (readNumber(settings.roundTo) ?? 0) > 0 ? input('roundTo') : '1 µL';
  const stock = stockSource(protocol, run, takenKeys);
  const hasStock = 'expr' in stock;

  const exprs: Record<PrepLine, string> = {
    strength: `${input('wellVolume')} ÷ ${input('volumeAdded')}`,
    needed: `${busiest} × ${input('volumeAdded')} × (1 + ${input('extraPercent')})`,
    transfer: `round up(${line('needed')} ÷ (${fold} − 1), ${roundsTo})`,
    diluent: `${line('transfer')} × (${fold} − 1)`,
    topVolume: `${line('transfer')} + ${line('diluent')}`,
    topWorking: `${top} × ${line('strength')}`,
    stock: hasStock ? stock.expr(line('topVolume'), line('topWorking')) : '',
    topDiluent: `${line('topVolume')} − ${line('stock')}`,
    diluentTotal: hasStock
      ? `${line('topDiluent')} + ${line('diluent')} × ${pointCount - 1}`
      : `${line('diluent')} × ${pointCount}`,
  };
  const units: Partial<Record<PrepLine, string>> = {
    strength: FOLD_UNIT,
    ...(run.series.unit === RATIO_NOTATION && { topWorking: RATIO_NOTATION }),
  };
  const group: WorkedOutGroup = {
    key: run.key,
    subject,
    title: `Dilution prep for ${run.places.join(', ')}`,
    settingsBlockId: dilutionsBlockId,
  };
  const inputs: BoardName[] = [
    ...(Object.keys(PREP_INPUTS) as Array<keyof PrepSettings>).map(
      (key): BoardName => ({
        kind: 'value',
        id: `${run.key}:prep:${key}`,
        name: input(key),
        value: settings[key],
        unit: PREP_INPUTS[key][1],
        workedOut: group,
        sourceBlockId: dilutionsBlockId,
      })
    ),
    {
      kind: 'count',
      id: `${run.key}:prep:busiest`,
      name: busiest,
      count: Math.max(...run.wellsPerPoint.values()),
      workedOut: group,
      sourceBlockId: run.members[0].plateId,
    },
  ];
  const clash = [
    ...inputs.map(entry => entry.name),
    ...Object.keys(exprs).map(key => line(key as PrepLine)),
  ].find(name => takenKeys.has(nameKey(name)));
  const lines = (Object.keys(exprs) as PrepLine[])
    .filter(key => !takenKeys.has(nameKey(line(key))))
    .map(
      (key): BoardName => ({
        kind: 'formula',
        id: prepLineId(run, key),
        name: line(key),
        expr: exprs[key],
        unit: units[key] ?? '',
        workedOut: group,
        ...(INTERMEDIATE_LINES.has(key) && { isIntermediate: true }),
        ...(clash
          ? { problem: `Rename “${clash}”: the ${subject} dilution prep needs that name.` }
          : key === 'stock' && !hasStock && { problem: stock.problem }),
      })
    );
  return clash ? lines : [...inputs, ...lines];
}

export function dilutionFormulaNames(protocol: Protocol, taken: readonly BoardName[]): BoardName[] {
  const takenKeys = new Set(taken.map(entry => nameKey(entry.name)));
  const dilutionsBlockId = protocol.blocks.find(block => block.type === 'dilutions')?.id;
  const seen = new Map<string, number>();
  return dilutionRuns(protocol).flatMap(run => {
    if (!run.subject) return [];
    const subjectKey = normalizeMaterialKey(run.subject);
    const index = seen.get(subjectKey) ?? 0;
    seen.set(subjectKey, index + 1);
    return runNames(protocol, run, index ? ` ${index + 1}` : '', takenKeys, dilutionsBlockId);
  });
}
