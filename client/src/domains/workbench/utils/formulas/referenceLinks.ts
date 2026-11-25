import { findReferenced, type BoardName, type SolvedBoard } from './boardCalculation';
import { linkedReference, linkNames } from './formulaScopes';
import { readReference, referenceParts, referenceText } from './nameReferences';

import type { Protocol } from '@odysseus/shared-schemas';

type NameKind = BoardName['kind'];

const NUMBER_KINDS: readonly NameKind[] = ['value', 'calculation'];
const MATERIAL_KINDS: readonly NameKind[] = ['item'];

function linkedWhole(text: string, board: SolvedBoard, kinds: readonly NameKind[]): string {
  const entry = findReferenced(board, readReference(text));
  return entry && kinds.includes(entry.kind)
    ? referenceText({ name: entry.name, id: entry.id })
    : text;
}

const linkedStep = (text: string, board: SolvedBoard): string =>
  referenceParts(text)
    .map(part => (part.kind === 'text' ? part.text : referenceText(linkedReference(board, part))))
    .join('');

function keepMaterialName(draft: Protocol, owner: { materialId?: string; materialName?: string }) {
  const material = draft.materials.items.find(item => item.id === owner.materialId);
  if (material) owner.materialName = material.name.trim();
}

export function linkReferences(draft: Protocol, board: SolvedBoard): void {
  for (const item of draft.calculations.items) {
    item.formula = linkNames(item.formula, board);
    keepMaterialName(draft, item);
  }
  for (const valueRow of draft.values.rows) {
    if ('materialId' in valueRow) keepMaterialName(draft, valueRow);
  }
  for (const page of draft.pages) {
    for (const step of page.steps) step.text = linkedStep(step.text, board);
  }
  for (const plateMap of draft.plateMaps) {
    for (const series of Object.values(plateMap.series)) {
      if (series.prep?.diluent)
        series.prep.diluent = linkedWhole(series.prep.diluent, board, MATERIAL_KINDS);
      if (!('top' in series)) continue;
      series.top = linkedWhole(series.top, board, NUMBER_KINDS);
      series.dilutionFactor = linkedWhole(series.dilutionFactor, board, NUMBER_KINDS);
    }
  }
  draft.diluent = linkedWhole(draft.diluent, board, MATERIAL_KINDS);
}
