import {
  calculationAnswerText,
  findReferenced,
  type BoardName,
  type SolvedBoard,
} from './boardCalculation';
import { displayValue } from './quantities';

import type { NameReference } from './nameReferences';

export interface NameDisplay {
  text: string;
  label: string;
  kind: BoardName['kind'] | 'missing';
  isSetAside: boolean;
}

export function describeName(board: SolvedBoard, reference: NameReference): NameDisplay {
  const entry = findReferenced(board, reference);
  if (!entry) {
    const { name, id } = reference;
    const label = id === undefined ? 'not on this board' : 'was removed';
    return { text: name, label, kind: 'missing', isSetAside: false };
  }
  switch (entry.kind) {
    case 'item': {
      const isDropped = !!entry.isSetAside;
      const fullName = entry.shownName ? entry.name.trim() : '';
      return {
        text: entry.shownName ?? entry.name,
        label: isDropped
          ? 'Set aside in Materials'
          : [fullName, entry.label].filter(Boolean).join(' · '),
        kind: 'item',
        isSetAside: isDropped,
      };
    }
    case 'value': {
      const isDropped = !!entry.isSetAside;
      return {
        text: displayValue(entry.value, entry.unit),
        label: isDropped ? `${entry.name}, set aside in Materials` : entry.name,
        kind: 'value',
        isSetAside: isDropped,
      };
    }
    case 'count':
      return { text: String(entry.count), label: entry.name, kind: 'count', isSetAside: false };
    case 'calculation': {
      const result = board.results.get(entry.id);
      if (result?.status !== 'ok')
        return { text: '?', label: entry.name, kind: 'missing', isSetAside: false };
      return {
        text: calculationAnswerText(result),
        label: entry.name,
        kind: 'calculation',
        isSetAside: false,
      };
    }
  }
}

const isSameDisplay = (a: NameDisplay, b: NameDisplay) =>
  a.text === b.text && a.label === b.label && a.kind === b.kind && a.isSetAside === b.isSetAside;

export const readsNamesAlike = (
  references: readonly NameReference[],
  a: SolvedBoard,
  b: SolvedBoard
): boolean =>
  a === b ||
  references.every(reference =>
    isSameDisplay(describeName(a, reference), describeName(b, reference))
  );
