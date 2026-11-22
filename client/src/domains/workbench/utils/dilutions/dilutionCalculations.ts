import {
  unitScale,
  type MaterialItem,
  type Protocol,
  normalizeMaterialKey,
} from '@odysseus/shared-schemas';

import {
  nameKey,
  type BoardName,
  type CalculationGap,
  type WorkedOutGroup,
} from '../formulas/boardCalculation';
import { dimensionKey, FOLD_UNIT, RATIO_NOTATION, readNumber } from '../formulas/quantities';
import { fieldName, materialFields } from '../materials/materialCatalog';
import { materialNamed } from '../materials/materialLookup';
import { plateAmounts } from '../plateMap/plateMapNames';
import { stepSeriesUnit } from '../plateMap/plateSeries';
import {
  DILUENT_IN_TOP,
  EXTRA,
  MOLECULAR_WEIGHT,
  REPLICATES,
  ROUND_TO,
  STOCK_CONCENTRATION,
  TOP_VOLUME,
  TOP_WORKING_CONCENTRATION,
  TOTAL_WELL_VOLUME,
  VOLUME_NEEDED,
  VOLUME_PER_WELL,
  WORKING_STRENGTH,
} from '../terms/termList';
import { findTerm } from '../terms/termLookup';
import { joinValueName, lowerLead, WHOLE_EXPERIMENT } from '../values/valueNames';

import { diluentNeedId, runDiluents } from './dilutionDiluents';
import { dilutionRuns, runTags, type DilutionRun } from './dilutionRuns';
import { STOCK_FIELD, stockFor, WEIGHT_FIELD } from './dilutionStock';

export interface PrepSettings {
  roundTo: string;
}

const PREP_DEFAULTS: PrepSettings = { roundTo: '5' };

export const prepSettingsOf = (run: DilutionRun): PrepSettings => ({
  ...PREP_DEFAULTS,
  ...run.series.prep,
});

const ROUND_TO_LABEL = lowerLead(ROUND_TO.word);

export const SHARED_PREP_VALUES = {
  totalWellVolume: { term: TOTAL_WELL_VOLUME, unit: 'µL', isWholeExperimentToo: true },
  volumePerWell: { term: VOLUME_PER_WELL, unit: 'µL', isWholeExperimentToo: false },
  extra: { term: EXTRA, unit: '%', isWholeExperimentToo: true },
} as const;

export type SharedPrepKey = keyof typeof SHARED_PREP_VALUES;

export const SHARED_PREP_KEYS = Object.keys(SHARED_PREP_VALUES) as SharedPrepKey[];

export interface SharedPrepSource {
  entry: BoardName;
  isWholeExperiment: boolean;
}

export function sharedPrepSource(
  names: ReadonlyMap<string, BoardName>,
  subject: string,
  key: SharedPrepKey
): SharedPrepSource | undefined {
  const { term, isWholeExperimentToo } = SHARED_PREP_VALUES[key];
  const own = findTerm(names, term, [subject]);
  if (own) return { entry: own, isWholeExperiment: false };
  const general = isWholeExperimentToo ? findTerm(names, term, [WHOLE_EXPERIMENT]) : undefined;
  return general && { entry: general, isWholeExperiment: true };
}

export const ownPrepValueName = (subject: string, key: SharedPrepKey): string =>
  joinValueName(subject, SHARED_PREP_VALUES[key].term.word);

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

const prepRoundToId = (run: DilutionRun): string => `${run.key}:prep:roundTo`;

const MASS_CONCENTRATION = dimensionKey({ mass: 1, volume: -1 });

const dimensionOf = (unit: string) => dimensionKey(unitScale(unit)?.dimension ?? {});

function seriesName(protocol: Protocol, run: DilutionRun, field: 'top' | 'dilutionFactor'): string {
  const [first] = run.members;
  const plateMap = protocol.cards.find(card => card.id === first.plateId);
  const amount =
    plateMap?.type === 'plateMap'
      ? plateAmounts(plateMap).find(
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
  | { formula: (topVolume: string, topWorking: string) => string }
  | { problem: string };

function stockSource(
  protocol: Protocol,
  run: DilutionRun,
  names: ReadonlyMap<string, BoardName>
): StockSource {
  const seriesUnit = stepSeriesUnit(run.series);
  const isRatio = seriesUnit === RATIO_NOTATION;
  const reading = stockFor(protocol, run.subject, seriesUnit, isRatio);
  if (reading.kind === 'undiluted')
    return { formula: (volume, working) => `${volume} × ${working}` };
  if (reading.kind !== 'ready') return { problem: reading.issue };
  const material = materialNamed(protocol, run.subject);
  const stock = material && fieldNameOf(material, STOCK_FIELD);
  if (!material || !stock || !names.has(nameKey(stock))) {
    return {
      problem: `${reading.material}'s ${lowerLead(STOCK_CONCENTRATION.word)} isn't shown in Materials.`,
    };
  }
  const stockKind = dimensionOf(material.units[STOCK_FIELD] ?? '');
  const seriesKind = dimensionOf(seriesUnit);
  if (stockKind === seriesKind)
    return { formula: (volume, working) => `${volume} × ${working} ÷ ${stock}` };
  const weight = fieldNameOf(material, WEIGHT_FIELD);
  if (!weight || !names.has(nameKey(weight))) {
    return {
      problem: `${material.name.trim()}'s ${MOLECULAR_WEIGHT.word} isn't shown in Materials.`,
    };
  }
  return stockKind === MASS_CONCENTRATION
    ? { formula: (volume, working) => `${volume} × ${working} × ${weight} ÷ ${stock}` }
    : { formula: (volume, working) => `${volume} × ${working} ÷ (${stock} × ${weight})` };
}

function missingSharedValue(
  subject: string,
  volume: string | undefined,
  wellVolume: string | undefined
): CalculationGap | undefined {
  if (!volume) {
    const need = ownPrepValueName(subject, 'volumePerWell');
    return { problem: `Needs "${need}" in Values, the volume added to each well`, need };
  }
  if (wellVolume) return undefined;
  const need = TOTAL_WELL_VOLUME.word;
  return { problem: `Needs "${need}" in Values, the volume in each well`, need };
}

function runNames(
  protocol: Protocol,
  run: DilutionRun,
  tag: string,
  names: ReadonlyMap<string, BoardName>,
  dilutionsCardId: string | undefined
): BoardName[] {
  const subject = run.subject;
  const settings = prepSettingsOf(run);
  const named = (label: string) => `${subject} ${label}${tag}`;
  const shared = (key: SharedPrepKey) => sharedPrepSource(names, subject, key)?.entry.name;
  const line = (key: PrepLine) => named(PREP_LINES[key]);
  const volume = shared('volumePerWell');
  const wellVolume = shared('totalWellVolume');
  const extra = shared('extra');
  const roundTo = named(ROUND_TO_LABEL);
  const top = seriesName(protocol, run, 'top');
  const fold = seriesName(protocol, run, 'dilutionFactor');
  const busiest = named(lowerLead(REPLICATES.word));
  const pointCount = Math.max(...run.replicatesByPoint.keys()) + 1;
  const roundsTo = (readNumber(settings.roundTo) ?? 0) > 0 ? roundTo : '1 µL';
  const stock = stockSource(protocol, run, names);
  const hasStock = 'formula' in stock;

  const formulas: Record<PrepLine, string> = {
    strength: `${wellVolume} ÷ ${volume}`,
    needed: `${busiest} × ${volume}${extra ? ` × (1 + ${extra})` : ''}`,
    transfer: `round up(${line('needed')} ÷ (${fold} − 1), ${roundsTo})`,
    diluent: `${line('transfer')} × (${fold} − 1)`,
    topVolume: `${line('transfer')} + ${line('diluent')}`,
    topWorking: `${top} × ${line('strength')}`,
    stock: hasStock ? stock.formula(line('topVolume'), line('topWorking')) : '',
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
    settingsCardId: dilutionsCardId,
  };
  const inputs: BoardName[] = [
    {
      kind: 'value',
      id: prepRoundToId(run),
      name: roundTo,
      value: settings.roundTo,
      unit: 'µL',
      workedOut: group,
      originCardId: dilutionsCardId,
    },
    {
      kind: 'count',
      id: `${run.key}:prep:busiest`,
      name: busiest,
      count: Math.max(...run.replicatesByPoint.values()),
      workedOut: group,
      originCardId: run.members[0].plateId,
    },
  ];
  const takenName = [
    ...inputs.map(entry => entry.name),
    ...Object.keys(formulas).map(key => line(key as PrepLine)),
  ].find(name => names.has(nameKey(name)));
  const gap: CalculationGap | undefined = takenName
    ? { problem: `Rename "${takenName}": the ${subject} dilution prep needs that name.` }
    : missingSharedValue(subject, volume, wellVolume);
  const lines = (Object.keys(formulas) as PrepLine[])
    .filter(key => !names.has(nameKey(line(key))))
    .map(
      (key): BoardName => ({
        kind: 'calculation',
        id: prepLineId(run, key),
        name: line(key),
        formula: gap ? '' : formulas[key],
        unit: units[key] ?? '',
        workedOut: group,
        ...(INTERMEDIATE_LINES.has(key) && { isIntermediate: true }),
        ...(gap ?? (key === 'stock' && !hasStock && { problem: stock.problem })),
      })
    );
  return takenName ? lines : [...inputs, ...lines];
}

interface DiluentUse {
  name: string;
  totals: string[];
}

function diluentNeedNames(
  protocol: Protocol,
  uses: ReadonlyMap<string, DiluentUse>,
  names: ReadonlyMap<string, BoardName>,
  dilutionsCardId: string | undefined
): BoardName[] {
  return [...uses.values()].map(({ name, totals }) => {
    const shownName = materialNamed(protocol, name)?.name.trim() ?? name;
    const needName = `Total ${lowerLead(shownName)} needed`;
    return {
      kind: 'calculation',
      id: diluentNeedId(name),
      name: needName,
      formerName: `${shownName} needed for dilutions`,
      formula: totals.join(' + '),
      unit: '',
      workedOut: {
        key: diluentNeedId(name),
        subject: shownName,
        title: `${shownName} for dilutions`,
        settingsCardId: dilutionsCardId,
      },
      ...(names.has(nameKey(needName)) && {
        problem: `Rename "${needName}": the dilution prep needs that name.`,
      }),
    };
  });
}

export function dilutionCalculationNames(
  protocol: Protocol,
  taken: readonly BoardName[]
): BoardName[] {
  const names = new Map(taken.map(entry => [nameKey(entry.name), entry]));
  const dilutionsCardId = protocol.cards.find(card => card.type === 'dilutions')?.id;
  const runs = dilutionRuns(protocol);
  const tags = runTags(runs);
  const diluents = runDiluents(runs, protocol.diluent);
  const uses = new Map<string, DiluentUse>();
  const runEntries = runs.flatMap(run => {
    const tag = tags.get(run.key);
    if (tag === undefined) return [];
    const diluent = diluents.get(run.key);
    if (diluent) {
      const use = uses.get(normalizeMaterialKey(diluent)) ?? { name: diluent, totals: [] };
      use.totals.push(`${run.subject} ${PREP_LINES.diluentTotal}${tag}`);
      uses.set(normalizeMaterialKey(diluent), use);
    }
    return runNames(protocol, run, tag, names, dilutionsCardId);
  });
  return [...runEntries, ...diluentNeedNames(protocol, uses, names, dilutionsCardId)];
}
