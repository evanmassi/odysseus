import { withGreekLetters } from '@odysseus/shared-schemas';

import {
  calculateBoard,
  calculationAnswerText,
  nameKey,
  type SolvedBoard,
} from './boardCalculation';
import { calculationMaterial, namesInFull, uniqueName } from './formulaScopes';

import type { MaterialItem } from '@odysseus/shared-schemas';

export interface CalculationDraft {
  name: string;
  savedName: string;
  expr: string;
  material: MaterialItem | undefined;
}

export interface CalculationDraftCheck {
  answer: string | undefined;
  problem: string | undefined;
}

const PREVIEW_ID = 'formula-draft-preview';

export function readCalculationDraft(
  text: string,
  board: SolvedBoard,
  materials: readonly MaterialItem[]
): CalculationDraft | undefined {
  const [label, ...rest] = text.split('=');
  const name = withGreekLetters(label.replace(/\s+/g, ' ').trim());
  if (!name) return undefined;
  const material = calculationMaterial(name, materials);
  return {
    name,
    savedName: uniqueName(board, name),
    expr: namesInFull(withGreekLetters(rest.join('=').trim()), board, material),
    material,
  };
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const swap = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + swap);
    }
    previous = current;
  }
  return previous[b.length];
}

function closestName(missing: string, board: SolvedBoard): string | undefined {
  const typed = nameKey(missing);
  const allowed = Math.max(2, Math.floor(typed.length / 4));
  return [...board.names.values()]
    .map(entry => ({ name: entry.name, distance: editDistance(typed, nameKey(entry.name)) }))
    .filter(candidate => candidate.distance <= allowed)
    .sort((a, b) => a.distance - b.distance)[0]?.name;
}

export function checkCalculationDraft(
  draft: CalculationDraft,
  board: SolvedBoard
): CalculationDraftCheck {
  if (!draft.expr) return { answer: undefined, problem: undefined };
  const preview = calculateBoard([
    ...board.names.values(),
    { kind: 'calculation', id: PREVIEW_ID, name: draft.savedName, expr: draft.expr, unit: '' },
  ]).results.get(PREVIEW_ID);
  if (preview?.status === 'ok')
    return { answer: calculationAnswerText(preview), problem: undefined };
  if (preview?.status !== 'error') return { answer: undefined, problem: undefined };
  const closest = preview.missingName && closestName(preview.missingName, board);
  return {
    answer: undefined,
    problem: closest ? `${preview.message}. Did you mean ${closest}?` : preview.message,
  };
}
