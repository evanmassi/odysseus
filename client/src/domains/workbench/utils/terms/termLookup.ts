import { UNIT_REGISTRY } from '@odysseus/shared-schemas';

import { nameKey, type BoardName } from '../formulas/boardCalculation';
import { joinValueName } from '../values/valueNames';

import { TERMS, type Term } from './termList';

const kindOf = (unit: string) => UNIT_REGISTRY.find(entry => entry.id === unit)?.kind;

const unitOf = (entry: BoardName) =>
  entry.kind === 'value' || entry.kind === 'formula' ? entry.unit : '';

function fitsUnit(term: Term, entry: BoardName) {
  if (!term.unitKind) return true;
  const kind = kindOf(unitOf(entry));
  return !kind || kind === term.unitKind;
}

const spellingsOf = (term: Term): readonly string[] => [term.word, ...term.alsoAccepted];

const recognizedSpellingsOf = (term: Term): readonly string[] => [
  ...spellingsOf(term),
  ...(term.formerly ?? []),
];

export const isSpellingOf = (label: string, word: string): boolean =>
  TERMS.some(
    term =>
      term.word === word &&
      recognizedSpellingsOf(term).some(spelling => nameKey(spelling) === nameKey(label))
  );

export function findTerm(
  names: ReadonlyMap<string, BoardName>,
  term: Term,
  owners: readonly string[]
): BoardName | undefined {
  for (const owner of owners) {
    for (const spelling of recognizedSpellingsOf(term)) {
      const entry = names.get(nameKey(joinValueName(owner, spelling)));
      if (entry && fitsUnit(term, entry)) return entry;
    }
  }
  return undefined;
}

export function settledValue(label: string, unit: string): { label: string; unit: string } {
  const term = TERMS.find(
    candidate =>
      spellingsOf(candidate).some(spelling => nameKey(spelling) === nameKey(label)) &&
      (!unit || !candidate.unitKind || kindOf(unit) === candidate.unitKind)
  );
  return term ? { label: term.word, unit: unit || (term.unit ?? '') } : { label, unit };
}
