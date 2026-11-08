import { unitScale, type MaterialItem, type VesselMapBlock } from '@odysseus/shared-schemas';

import { dimensionKey, PAIR_NOTATION, RATIO_NOTATION, readNumber } from '../formulas/quantities';
import { normalizeMaterialKey } from '../materials/materialGuesser';

import {
  VESSEL_PLURALS,
  vesselOf,
  vesselTypeAt,
  wordsForTypes,
  type VesselType,
} from './vesselCatalog';

type PaintGroup = VesselMapBlock['groups'][number];
type PlateLine = VesselMapBlock['lines'][number];

interface VesselCount {
  name: string;
  count: number;
  key: string;
  kind: 'group' | 'used' | 'total';
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

const lineValueText = (line: PlateLine, valueId: string | undefined) =>
  valueId ? (line.values.find(value => value.id === valueId)?.text ?? '') : '';

const keysPaintedWith = (block: VesselMapBlock, group: PaintGroup) =>
  Object.keys(block.wells).filter(key => block.wells[key] === group.id);

function sharedLeadingWords(texts: string[]): string {
  const words = texts.map(text => text.split(/\s+/));
  const common: string[] = [];
  for (
    let index = 0;
    index < words[0].length && words.every(list => list[index] === words[0][index]);
    index++
  ) {
    common.push(words[0][index]);
  }
  return common.join(' ').replace(/[\s+,;:·-]+$/, '');
}

function groupName(block: VesselMapBlock, group: PaintGroup): string {
  if (group.label.trim()) return group.label.trim();
  const keys = keysPaintedWith(block, group);
  const named = block.lines
    .map(line => {
      const texts = [
        ...new Set(
          keys
            .map(key => lineValueText(line, block.cells[key]?.[line.id]?.valueId).trim())
            .filter(Boolean)
        ),
      ];
      return texts.length ? sharedLeadingWords(texts) : '';
    })
    .filter(Boolean);
  return named.join(' and ') || `Color ${block.groups.indexOf(group) + 1}`;
}

const allVesselTypes = (block: VesselMapBlock): VesselType[] => [
  ...block.plates.map(candidate => candidate.vessel),
  ...block.sets.map(set => set.vessel),
];

export function vesselCounts(block: VesselMapBlock): VesselCount[] {
  const paintedCount = (group: PaintGroup) => keysPaintedWith(block, group).length;
  const usedKeys = new Set([
    ...Object.keys(block.wells),
    ...Object.keys(block.cells).filter(key => Object.keys(block.cells[key]).length),
  ]);
  const groups = block.groups.map(
    (group): VesselCount => ({
      name: `${groupName(block, group)} ${wordsForTypes(keysPaintedWith(block, group).map(key => vesselTypeAt(block, key))).plural}`,
      count: typedCount(block, group.id) ?? paintedCount(group),
      key: group.id,
      kind: 'group',
    })
  );
  const used: VesselCount = {
    name: `${capitalize(wordsForTypes(allVesselTypes(block)).plural)} used`,
    count: typedCount(block, 'used') ?? usedKeys.size,
    key: 'used',
    kind: 'used',
  };
  const plateTotals = [...new Set(block.plates.map(candidate => candidate.vessel))].map(
    (type): VesselCount => ({
      name: `${vesselOf(type).label}s`,
      count: block.plates.filter(candidate => candidate.vessel === type).length,
      key: `count:${type}`,
      kind: 'total',
    })
  );
  const setTotals = [...new Set(block.sets.map(set => set.vessel))].map((type): VesselCount => {
    const vessel = vesselOf(type);
    return {
      name: `${vessel.label.replace(/ (flask|dish|tube)$/, '')} ${VESSEL_PLURALS[vessel.noun]}`,
      count: block.sets.filter(set => set.vessel === type).reduce((sum, set) => sum + set.count, 0),
      key: `count:${type}`,
      kind: 'total',
    };
  });
  return [...groups, used, ...plateTotals, ...setTotals];
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

  for (const line of block.lines) {
    const plain = new Map<string, { subject: string; noun: string; cells: PlainCell[] }>();
    const runs = new Map<string, { subject: string; keys: string[]; steps: Set<number> }>();
    for (const [key, lines] of Object.entries(block.cells)) {
      const cell = lines[line.id];
      const subject = cell ? lineValueText(line, cell.valueId).trim() : '';
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
      for (const group of block.groups) {
        const inGroup = cells.filter(cell => block.wells[cell.key] === group.id);
        if (inGroup.length && isSameAmount(inGroup)) {
          add(
            `${base}:${group.id}`,
            `${subject} ${noun} in ${groupName(block, group)}`,
            subject,
            inGroup[0].amount,
            inGroup[0].unit
          );
        }
      }
    }

    const dilutionRuns = [...runs.entries()].flatMap(([seriesId, run]) => {
      const series = block.series[seriesId];
      return series && 'start' in series ? [{ seriesId, series, ...run }] : [];
    });
    for (const { seriesId, series, subject, keys, steps } of dilutionRuns) {
      const twins = dilutionRuns.filter(
        other => normalizeMaterialKey(other.subject) === normalizeMaterialKey(subject)
      );
      const colors = new Set(keys.map(key => block.wells[key]));
      const color =
        colors.size === 1 ? block.groups.find(group => group.id === [...colors][0]) : undefined;
      const tag =
        twins.length < 2
          ? ''
          : color
            ? ` in ${groupName(block, color)}`
            : ` ${twins.findIndex(other => other.seriesId === seriesId) + 1}`;
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
    for (const key of new Set([...Object.keys(block.wells), ...Object.keys(block.cells)])) {
      const group = block.groups.find(candidate => candidate.id === block.wells[key]);
      const lineTexts = Object.entries(block.cells[key] ?? {}).map(([lineId, cell]) => {
        const line = block.lines.find(candidate => candidate.id === lineId);
        return line ? lineValueText(line, cell.valueId) : '';
      });
      const text = [group?.label ?? '', ...lineTexts].join(' | ').toLowerCase();
      for (const material of materials) {
        if (mentions(text, material.name)) counts.set(material, (counts.get(material) ?? 0) + 1);
      }
    }
  }
  return counts;
}
