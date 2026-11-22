import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { displayNameOf, findMaterial } from '../materials/materialLookup';
import { WHOLE_EXPERIMENT } from '../values/valueNames';

import { type CalculationName, type SolvedBoard, type WorkedOutGroup } from './boardCalculation';
import { calculationMaterial, nameWithinOwner } from './formulaScopes';

import type { CalculationsCard, MaterialItem } from '@odysseus/shared-schemas';

export interface WorkedOutView {
  group: WorkedOutGroup;
  lines: CalculationName[];
}

export interface CalculationSection {
  key: string;
  material: MaterialItem | undefined;
  owner: string;
  title: string;
  items: CalculationsCard['items'];
  groups: WorkedOutView[];
}

export function sectionKeyOf(
  name: string,
  workedOut: WorkedOutGroup | undefined,
  materials: readonly MaterialItem[]
): string {
  if (!workedOut) return calculationMaterial(name, materials)?.id ?? WHOLE_EXPERIMENT;
  return (
    findMaterial(materials, workedOut.subject)?.id ??
    `subject:${normalizeMaterialKey(workedOut.subject)}`
  );
}

export function calculationSections(
  card: CalculationsCard,
  materials: readonly MaterialItem[],
  board: SolvedBoard,
  showsWorkedOut: boolean,
  generalTitle: string
): CalculationSection[] {
  const sections = new Map<string, CalculationSection>([
    [
      WHOLE_EXPERIMENT,
      {
        key: WHOLE_EXPERIMENT,
        material: undefined,
        owner: '',
        title: generalTitle,
        items: [],
        groups: [],
      },
    ],
    ...materials.map((material): [string, CalculationSection] => [
      material.id,
      {
        key: material.id,
        material,
        owner: material.name.trim(),
        title: displayNameOf(material),
        items: [],
        groups: [],
      },
    ]),
  ]);
  for (const item of card.items) {
    sections.get(sectionKeyOf(item.name, undefined, materials))?.items.push(item);
  }
  const worked = showsWorkedOut
    ? [...board.names.values()].filter(
        (entry): entry is CalculationName & { workedOut: WorkedOutGroup } =>
          entry.kind === 'calculation' && !!entry.workedOut
      )
    : [];
  for (const line of worked) {
    const key = sectionKeyOf(line.name, line.workedOut, materials);
    const section = sections.get(key) ?? {
      key,
      material: undefined,
      owner: line.workedOut.subject,
      title: line.workedOut.subject,
      items: [],
      groups: [],
    };
    sections.set(key, section);
    const view = section.groups.find(candidate => candidate.group.key === line.workedOut.key);
    if (view) view.lines.push(line);
    else section.groups.push({ group: line.workedOut, lines: [line] });
  }
  return [...sections.values()].filter(
    section =>
      section.key === WHOLE_EXPERIMENT ||
      section.items.length ||
      section.groups.length ||
      (section.material && card.materialSections.includes(section.material.id))
  );
}

export interface MissingNote {
  message: string;
  subjects: string[];
}

export interface CalculationTableRow {
  key: string;
  label: string;
  subject: string;
  lines: CalculationName[];
}

export interface CalculationTable {
  key: string;
  title: string;
  settingsCardId: string | undefined;
  columns: string[];
  rows: CalculationTableRow[];
}

export type CalculationPart =
  | { kind: 'section'; section: CalculationSection }
  | { kind: 'table'; table: CalculationTable };

export interface CalculationLayout {
  parts: CalculationPart[];
  missing: MissingNote[];
}

const shownLines = (view: WorkedOutView) => view.lines.filter(line => !line.isIntermediate);

const tableSignature = (view: WorkedOutView) =>
  [
    view.group.title,
    ...shownLines(view).map(line => nameWithinOwner(line.name, view.group.subject)),
  ].join('\n');

export function calculationLayout(
  sections: readonly CalculationSection[],
  board: SolvedBoard,
  keptSectionIds: readonly string[]
): CalculationLayout {
  const missing = new Map<string, Set<string>>();
  const solved = sections.map(section => ({
    ...section,
    groups: section.groups.flatMap(view => {
      const lines = view.lines.filter(line => {
        const result = board.results.get(line.id);
        if (result?.status === 'ok') return true;
        if (result) {
          const subjects = missing.get(result.message) ?? new Set<string>();
          missing.set(result.message, subjects.add(section.title));
        }
        return false;
      });
      return lines.length ? [{ ...view, lines }] : [];
    }),
  }));

  const signatureCounts = new Map<string, number>();
  for (const view of solved.flatMap(section => section.groups)) {
    if (!shownLines(view).length) continue;
    const signature = tableSignature(view);
    signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
  }
  const isTabled = (view: WorkedOutView) =>
    shownLines(view).length > 0 && (signatureCounts.get(tableSignature(view)) ?? 0) > 1;

  const tables = new Map<string, CalculationTable>();
  const parts: CalculationPart[] = [];
  for (const section of solved) {
    for (const view of section.groups.filter(isTabled)) {
      const signature = tableSignature(view);
      let table = tables.get(signature);
      if (!table) {
        table = {
          key: `table:${view.group.key}`,
          title: view.group.title,
          settingsCardId: view.group.settingsCardId,
          columns: shownLines(view).map(line => nameWithinOwner(line.name, view.group.subject)),
          rows: [],
        };
        tables.set(signature, table);
        parts.push({ kind: 'table', table });
      }
      table.rows.push({
        key: `${section.key}/${view.group.key}`,
        label: section.title,
        subject: view.group.subject,
        lines: shownLines(view),
      });
    }
    const groups = section.groups.filter(view => !isTabled(view));
    const isKept =
      section.items.length > 0 ||
      groups.length > 0 ||
      (!!section.material && keptSectionIds.includes(section.material.id));
    if (isKept) parts.push({ kind: 'section', section: { ...section, groups } });
  }

  return {
    parts,
    missing: [...missing].map(([message, subjects]) => ({ message, subjects: [...subjects] })),
  };
}
