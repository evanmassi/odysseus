import {
  colorLineOf,
  isFilledCell,
  lineValueOf,
  unitScale,
  type MaterialItem,
  type PlateLine,
  type VesselMapBlock,
  normalizeMaterialKey,
} from '@odysseus/shared-schemas';

import { cachedPerBlock } from '../blocks/cachedPerBlock';
import {
  DILUTION_FACTOR_NOTATION,
  dimensionKey,
  PAIR_NOTATION,
  RATIO_NOTATION,
  readNumber,
} from '../formulas/quantities';
import { nameWithoutNotes, shortNameOf } from '../materials/materialLookup';
import {
  CELLS_PER_WELL,
  DILUTION_FACTOR,
  FINAL_CONCENTRATION,
  MASS_PER_WELL,
  perVessel,
  POINTS,
  TOP_AMOUNT,
  TOP_CONCENTRATION,
  TOP_DILUTION,
  VOLUME_PER_WELL,
  type Term,
} from '../terms/termList';
import { readTypedAmount } from '../units/textAmounts';
import { lowerLead, upperLead } from '../values/valueNames';

import { foldOf, stepSeriesUnit } from './plateSeries';
import {
  VESSEL_PLURALS,
  vesselOf,
  vesselTypeAt,
  wordsForTypes,
  type VesselType,
} from './vesselCatalog';
import { plateNameOf } from './vesselTabs';

type LineValue = PlateLine['values'][number];

export interface VesselCount {
  name: string;
  label: string;
  subject: string;
  count: number;
  tally: number;
  key: string;
  kind: 'value' | 'used' | 'total';
}

export type PlateAmountSource =
  | { kind: 'wells'; lineId: string; keys: string[] }
  | { kind: 'series'; seriesId: string; field: 'start' | 'fold' }
  | { kind: 'points'; seriesId: string };

export interface PlateAmount {
  key: string;
  name: string;
  label: string;
  automaticName: string;
  subject: string;
  variant: string;
  value: string;
  unit: string;
  source: PlateAmountSource;
}

function labelFromName(name: string, subject: string, variant: string): string {
  let rest = name.trim();
  if (rest.toLowerCase().startsWith(`${subject.toLowerCase()} `)) {
    rest = rest.slice(subject.length + 1);
  }
  if (variant && rest.toLowerCase().endsWith(` ${variant.toLowerCase()}`)) {
    rest = rest.slice(0, -(variant.length + 1));
  }
  return upperLead(rest);
}

const CONCENTRATION_DIMENSIONS = new Set(
  [
    { mass: 1, volume: -1 },
    { amount: 1, volume: -1 },
    { count: 1, volume: -1 },
  ].map(dimensionKey)
);
const PER_VESSEL_TERMS = new Map([
  [dimensionKey({ volume: 1 }), VOLUME_PER_WELL],
  [dimensionKey({ count: 1 }), CELLS_PER_WELL],
  [dimensionKey({ mass: 1 }), MASS_PER_WELL],
]);

const STARTS_WITH_NUMBER = /^\s*[-+]?\.?\d/;

export const seriesTopTerm = (notation: string, unit: string): Term =>
  notation === RATIO_NOTATION
    ? TOP_DILUTION
    : CONCENTRATION_DIMENSIONS.has(dimensionKey(unitScale(unit)?.dimension ?? {}))
      ? TOP_CONCENTRATION
      : TOP_AMOUNT;
const typedCount = (block: VesselMapBlock, key: string) => readNumber(block.counts[key] ?? '');

const keysHolding = (block: VesselMapBlock, line: PlateLine, value: LineValue) =>
  Object.keys(block.cells).filter(key => block.cells[key][line.id]?.valueId === value.id);

const allVesselTypes = (block: VesselMapBlock): VesselType[] => [
  ...block.plates.map(candidate => candidate.vessel),
  ...block.sets.map(set => set.vessel),
];

function valueCounts(block: VesselMapBlock): VesselCount[] {
  const line = colorLineOf(block);
  if (!line) return [];
  return line.values.flatMap(value => {
    const keys = keysHolding(block, line, value);
    const text = value.text.trim();
    if (!keys.length || !text) return [];
    const { plural } = wordsForTypes(keys.map(key => vesselTypeAt(block, key)));
    return [
      {
        name: `${text} ${plural}`,
        label: upperLead(plural),
        subject: text,
        count: typedCount(block, value.id) ?? keys.length,
        tally: keys.length,
        key: value.id,
        kind: 'value' as const,
      },
    ];
  });
}

function countVessels(block: VesselMapBlock): VesselCount[] {
  const usedKeys = Object.keys(block.cells).filter(key =>
    Object.values(block.cells[key]).some(isFilledCell)
  );
  const nouns = [...new Set(allVesselTypes(block).map(type => vesselOf(type).noun))];
  const used = (nouns.length > 1 ? nouns : [undefined]).map((noun): VesselCount => {
    const keys = noun
      ? usedKeys.filter(key => vesselOf(vesselTypeAt(block, key)).noun === noun)
      : usedKeys;
    const name = `${upperLead(noun ? VESSEL_PLURALS[noun] : wordsForTypes(allVesselTypes(block)).plural)} used`;
    const key = noun ? `used:${noun}` : 'used';
    return {
      name,
      label: name,
      subject: '',
      count: typedCount(block, key) ?? keys.length,
      tally: keys.length,
      key,
      kind: 'used',
    };
  });
  const plateTotals = [...new Set(block.plates.map(candidate => candidate.vessel))].map(
    (type): VesselCount => {
      const count = block.plates.filter(candidate => candidate.vessel === type).length;
      const name = `${vesselOf(type).label}s`;
      return {
        name,
        label: name,
        subject: '',
        count,
        tally: count,
        key: `count:${type}`,
        kind: 'total',
      };
    }
  );
  const setTotals = [...new Set(block.sets.map(set => set.vessel))].map((type): VesselCount => {
    const vessel = vesselOf(type);
    const count = block.sets
      .filter(set => set.vessel === type)
      .reduce((sum, set) => sum + set.count, 0);
    const name = `${vessel.label.replace(/ (flask|dish|tube)$/, '')} ${VESSEL_PLURALS[vessel.noun]}`;
    return {
      name,
      label: name,
      subject: '',
      count,
      tally: count,
      key: `count:${type}`,
      kind: 'total',
    };
  });
  return [...valueCounts(block), ...used, ...plateTotals, ...setTotals];
}

function amountNoun(unit: string, vesselNoun: string): string {
  if (unit === PAIR_NOTATION) return 'ratio';
  const key = dimensionKey(unitScale(unit)?.dimension ?? {});
  if (CONCENTRATION_DIMENSIONS.has(key)) return lowerLead(FINAL_CONCENTRATION.word);
  const term = PER_VESSEL_TERMS.get(key);
  return term ? lowerLead(perVessel(term, vesselNoun).word) : 'amount';
}

interface PlainCell {
  key: string;
  amount: string;
  unit: string;
}

const isSameAmount = (cells: PlainCell[]) =>
  new Set(cells.map(cell => `${cell.amount}|${cell.unit}`)).size === 1;

function amountsOnPlate(block: VesselMapBlock): PlateAmount[] {
  const amounts: PlateAmount[] = [];
  const add = (amount: Omit<PlateAmount, 'name'>) => {
    const typedName = block.amountNames[amount.key]?.trim();
    amounts.push({
      ...amount,
      name: typedName || amount.automaticName,
      label: typedName ? labelFromName(typedName, amount.subject, amount.variant) : amount.label,
    });
  };
  const colorLine = colorLineOf(block);
  const colorValueAt = (key: string) =>
    colorLine ? lineValueOf(colorLine, block.cells[key]?.[colorLine.id]) : undefined;
  const soleValueOn = (other: PlateLine, keys: string[]) => {
    const values = new Set(keys.map(key => lineValueOf(other, block.cells[key]?.[other.id])));
    return values.size === 1 ? [...values][0] : undefined;
  };
  const solePlate = (keys: string[]) => {
    const plateIds = new Set(keys.map(key => key.split(':')[0]));
    return plateIds.size === 1 ? block.plates.find(plate => plateIds.has(plate.id)) : undefined;
  };

  for (const line of block.lines) {
    const plain = new Map<string, { subject: string; noun: string; cells: PlainCell[] }>();
    const runs = new Map<string, { subject: string; keys: string[]; steps: Set<number> }>();
    for (const [key, lines] of Object.entries(block.cells)) {
      const cell = lines[line.id];
      const subject = lineValueOf(line, cell)?.text.trim() ?? '';
      if (!cell || !subject) continue;
      if (cell.seriesId !== undefined) {
        const run = runs.get(cell.seriesId) ?? { subject, keys: [], steps: new Set<number>() };
        runs.set(cell.seriesId, run);
        run.keys.push(key);
        run.steps.add(cell.seriesStep ?? 0);
      } else if ((cell.amount ?? '').trim()) {
        const unit = cell.unit ?? '';
        const noun = amountNoun(unit, vesselOf(vesselTypeAt(block, key)).noun);
        const groupKey = `${normalizeMaterialKey(subject)}-${normalizeMaterialKey(noun)}`;
        const entry = plain.get(groupKey) ?? { subject, noun, cells: [] };
        plain.set(groupKey, entry);
        entry.cells.push({ key, amount: (cell.amount ?? '').trim(), unit });
      }
    }

    for (const [groupKey, { subject, noun, cells }] of plain) {
      const base = `a:${line.id}:${groupKey}`;
      const fromWells = (inWells: PlainCell[]) => ({
        subject,
        label: upperLead(noun),
        value: inWells[0].amount,
        unit: inWells[0].unit,
        source: { kind: 'wells' as const, lineId: line.id, keys: inWells.map(cell => cell.key) },
      });
      if (isSameAmount(cells)) {
        add({ key: base, automaticName: `${subject} ${noun}`, variant: '', ...fromWells(cells) });
        continue;
      }
      for (const value of colorLine?.values ?? []) {
        const inValue = cells.filter(cell => colorValueAt(cell.key) === value);
        if (inValue.length && isSameAmount(inValue)) {
          add({
            key: `${base}:${value.id}`,
            automaticName: `${subject} ${noun} in ${value.text.trim()}`,
            variant: `in ${value.text.trim()}`,
            ...fromWells(inValue),
          });
        }
      }
    }

    const dilutionRuns = [...runs.entries()].flatMap(([seriesId, run]) => {
      const series = block.series[seriesId];
      return series && 'start' in series ? [{ seriesId, series, ...run }] : [];
    });
    for (const run of dilutionRuns) {
      const { seriesId, series, subject, steps } = run;
      const twins = dilutionRuns.filter(
        other => normalizeMaterialKey(other.subject) === normalizeMaterialKey(subject)
      );
      const isApart = (marks: readonly unknown[]) =>
        marks.every(Boolean) && new Set(marks).size === twins.length;
      const twinValues = [colorLine, ...block.lines]
        .filter((other): other is PlateLine => !!other && other.id !== line.id)
        .map(other => twins.map(twin => soleValueOn(other, twin.keys)))
        .find(isApart);
      const twinPlates = twins.map(twin => solePlate(twin.keys));
      const index = twins.indexOf(run);
      const value = twinValues?.[index];
      const plate = twinPlates[index];
      const tag =
        twins.length < 2
          ? ''
          : value
            ? ` in ${value.text.trim()}`
            : plate && isApart(twinPlates)
              ? ` on ${plateNameOf(block, plate)}`
              : ` ${index + 1}`;
      const top = seriesTopTerm(series.unit, stepSeriesUnit(series));
      const shared = { subject, variant: tag.trim() };
      if (STARTS_WITH_NUMBER.test(series.start)) {
        add({
          key: `s:${seriesId}:start`,
          automaticName: `${subject} ${lowerLead(top.word)}${tag}`,
          label: top.word,
          ...shared,
          value: readTypedAmount(series.start)?.value ?? series.start.trim(),
          unit: stepSeriesUnit(series),
          source: { kind: 'series', seriesId, field: 'start' },
        });
      }
      if (STARTS_WITH_NUMBER.test(series.fold)) {
        add({
          key: `s:${seriesId}:fold`,
          automaticName: `${subject} ${lowerLead(DILUTION_FACTOR.word)}${tag}`,
          label: DILUTION_FACTOR.word,
          ...shared,
          value: String(foldOf(series.fold)),
          unit: DILUTION_FACTOR_NOTATION,
          source: { kind: 'series', seriesId, field: 'fold' },
        });
      }
      add({
        key: `s:${seriesId}:points`,
        automaticName: `${subject} ${lowerLead(POINTS.word)}${tag}`,
        label: POINTS.word,
        ...shared,
        value: String(steps.size),
        unit: '',
        source: { kind: 'points', seriesId },
      });
    }
  }
  return amounts;
}

export const vesselCounts: (block: VesselMapBlock) => readonly VesselCount[] =
  cachedPerBlock(countVessels);

export const plateAmounts: (block: VesselMapBlock) => readonly PlateAmount[] =
  cachedPerBlock(amountsOnPlate);

const wellTexts = cachedPerBlock((block: VesselMapBlock): string[] =>
  Object.values(block.cells).map(lines =>
    block.lines
      .map(line => lineValueOf(line, lines[line.id])?.text ?? '')
      .join(' | ')
      .toLowerCase()
  )
);

function mentionPattern(name: string): RegExp {
  const escaped = name
    .trim()
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`);
}

export function materialWellCounts(
  blocks: readonly VesselMapBlock[],
  materials: readonly MaterialItem[]
): Map<MaterialItem, number> {
  const counts = new Map<MaterialItem, number>();
  const patterns = materials.map(material => ({
    material,
    names: [
      material.name,
      nameWithoutNotes(material.name),
      shortNameOf(material),
      ...(material.sources?.rows.map(source => source.name) ?? []),
    ]
      .filter(Boolean)
      .map(mentionPattern),
  }));
  for (const block of blocks) {
    for (const text of wellTexts(block)) {
      for (const { material, names } of patterns) {
        if (names.some(name => name.test(text))) {
          counts.set(material, (counts.get(material) ?? 0) + 1);
        }
      }
    }
  }
  return counts;
}
