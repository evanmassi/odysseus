import { nameKey, type BoardName, type WorkedOutGroup } from '../formulas/boardCalculation';
import { displayValue, formatNumber, readNumber } from '../formulas/quantities';
import { joinValueName } from '../values/valueNames';

import { CELL_COUNT_FIELDS, CELL_TYPES, type CellCount } from './materialCatalog';
import { listedMaterials, nameWithoutNotes } from './materialLookup';
import { platedCells } from './platedCells';

import type { MaterialItem, MaterialSource, Protocol } from '@odysseus/shared-schemas';

type Operation = '×' | '÷';

interface CountRule {
  target: CellCount;
  from: readonly [CellCount, CellCount];
  operation: Operation;
}

export interface CountReading {
  value: number;
  isTyped: boolean;
  rule: CountRule | undefined;
}

export interface SolvedCounts {
  readings: ReadonlyMap<CellCount, CountReading>;
  clashes: ReadonlyMap<CellCount, string>;
}

export interface CountSubject {
  owner: string;
  subject: string;
  material: MaterialItem;
  source: MaterialSource | undefined;
  isPlated: boolean;
}

export const CELLS_TO_PREPARE = 'Cells to prepare';
export const CELL_COUNTS = Object.keys(CELL_COUNT_FIELDS) as CellCount[];
const PERCENT = 100;
const CLASH_TOLERANCE = 0.02;

const rule = (target: CellCount, a: CellCount, operation: Operation, b: CellCount): CountRule => ({
  target,
  from: [a, b],
  operation,
});

const RULES: readonly CountRule[] = [
  rule('liveConcentration', 'totalConcentration', '×', 'viability'),
  rule('totalConcentration', 'liveConcentration', '÷', 'viability'),
  rule('viability', 'liveConcentration', '÷', 'totalConcentration'),
  rule('liveCells', 'liveConcentration', '×', 'volume'),
  rule('liveConcentration', 'liveCells', '÷', 'volume'),
  rule('volume', 'liveCells', '÷', 'liveConcentration'),
  rule('totalCells', 'totalConcentration', '×', 'volume'),
  rule('totalConcentration', 'totalCells', '÷', 'volume'),
  rule('volume', 'totalCells', '÷', 'totalConcentration'),
  rule('liveCells', 'totalCells', '×', 'viability'),
  rule('totalCells', 'liveCells', '÷', 'viability'),
  rule('viability', 'liveCells', '÷', 'totalCells'),
];

const scaleOf = (count: CellCount) => (count === 'viability' ? PERCENT : 1);
const labelOf = (count: CellCount) => CELL_COUNT_FIELDS[count].label;
const apply = (operation: Operation, a: number, b: number) => (operation === '×' ? a * b : a / b);

export const countNumberText = (count: CellCount, value: number): string =>
  formatNumber(value * scaleOf(count));

export const countText = (count: CellCount, value: number): string =>
  displayValue(countNumberText(count, value), CELL_COUNT_FIELDS[count].unit);

export function solveCounts(values: Readonly<Record<string, string>>): SolvedCounts {
  const readings = new Map<CellCount, CountReading>();
  for (const count of CELL_COUNTS) {
    const typed = readNumber(values[CELL_COUNT_FIELDS[count].key] ?? '');
    if (typed !== undefined) {
      readings.set(count, { value: typed / scaleOf(count), isTyped: true, rule: undefined });
    }
  }
  const clashes = new Map<CellCount, string>();
  for (const { target, from, operation } of RULES) {
    const [a, b] = from.map(count => readings.get(count));
    const typed = readings.get(target);
    if (operation !== '×' || !typed?.isTyped || !a?.isTyped || !b?.isTyped) continue;
    const expected = apply(operation, a.value, b.value);
    if (Math.abs(expected - typed.value) <= CLASH_TOLERANCE * Math.abs(typed.value)) continue;
    clashes.set(
      target,
      `${labelOf(target)} ≠ ${labelOf(from[0])} × ${labelOf(from[1])}, which gives ${countText(target, expected)}`
    );
  }
  let isGrowing = true;
  while (isGrowing) {
    isGrowing = false;
    for (const each of RULES) {
      const [a, b] = each.from.map(count => readings.get(count));
      if (readings.has(each.target) || !a || !b || (each.operation === '÷' && !b.value)) continue;
      readings.set(each.target, {
        value: apply(each.operation, a.value, b.value),
        isTyped: false,
        rule: each,
      });
      isGrowing = true;
    }
  }
  return { readings, clashes };
}

export function countWorking(solved: SolvedCounts, count: CellCount): string {
  const reading = solved.readings.get(count);
  if (!reading?.rule) return '';
  const { from, operation } = reading.rule;
  const [a, b] = from.map(each => {
    const input = solved.readings.get(each);
    return input ? countText(each, input.value) : '';
  });
  return `${labelOf(from[0])} ${operation} ${labelOf(from[1])} = ${a} ${operation} ${b}`;
}

export interface WorkedCount {
  text: string;
  working: string;
}

export function workedCountsByKey(
  values: Readonly<Record<string, string>>
): ReadonlyMap<string, WorkedCount> {
  const solved = solveCounts(values);
  return new Map(
    CELL_COUNTS.flatMap(count => {
      const reading = solved.readings.get(count);
      return reading?.rule
        ? [
            [
              CELL_COUNT_FIELDS[count].key,
              { text: countNumberText(count, reading.value), working: countWorking(solved, count) },
            ] as const,
          ]
        : [];
    })
  );
}

export const countValues = (subject: CountSubject): Readonly<Record<string, string>> =>
  subject.source?.values ?? subject.material.values;

export const countId = (subject: CountSubject, count: CellCount): string =>
  `${subject.source?.id ?? subject.material.id}:${CELL_COUNT_FIELDS[count].key}`;

export const countName = (subject: CountSubject, count: CellCount): string =>
  joinValueName(subject.owner, labelOf(count));

export const cellPartId = (subject: string, part: string): string =>
  `cells:${nameKey(subject)}:${part}`;

export function countSubjects(protocol: Pick<Protocol, 'blocks'>): CountSubject[] {
  const plated = platedCells(protocol);
  const platedSubjects = new Set(plated.map(entry => nameKey(entry.subject)));
  const platedMaterials = new Set(plated.map(entry => entry.material.id));
  return listedMaterials(protocol)
    .filter(
      material =>
        !material.isDropped &&
        material.name.trim() &&
        (CELL_TYPES.includes(material.type) || platedMaterials.has(material.id))
    )
    .flatMap(material => {
      const donors = (material.sources?.rows ?? []).filter(source => source.name.trim());
      const subjects = donors.length
        ? donors.map(source => ({
            owner: source.name.trim(),
            subject: source.name.trim(),
            source,
          }))
        : [
            {
              owner: material.name.trim(),
              subject: nameWithoutNotes(material.name),
              source: undefined,
            },
          ];
      return subjects.map(each => ({
        ...each,
        material,
        isPlated: platedSubjects.has(nameKey(each.subject)),
      }));
    });
}

export function cellCountNames(
  subjects: readonly CountSubject[],
  taken: readonly BoardName[],
  materialsBlockId: string | undefined
): BoardName[] {
  const takenKeys = new Set(taken.map(entry => nameKey(entry.name)));
  return subjects.flatMap(subject => {
    const values = countValues(subject);
    const { readings } = solveCounts(values);
    const workedOut: WorkedOutGroup | undefined = subject.isPlated
      ? {
          key: cellPartId(subject.subject, 'group'),
          subject: subject.subject,
          title: CELLS_TO_PREPARE,
          settingsBlockId: materialsBlockId,
        }
      : undefined;
    return CELL_COUNTS.flatMap((count): BoardName[] => {
      const reading = readings.get(count);
      const name = countName(subject, count);
      if (!reading || takenKeys.has(nameKey(name))) return [];
      const id = countId(subject, count);
      const { key, unit } = CELL_COUNT_FIELDS[count];
      if (!reading.rule) return [{ kind: 'value', id, name, value: values[key] ?? '', unit }];
      const [a, b] = reading.rule.from.map(each => countName(subject, each));
      return [
        {
          kind: 'calculation',
          id,
          name,
          expr: `${a} ${reading.rule.operation} ${b}`,
          unit,
          isIntermediate: true,
          ...(workedOut && { workedOut }),
        },
      ];
    });
  });
}
