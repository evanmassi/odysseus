import { UNIT_REGISTRY, type UnitKind } from '@odysseus/shared-schemas';

import { nameKey, type BoardName } from '../formulas/boardCalculation';
import { joinValueName } from '../values/valueNames';
import { VESSEL_PLURALS } from '../vessels/vesselCatalog';

import { COCKTAIL_VOLUME_PER_WELL, PER_WELL_TERMS, perVessel, TERMS, type Term } from './termList';

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

const PER_VESSEL_SPELLINGS: ReadonlyArray<[noun: string, spelling: string]> = [
  ...PER_WELL_TERMS,
  COCKTAIL_VOLUME_PER_WELL,
].flatMap(term =>
  Object.keys(VESSEL_PLURALS).flatMap(noun =>
    recognizedSpellingsOf(perVessel(term, noun)).map((spelling): [string, string] => [
      noun,
      nameKey(spelling),
    ])
  )
);

function perVesselNoun(name: string): string | undefined {
  const key = nameKey(name);
  return PER_VESSEL_SPELLINGS.find(
    ([, spelling]) => key === spelling || key.endsWith(` ${spelling}`)
  )?.[0];
}

export function withPerVessel(text: string, name: string): string {
  const noun = perVesselNoun(name);
  return noun && /\d/.test(text) && !text.endsWith(`/${noun}`) ? `${text}/${noun}` : text;
}

const ANY_VESSEL_TAIL = /\/(tube|flask|dish|position)$/;

const termsSpelled = (label: string) => {
  const key = nameKey(label).replace(ANY_VESSEL_TAIL, '/well');
  return TERMS.filter(term =>
    recognizedSpellingsOf(term).some(spelling => nameKey(spelling) === key)
  );
};

export const termMeaning = (label: string): string | undefined =>
  termsSpelled(label).find(term => term.meaning)?.meaning;

const KIND_WORDS: Partial<Record<UnitKind, string>> = {
  percent: 'a %',
  volume: 'a volume',
  mass: 'a mass',
  'cell-count': 'a number of cells',
  'count-conc': 'cells/mL',
  time: 'a time',
  temperature: 'a temperature',
};

export function unitMismatch(label: string, unit: string): string | undefined {
  const kind = kindOf(unit);
  const terms = termsSpelled(label).filter(term => term.unitKind);
  if (!kind || !terms.length || terms.some(term => term.unitKind === kind)) return undefined;
  const [term] = terms;
  const expected = (term.unitKind && KIND_WORDS[term.unitKind]) ?? term.unit;
  return `${term.word} should be ${expected}, so the math isn't using it`;
}

export function settledValue(label: string, unit: string): { label: string; unit: string } {
  const term = TERMS.find(
    candidate =>
      spellingsOf(candidate).some(spelling => nameKey(spelling) === nameKey(label)) &&
      (!unit || !candidate.unitKind || kindOf(unit) === candidate.unitKind)
  );
  return term ? { label: term.word, unit: unit || (term.unit ?? '') } : { label, unit };
}
