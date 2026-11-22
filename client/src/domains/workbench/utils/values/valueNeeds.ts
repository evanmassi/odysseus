import { nameKey, type SolvedBoard, type BoardName } from '../formulas/boardCalculation';

import { routeParsedLine, type RoutedValue } from './valueRouting';

import type { Protocol, ValuesBlock } from '@odysseus/shared-schemas';

export type ValueNeed =
  | { kind: 'blank'; id: string; neededFor: string[] }
  | { kind: 'absent'; routed: RoutedValue; neededFor: string[] };

type FormulaName = Extract<BoardName, { kind: 'formula' }>;

const SHOWN_NEEDERS = 2;

const neederOf = (formula: FormulaName) =>
  formula.workedOut
    ? `${formula.workedOut.title} for ${formula.workedOut.subject}`
    : formula.name.trim();

export function neededForText(neededFor: readonly string[]): string {
  const shown = neededFor.slice(0, SHOWN_NEEDERS).join(', ');
  const more = neededFor.length - SHOWN_NEEDERS;
  return `Needed for ${shown}${more > 0 ? ` and ${more} more` : ''}`;
}

export function valueNeeds(
  protocol: Pick<Protocol, 'blocks'>,
  block: ValuesBlock,
  board: SolvedBoard
): ValueNeed[] {
  const formulas = new Map(
    [...board.names.values()].flatMap(entry =>
      entry.kind === 'formula' ? [[entry.id, entry] as const] : []
    )
  );
  const blanks = new Map<string, Set<string>>();
  const absent = new Map<string, { name: string; neededFor: Set<string> }>();
  for (const [id, result] of board.results) {
    const formula = formulas.get(id);
    if (!formula || result.status !== 'error') continue;
    const needer = neederOf(formula);
    if (result.blankId) {
      blanks.set(result.blankId, (blanks.get(result.blankId) ?? new Set()).add(needer));
    } else if (result.missingName && formula.workedOut) {
      const key = nameKey(result.missingName);
      const entry = absent.get(key) ?? { name: result.missingName, neededFor: new Set() };
      entry.neededFor.add(needer);
      absent.set(key, entry);
    }
  }
  return [
    ...[...blanks].map(
      ([blankId, neededFor]): ValueNeed => ({
        kind: 'blank',
        id: blankId,
        neededFor: [...neededFor],
      })
    ),
    ...[...absent.values()].map(
      ({ name, neededFor }): ValueNeed => ({
        kind: 'absent',
        routed: routeParsedLine(protocol, block, { name, value: '', unit: '' }),
        neededFor: [...neededFor],
      })
    ),
  ];
}
