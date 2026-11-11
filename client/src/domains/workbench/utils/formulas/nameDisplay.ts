import { formulaAnswerText, nameKey, type BoardCalculation } from './boardCalculation';
import { displayValue } from './quantities';

export interface NameDisplay {
  text: string;
  label: string;
  kind: 'missing' | 'item' | 'value' | 'count' | 'formula';
  isDropped: boolean;
}

export function describeName(calculation: BoardCalculation, name: string): NameDisplay {
  const entry = calculation.names.get(nameKey(name));
  if (!entry) return { text: name, label: 'not on this board', kind: 'missing', isDropped: false };
  switch (entry.kind) {
    case 'item': {
      const isDropped = !!entry.isDropped;
      return {
        text: entry.name,
        label: isDropped ? 'Dropped from Materials' : entry.label,
        kind: 'item',
        isDropped,
      };
    }
    case 'value': {
      const isDropped = !!entry.isDropped;
      return {
        text: displayValue(entry.value, entry.unit),
        label: isDropped ? `${entry.name}, dropped from Materials` : entry.name,
        kind: 'value',
        isDropped,
      };
    }
    case 'count':
      return { text: String(entry.count), label: entry.name, kind: 'count', isDropped: false };
    case 'formula': {
      const result = calculation.results.get(entry.id);
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
  a: BoardCalculation,
  b: BoardCalculation
): boolean =>
  a === b || names.every(name => isSameDisplay(describeName(a, name), describeName(b, name)));
