import { UNIT_REGISTRY, type UnitKind } from '@odysseus/shared-schemas';

import { nameKey, type BoardName, type CalculationGap } from '../formulas/boardCalculation';
import { joinValueName, lowerLead } from '../values/valueNames';

import {
  ASSAY_SETUP_TERMS,
  COCKTAIL_VOLUME_PER_WELL,
  formsOnEveryLabware,
  PER_WELL_TERMS,
  perLabwareKind,
  SAMPLE_NOUNS,
  TERMS,
  TOTAL_WELL_VOLUME,
  WELLS,
  type SampleNoun,
  type Term,
} from './termList';

const kindOf = (unit: string) => UNIT_REGISTRY.find(entry => entry.id === unit)?.kind;

const unitOf = (entry: BoardName) =>
  entry.kind === 'value' || entry.kind === 'calculation' ? entry.unit : '';

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

const spellingsOnEveryLabware = (term: Term): readonly string[] =>
  formsOnEveryLabware(term).flatMap(recognizedSpellingsOf);

export function isAssaySetting(name: string): boolean {
  const key = nameKey(name);
  return ASSAY_SETUP_TERMS.some(term =>
    spellingsOnEveryLabware(term).some(spelling => {
      const word = nameKey(spelling);
      return key === word || key.endsWith(` ${word}`);
    })
  );
}

export function totalWellVolumeGap(
  assaySetupTitle: string,
  noun: SampleNoun = 'well'
): CalculationGap {
  const { word } = perLabwareKind(TOTAL_WELL_VOLUME, noun);
  const example = noun === 'well' ? ' 80 µL' : '';
  return {
    problem: `Needs the ${lowerLead(word)}: add "${word}${example}" under ${assaySetupTitle}`,
    need: word,
  };
}

function findInForms(
  names: ReadonlyMap<string, BoardName>,
  term: Term,
  owners: readonly string[],
  forms: readonly Term[]
): BoardName | undefined {
  for (const owner of owners) {
    for (const spelling of forms.flatMap(recognizedSpellingsOf)) {
      const entry = names.get(nameKey(joinValueName(owner, spelling)));
      if (entry && fitsUnit(term, entry)) return entry;
    }
  }
  return undefined;
}

export function findTerm(
  names: ReadonlyMap<string, BoardName>,
  term: Term,
  owners: readonly string[],
  noun?: SampleNoun
): BoardName | undefined {
  const forms = formsOnEveryLabware(term);
  const ordered = noun && forms.length > 1 ? [perLabwareKind(term, noun), ...forms] : forms;
  return findInForms(names, term, owners, ordered);
}

export const sampleNounsOf = (
  names: ReadonlyMap<string, BoardName>,
  owners: readonly string[]
): SampleNoun[] => SAMPLE_NOUNS.filter(noun => findTermOn(names, WELLS, owners, noun));

export const findTermOn = (
  names: ReadonlyMap<string, BoardName>,
  term: Term,
  owners: readonly string[],
  noun: SampleNoun
): BoardName | undefined => findInForms(names, term, owners, [perLabwareKind(term, noun)]);

const PER_LABWARE_KIND_SPELLINGS: ReadonlyArray<[noun: SampleNoun, spelling: string]> = [
  ...PER_WELL_TERMS,
  COCKTAIL_VOLUME_PER_WELL,
].flatMap(term =>
  SAMPLE_NOUNS.flatMap(noun =>
    recognizedSpellingsOf(perLabwareKind(term, noun)).map((spelling): [SampleNoun, string] => [
      noun,
      nameKey(spelling),
    ])
  )
);

export function perSampleNounOf(name: string): SampleNoun | undefined {
  const key = nameKey(name);
  return PER_LABWARE_KIND_SPELLINGS.find(
    ([, spelling]) => key === spelling || key.endsWith(` ${spelling}`)
  )?.[0];
}

export function withPerLabwareKind(text: string, name: string): string {
  const noun = perSampleNounOf(name);
  return noun && /\d/.test(text) && !text.endsWith(`/${noun}`) ? `${text}/${noun}` : text;
}

const termsSpelled = (label: string) => {
  const key = nameKey(label);
  return TERMS.filter(term =>
    spellingsOnEveryLabware(term).some(spelling => nameKey(spelling) === key)
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
