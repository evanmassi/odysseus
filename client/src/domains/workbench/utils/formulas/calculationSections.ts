import { normalizeMaterialKey } from '../materials/materialGuesser';
import { findNamed } from '../materials/materialLookup';

import { type BoardCalculation, type BoardName, type WorkedOutGroup } from './boardCalculation';
import { formulaMaterial, nameWithinOwner } from './formulaScopes';
import { describeName } from './nameDisplay';

import type { FormulaBlock, MaterialItem } from '@odysseus/shared-schemas';

type FormulaName = Extract<BoardName, { kind: 'formula' }>;

export interface WorkedOutView {
  group: WorkedOutGroup;
  lines: FormulaName[];
}

export interface CalculationSection {
  key: string;
  material: MaterialItem | undefined;
  owner: string;
  items: FormulaBlock['items'];
  groups: WorkedOutView[];
}

export interface SectionNumber {
  name: string;
  label: string;
  text: string;
}

export const WHOLE_EXPERIMENT = '';

function sectionKeyOf(
  name: string,
  workedOut: WorkedOutGroup | undefined,
  materials: readonly MaterialItem[]
): string {
  if (!workedOut) return formulaMaterial(name, materials)?.id ?? WHOLE_EXPERIMENT;
  return (
    findNamed(materials, workedOut.subject, item => item.name)?.id ??
    `subject:${normalizeMaterialKey(workedOut.subject)}`
  );
}

export function calculationSections(
  block: FormulaBlock,
  materials: readonly MaterialItem[],
  calculation: BoardCalculation,
  showsWorkedOut: boolean
): CalculationSection[] {
  const sections = new Map<string, CalculationSection>([
    [
      WHOLE_EXPERIMENT,
      { key: WHOLE_EXPERIMENT, material: undefined, owner: '', items: [], groups: [] },
    ],
    ...materials.map((material): [string, CalculationSection] => [
      material.id,
      { key: material.id, material, owner: material.name.trim(), items: [], groups: [] },
    ]),
  ]);
  for (const item of block.items) {
    sections.get(sectionKeyOf(item.name, undefined, materials))?.items.push(item);
  }
  const worked = showsWorkedOut
    ? [...calculation.names.values()].filter(
        (entry): entry is FormulaName & { workedOut: WorkedOutGroup } =>
          entry.kind === 'formula' && !!entry.workedOut
      )
    : [];
  for (const line of worked) {
    const key = sectionKeyOf(line.name, line.workedOut, materials);
    const section = sections.get(key) ?? {
      key,
      material: undefined,
      owner: line.workedOut.subject,
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
      (section.material && block.materialSections.includes(section.material.id))
  );
}

export function sectionNumbers(
  section: CalculationSection,
  materials: readonly MaterialItem[],
  calculation: BoardCalculation,
  editingId: string
): SectionNumber[] {
  const entries = [...calculation.names.values()].filter(
    entry =>
      entry.kind !== 'item' &&
      entry.id !== editingId &&
      sectionKeyOf(entry.name, entry.workedOut, materials) === section.key
  );
  const isFormula = (entry: BoardName) => entry.kind === 'formula';
  return [...entries.filter(entry => !isFormula(entry)), ...entries.filter(isFormula)].map(
    entry => ({
      name: entry.name,
      label: nameWithinOwner(entry.name, entry.workedOut?.subject ?? section.owner),
      text: describeName(calculation, entry.name).text,
    })
  );
}
