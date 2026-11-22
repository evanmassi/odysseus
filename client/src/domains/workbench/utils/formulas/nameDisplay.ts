import { formulaAnswerText, nameKey, type SolvedBoard } from './boardCalculation';
import { displayValue } from './quantities';

export interface NameDisplay {
  text: string;
  label: string;
  kind: 'missing' | 'item' | 'value' | 'count' | 'formula';
  isDropped: boolean;
}

export function describeName(board: SolvedBoard, name: string): NameDisplay {
  const entry = board.names.get(nameKey(name));
  if (!entry) return { text: name, label: 'not on this board', kind: 'missing', isDropped: false };
  switch (entry.kind) {
    case 'item': {
      const isDropped = !!entry.isDropped;
      const fullName = entry.shownName ? entry.name.trim() : '';
      return {
        text: entry.shownName ?? entry.name,
        label: isDropped
          ? 'Set aside in Materials'
          : [fullName, entry.label].filter(Boolean).join(' · '),
        kind: 'item',
        isDropped,
      };
    }
    case 'value': {
      const isDropped = !!entry.isDropped;
      return {
        text: displayValue(entry.value, entry.unit),
        label: isDropped ? `${entry.name}, set aside in Materials` : entry.name,
        kind: 'value',
        isDropped,
      };
    }
    case 'count':
      return { text: String(entry.count), label: entry.name, kind: 'count', isDropped: false };
    case 'formula': {
      const result = board.results.get(entry.id);
      if (result?.status !== 'ok')
        return { text: '?', label: entry.name, kind: 'missing', isDropped: false };
      return {
        text: formulaAnswerText(result),
        label: entry.name,
        kind: 'formula',
        isDropped: false,
      };
    }
  }
}

const isSameDisplay = (a: NameDisplay, b: NameDisplay) =>
  a.text === b.text && a.label === b.label && a.kind === b.kind && a.isDropped === b.isDropped;

export const readsNamesAlike = (
  names: readonly string[],
  a: SolvedBoard,
  b: SolvedBoard
): boolean =>
  a === b || names.every(name => isSameDisplay(describeName(a, name), describeName(b, name)));
