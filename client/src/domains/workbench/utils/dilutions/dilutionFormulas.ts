import {
  unitScale,
  type MaterialItem,
  type Protocol,
  normalizeMaterialKey,
} from '@odysseus/shared-schemas';

import { nameKey, type BoardName, type WorkedOutGroup } from '../formulas/boardCalculation';
import { dimensionKey, FOLD_UNIT, RATIO_NOTATION, readNumber } from '../formulas/quantities';
import { fieldName, materialFields } from '../materials/materialCatalog';
import { materialNamed } from '../materials/materialLookup';
import { wellTotalName } from '../materials/materialRecipeFormulas';
import {
  DILUENT_IN_TOP,
  EXTRA,
  MOLECULAR_WEIGHT,
  REPLICATES,
  STOCK_CONCENTRATION,
  TOP_VOLUME,
  TOP_WORKING_CONCENTRATION,
  TOTAL_WELL_VOLUME,
  VOLUME_NEEDED,
  WORKING_STRENGTH,
} from '../terms/termList';
import { lowerLead } from '../values/valueNames';
import { stepSeriesUnit } from '../vessels/plateSeries';
import { plateAmounts } from '../vessels/vesselMapNames';

import { diluentNeedId, runDiluents } from './dilutionDiluents';
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
  wellVolume: [lowerLead(TOTAL_WELL_VOLUME.word), 'µL'],
  volumeAdded: ['volume added', 'µL'],
  extraPercent: [lowerLead(EXTRA.word), '%'],
  roundTo: ['round to', 'µL'],
};

export const PREP_LINES = {
  strength: lowerLead(WORKING_STRENGTH.word),
  needed: lowerLead(VOLUME_NEEDED.word),
  transfer: 'transfer',
  diluent: 'diluent per point',
  topVolume: lowerLead(TOP_VOLUME.word),
  topWorking: lowerLead(TOP_WORKING_CONCENTRATION.word),
  stock: 'stock to take',
  topDiluent: lowerLead(DILUENT_IN_TOP.word),
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

export const prepInputId = (run: DilutionRun, key: keyof PrepSettings): string =>
  `${run.key}:prep:${key}`;

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
  const seriesUnit = stepSeriesUnit(run.series);
  const isRatio = seriesUnit === RATIO_NOTATION;
  const reading = stockFor(protocol, run.subject, seriesUnit, isRatio);
  if (reading.kind === 'undiluted') return { expr: (volume, working) => `${volume} × ${working}` };
  if (reading.kind !== 'ready') return { problem: reading.issue };
  const material = materialNamed(protocol, run.subject);
  const stock = material && fieldNameOf(material, STOCK_FIELD);
  if (!material || !stock || !takenKeys.has(nameKey(stock))) {
    return {
      problem: `${reading.material}'s ${lowerLead(STOCK_CONCENTRATION.word)} isn't shown in Materials.`,
    };
  }
  const stockKind = dimensionOf(material.units[STOCK_FIELD] ?? '');
  const seriesKind = dimensionOf(seriesUnit);
  if (stockKind === seriesKind)
    return { expr: (volume, working) => `${volume} × ${working} ÷ ${stock}` };
  const weight = fieldNameOf(material, WEIGHT_FIELD);
  if (!weight || !takenKeys.has(nameKey(weight))) {
    return {
      problem: `${material.name.trim()}'s ${MOLECULAR_WEIGHT.word} isn't shown in Materials.`,
    };
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
  dilutionsBlockId: string | undefined,
  wellTotal: string | undefined
): BoardName[] {
  const subject = run.subject;
  const settings = prepSettingsOf(run);
  const named = (label: string) => `${subject} ${label}${tag}`;
  const input = (key: keyof PrepSettings) => named(PREP_INPUTS[key][0]);
  const line = (key: PrepLine) => named(PREP_LINES[key]);
  const top = seriesName(protocol, run, 'start');
  const fold = seriesName(protocol, run, 'fold');
  const busiest = named(lowerLead(REPLICATES.word));
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
    ...(Object.keys(PREP_INPUTS) as Array<keyof PrepSettings>).map((key): BoardName => {
      const source = { id: prepInputId(run, key), name: input(key), unit: PREP_INPUTS[key][1] };
      const isFromExperiment = key === 'wellVolume' && !settings[key].trim() && wellTotal;
      return isFromExperiment
        ? { ...source, kind: 'formula', expr: wellTotal, workedOut: group }
        : {
            ...source,
            kind: 'value',
            value: settings[key],
            workedOut: group,
            sourceBlockId: dilutionsBlockId,
          };
    }),
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
          ? { problem: `Rename "${clash}": the ${subject} dilution prep needs that name.` }
          : key === 'stock' && !hasStock && { problem: stock.problem }),
      })
    );
  return clash ? lines : [...inputs, ...lines];
}

interface DiluentUse {
  name: string;
  totals: string[];
}

function diluentNeedNames(
  protocol: Protocol,
  uses: ReadonlyMap<string, DiluentUse>,
  takenKeys: ReadonlySet<string>,
  dilutionsBlockId: string | undefined
): BoardName[] {
  return [...uses.values()].map(({ name, totals }) => {
    const shownName = materialNamed(protocol, name)?.name.trim() ?? name;
    const needName = `${shownName} needed for dilutions`;
    return {
      kind: 'formula',
      id: diluentNeedId(name),
      name: needName,
      expr: totals.join(' + '),
      unit: '',
      workedOut: {
        key: diluentNeedId(name),
        subject: shownName,
        title: `${shownName} for dilutions`,
        settingsBlockId: dilutionsBlockId,
      },
      ...(takenKeys.has(nameKey(needName)) && {
        problem: `Rename "${needName}": the dilution prep needs that name.`,
      }),
    };
  });
}

export function dilutionFormulaNames(protocol: Protocol, taken: readonly BoardName[]): BoardName[] {
  const takenKeys = new Set(taken.map(entry => nameKey(entry.name)));
  const wellTotal = wellTotalName(new Map(taken.map(entry => [nameKey(entry.name), entry])));
  const dilutionsBlockId = protocol.blocks.find(block => block.type === 'dilutions')?.id;
  const runs = dilutionRuns(protocol);
  const diluents = runDiluents(runs, protocol.diluent);
  const uses = new Map<string, DiluentUse>();
  const seen = new Map<string, number>();
  const names = runs.flatMap(run => {
    if (!run.subject) return [];
    const subjectKey = normalizeMaterialKey(run.subject);
    const index = seen.get(subjectKey) ?? 0;
    seen.set(subjectKey, index + 1);
    const tag = index ? ` ${index + 1}` : '';
    const diluent = diluents.get(run.key);
    if (diluent) {
      const use = uses.get(normalizeMaterialKey(diluent)) ?? { name: diluent, totals: [] };
      use.totals.push(`${run.subject} ${PREP_LINES.diluentTotal}${tag}`);
      uses.set(normalizeMaterialKey(diluent), use);
    }
    return runNames(protocol, run, tag, takenKeys, dilutionsBlockId, wellTotal);
  });
  return [...names, ...diluentNeedNames(protocol, uses, takenKeys, dilutionsBlockId)];
}
