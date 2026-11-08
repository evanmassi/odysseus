import {
  colorLineOf,
  isFilledCell,
  lineValueOf,
  unitScale,
  type MaterialItem,
  type PlateLine,
  type VesselMapBlock,
} from '@odysseus/shared-schemas';

import { dimensionKey, PAIR_NOTATION, RATIO_NOTATION, readNumber } from '../formulas/quantities';
import { normalizeMaterialKey } from '../materials/materialGuesser';

import {
  VESSEL_PLURALS,
  vesselOf,
  vesselTypeAt,
  wordsForTypes,
  type VesselType,
} from './vesselCatalog';

type LineValue = PlateLine['values'][number];

interface VesselCount {
  name: string;
  count: number;
  key: string;
}

interface PlateAmount {
  key: string;
  name: string;
  subject: string;
  value: string;
  unit: string;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const CONCENTRATION_DIMENSIONS = new Set(
  [
    { mass: 1, volume: -1 },
    { amount: 1, volume: -1 },
    { count: 1, volume: -1 },
  ].map(dimensionKey)
);
const PER_VESSEL_WORDS = new Map([
  [dimensionKey({ volume: 1 }), 'volume per'],
  [dimensionKey({ count: 1 }), 'per'],
  [dimensionKey({ mass: 1 }), 'per'],
]);

const STARTS_WITH_NUMBER = /^\s*[-+]?\.?\d/;
const NUMBER_IN_TEXT = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/;
const RATIO_IN_TEXT = /1\s*:\s*(\d+(?:\.\d+)?)/;

function foldOf(text: string): number {
  const ratio = RATIO_IN_TEXT.exec(text);
  if (ratio) return parseFloat(ratio[1]);
  const number = NUMBER_IN_TEXT.exec(text);
  return number ? parseFloat(number[0]) : NaN;
}

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
        count: typedCount(block, value.id) ?? keys.length,
        key: value.id,
      },
    ];
  });
}

export function vesselCounts(block: VesselMapBlock): VesselCount[] {
  const usedKeys = Object.keys(block.cells).filter(key =>
    Object.values(block.cells[key]).some(isFilledCell)
  );
  const used: VesselCount = {
    name: `${capitalize(wordsForTypes(allVesselTypes(block)).plural)} used`,
    count: typedCount(block, 'used') ?? usedKeys.length,
    key: 'used',
  };
  const plateTotals = [...new Set(block.plates.map(candidate => candidate.vessel))].map(
    (type): VesselCount => ({
      name: `${vesselOf(type).label}s`,
      count: block.plates.filter(candidate => candidate.vessel === type).length,
      key: `count:${type}`,
    })
  );
  const setTotals = [...new Set(block.sets.map(set => set.vessel))].map((type): VesselCount => {
    const vessel = vesselOf(type);
    return {
      name: `${vessel.label.replace(/ (flask|dish|tube)$/, '')} ${VESSEL_PLURALS[vessel.noun]}`,
      count: block.sets.filter(set => set.vessel === type).reduce((sum, set) => sum + set.count, 0),
      key: `count:${type}`,
    };
  });
  return [...valueCounts(block), used, ...plateTotals, ...setTotals];
}

function amountNoun(unit: string, vesselNoun: string): string {
  if (unit === PAIR_NOTATION) return 'ratio';
  const key = dimensionKey(unitScale(unit)?.dimension ?? {});
  if (CONCENTRATION_DIMENSIONS.has(key)) return 'concentration';
  const perVessel = PER_VESSEL_WORDS.get(key);
  return perVessel ? `${perVessel} ${vesselNoun}` : 'amount';
}

interface PlainCell {
  key: string;
  amount: string;
  unit: string;
}

const isSameAmount = (cells: PlainCell[]) =>
  new Set(cells.map(cell => `${cell.amount}|${cell.unit}`)).size === 1;

export function plateAmounts(block: VesselMapBlock): PlateAmount[] {
  const amounts: PlateAmount[] = [];
  const add = (key: string, automaticName: string, subject: string, value: string, unit: string) =>
    amounts.push({
      key,
      name: block.amountNames[key]?.trim() || automaticName,
      subject,
      value,
      unit,
    });
  const colorLine = colorLineOf(block);
  const colorValueAt = (key: string) =>
    colorLine ? lineValueOf(colorLine, block.cells[key]?.[colorLine.id]) : undefined;
  const soleColorValue = (keys: string[]) => {
    const values = new Set(keys.map(colorValueAt));
    return values.size === 1 ? [...values][0] : undefined;
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
      if (isSameAmount(cells)) {
        add(base, `${subject} ${noun}`, subject, cells[0].amount, cells[0].unit);
        continue;
      }
      for (const value of colorLine?.values ?? []) {
        const inValue = cells.filter(cell => colorValueAt(cell.key) === value);
        if (inValue.length && isSameAmount(inValue)) {
          add(
            `${base}:${value.id}`,
            `${subject} ${noun} in ${value.text.trim()}`,
            subject,
            inValue[0].amount,
            inValue[0].unit
          );
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
      const twinValues = twins.map(twin => soleColorValue(twin.keys));
      const index = twins.indexOf(run);
      const value = twinValues[index];
      const tellsTwinsApart =
        twinValues.every(Boolean) && new Set(twinValues).size === twins.length;
      const tag =
        twins.length < 2
          ? ''
          : value && tellsTwinsApart
            ? ` in ${value.text.trim()}`
            : ` ${index + 1}`;
      const startWord = series.unit === RATIO_NOTATION ? 'dilution' : 'dose';
      if (STARTS_WITH_NUMBER.test(series.start)) {
        add(
          `s:${seriesId}:start`,
          `${subject} top ${startWord}${tag}`,
          subject,
          series.start.trim(),
          series.unit
        );
      }
      if (STARTS_WITH_NUMBER.test(series.fold)) {
        add(
          `s:${seriesId}:fold`,
          `${subject} fold${tag}`,
          subject,
          String(foldOf(series.fold)),
          'X'
        );
      }
      add(`s:${seriesId}:points`, `${subject} points${tag}`, subject, String(steps.size), '');
    }
  }
  return amounts;
}

function mentions(text: string, name: string): boolean {
  const escaped = name
    .trim()
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text);
}

export function materialWellCounts(
  blocks: readonly VesselMapBlock[],
  materials: readonly MaterialItem[]
): Map<MaterialItem, number> {
  const counts = new Map<MaterialItem, number>();
  for (const block of blocks) {
    for (const lines of Object.values(block.cells)) {
      const text = block.lines
        .map(line => lineValueOf(line, lines[line.id])?.text ?? '')
        .join(' | ')
        .toLowerCase();
      for (const material of materials) {
        if (mentions(text, material.name)) counts.set(material, (counts.get(material) ?? 0) + 1);
      }
    }
  }
  return counts;
}
