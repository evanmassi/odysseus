import type { UnitKind } from '@odysseus/shared-schemas';

export interface Term {
  word: string;
  alsoAccepted: readonly string[];
  formerly?: readonly string[];
  unitKind?: UnitKind;
  unit?: string;
}

export const VOLUME: Term = {
  word: 'Vol.',
  alsoAccepted: ['Volume'],
  unitKind: 'volume',
  unit: 'µL',
};

export const MASS: Term = {
  word: 'Mass',
  alsoAccepted: [],
  formerly: ['Amount'],
  unitKind: 'mass',
  unit: 'µg',
};

export const VOLUME_PER_WELL: Term = {
  word: 'Vol./well',
  alsoAccepted: ['Volume per well', 'Vol/well', 'Vol per well', 'Volume/well', 'Volume added'],
  unitKind: 'volume',
  unit: 'µL',
};

export const CELLS_PER_WELL: Term = {
  word: 'Cells/well',
  alsoAccepted: ['Cells per well', 'Per well'],
  unitKind: 'cell-count',
  unit: 'cells',
};

export const MASS_PER_WELL: Term = {
  word: 'Mass/well',
  alsoAccepted: ['Mass per well', 'Amount per well', 'Per well'],
  unitKind: 'mass',
  unit: 'µg',
};

export const TOTAL_WELL_VOLUME: Term = {
  word: 'Total well vol.',
  alsoAccepted: ['Well volume', 'Total well volume', 'Final well volume'],
  unitKind: 'volume',
  unit: 'µL',
};

export const EXTRA: Term = {
  word: 'Extra (dead vol.)',
  alsoAccepted: ['Extra', 'Overage', 'Dead volume', 'Dead vol.'],
  unitKind: 'percent',
  unit: '%',
};

export const CELL_CONCENTRATION: Term = {
  word: 'Cell conc.',
  alsoAccepted: ['Cell concentration'],
  formerly: ['Count'],
  unitKind: 'count-conc',
  unit: 'cells/mL',
};

export const STOCK_CONCENTRATION: Term = {
  word: 'Stock conc.',
  alsoAccepted: ['Stock concentration'],
};

export const FINAL_CONCENTRATION: Term = {
  word: 'Final conc.',
  alsoAccepted: ['Final concentration', 'Final in the well', 'In the well'],
  formerly: ['Concentration'],
};

export const MIX_CONCENTRATION: Term = { word: 'Mix conc.', alsoAccepted: ['In the mix'] };

export const MOLECULAR_WEIGHT: Term = { word: 'MW', alsoAccepted: ['Molecular weight'] };

export const PROTEIN_CONCENTRATION: Term = {
  word: 'Protein conc.',
  alsoAccepted: ['Protein concentration'],
};

export const COATING_CONCENTRATION: Term = {
  word: 'Coating conc.',
  alsoAccepted: ['Coating concentration'],
};

export const VOLUME_PER_REACTION: Term = {
  word: 'Vol./reaction',
  alsoAccepted: ['Volume per reaction'],
  unitKind: 'volume',
  unit: 'µL',
};

export const VOLUME_MADE: Term = {
  word: 'Vol. made',
  alsoAccepted: ['Volume made'],
  unitKind: 'volume',
  unit: 'mL',
};

export const RECONSTITUTION_VOLUME: Term = {
  word: 'Reconstitution vol.',
  alsoAccepted: ['Reconstitution volume'],
  unitKind: 'volume',
  unit: 'µL',
};

export const ANTIBODY_DILUTION: Term = { word: 'Dil.', alsoAccepted: ['Dilution'] };

export const TOTAL_NEEDED: Term = {
  word: 'Total needed',
  alsoAccepted: ['Needed', 'Cells needed'],
};

export const TOTAL_VOLUME_NEEDED: Term = {
  word: 'Total vol. needed',
  alsoAccepted: [],
  formerly: ['Mix'],
};

export const LIVE_COUNT: Term = { word: 'Live count', alsoAccepted: [] };

export const CELLS_PER_VIAL: Term = { word: 'Cells per vial', alsoAccepted: [] };

export const VIABILITY: Term = {
  word: 'Viability',
  alsoAccepted: [],
  unitKind: 'percent',
  unit: '%',
};

export const WELLS: Term = { word: 'Wells', alsoAccepted: [] };

export const WELLS_USED: Term = { word: 'Wells used', alsoAccepted: [] };

export const COCKTAIL_VOLUME_PER_WELL: Term = {
  word: 'Cocktail vol./well',
  alsoAccepted: ['Stain volume', 'Cocktail volume per well', 'Stain vol./well'],
  unitKind: 'volume',
  unit: 'µL',
};

export const COCKTAIL = 'Cocktail';

export const COCKTAIL_WELLS: Term = {
  word: 'Cocktail wells',
  alsoAccepted: [],
  formerly: ['Wells'],
};

export const COCKTAIL_ANTIBODIES: Term = {
  word: 'Cocktail antibodies',
  alsoAccepted: [],
  formerly: ['Antibodies'],
};

export const WORKING_STRENGTH: Term = {
  word: 'Working strength',
  alsoAccepted: [],
  formerly: ['Working'],
};

export const WORKING_DILUTION: Term = { word: 'Working dil.', alsoAccepted: ['Working dilution'] };

export const WORKING_CONCENTRATION: Term = {
  word: 'Working conc.',
  alsoAccepted: ['Working concentration'],
};

export const TOP_CONCENTRATION: Term = {
  word: 'Top conc.',
  alsoAccepted: ['Top concentration', 'Top dose'],
};

export const TOP_DILUTION: Term = { word: 'Top dil.', alsoAccepted: ['Top dilution'] };

export const TOP_AMOUNT: Term = { word: 'Top amount', alsoAccepted: ['Top dose'] };

export const TOP_VOLUME: Term = {
  word: 'Top vol.',
  alsoAccepted: ['Top well volume', 'Top well vol.'],
  unitKind: 'volume',
  unit: 'µL',
};

export const TOP_WORKING_CONCENTRATION: Term = {
  word: 'Top working conc.',
  alsoAccepted: [],
  formerly: ['Top working'],
};

export const DILUTION_FACTOR: Term = {
  word: 'Dil. factor',
  alsoAccepted: ['Dilution factor', 'DF'],
  formerly: ['Fold'],
};

export const POINTS: Term = { word: 'Points', alsoAccepted: [] };

export const TOP_POSITION = 'Top';

export const REPLICATES: Term = { word: 'Replicates', alsoAccepted: ['Reps', 'Wells per point'] };

export const VOLUME_NEEDED: Term = {
  word: 'Vol. needed',
  alsoAccepted: ['Volume needed'],
  unitKind: 'volume',
};

export const DILUENT_IN_TOP: Term = {
  word: 'Diluent in top',
  alsoAccepted: [],
  formerly: ['Diluent in well 1'],
};

export const CONDITION_NOUNS: Readonly<Record<string, string>> = {
  centrifuge: 'Centrifuge',
  spin: 'Centrifuge',
  pellet: 'Centrifuge',
  incubate: 'Incubation',
  block: 'Blocking',
  stain: 'Staining',
  wash: 'Wash',
  thaw: 'Thaw',
  warm: 'Warming',
  wait: 'Wait',
  shake: 'Shaking',
  vortex: 'Vortex',
  fix: 'Fixation',
  lyse: 'Lysis',
  permeabilize: 'Perm',
  coat: 'Coating',
  stimulate: 'Stim.',
  develop: 'Development',
  digest: 'Digestion',
  sonicate: 'Sonication',
  treat: 'Treatment',
};

const CONDITION_MEASURES: ReadonlyArray<{
  kinds: readonly UnitKind[];
  word: string;
  formerly: readonly string[];
  unit?: string;
}> = [
  { kinds: ['time'], word: 'time', formerly: [], unit: 'min' },
  { kinds: ['temperature'], word: 'temp.', formerly: ['temperature'], unit: '°C' },
  { kinds: ['g-force', 'rotor-speed'], word: 'speed', formerly: [] },
];

const FORMER_NOUNS: Readonly<Record<string, readonly string[]>> = {
  Centrifuge: ['Spin'],
  'Stim.': ['Stimulation'],
};

export const conditionMeasure = (kind: string): string | undefined =>
  CONDITION_MEASURES.find(measure => measure.kinds.some(candidate => candidate === kind))?.word;

const CONDITION_TERMS: readonly Term[] = [...new Set(Object.values(CONDITION_NOUNS))].flatMap(
  noun =>
    CONDITION_MEASURES.map(measure => {
      const nouns = [noun, ...(FORMER_NOUNS[noun] ?? [])];
      const measures = [measure.word, ...measure.formerly];
      const word = `${noun} ${measure.word}`;
      return {
        word,
        alsoAccepted: nouns
          .flatMap(each => measures.map(part => `${each} ${part}`))
          .filter(spelling => spelling !== word),
        unitKind: measure.kinds.length === 1 ? measure.kinds[0] : undefined,
        unit: measure.unit,
      };
    })
);

export const TERMS: readonly Term[] = [
  VOLUME,
  MASS,
  VOLUME_PER_WELL,
  CELLS_PER_WELL,
  MASS_PER_WELL,
  TOTAL_WELL_VOLUME,
  EXTRA,
  CELL_CONCENTRATION,
  STOCK_CONCENTRATION,
  FINAL_CONCENTRATION,
  MIX_CONCENTRATION,
  MOLECULAR_WEIGHT,
  PROTEIN_CONCENTRATION,
  COATING_CONCENTRATION,
  VOLUME_PER_REACTION,
  VOLUME_MADE,
  RECONSTITUTION_VOLUME,
  ANTIBODY_DILUTION,
  TOTAL_NEEDED,
  TOTAL_VOLUME_NEEDED,
  LIVE_COUNT,
  CELLS_PER_VIAL,
  VIABILITY,
  WELLS,
  WELLS_USED,
  COCKTAIL_VOLUME_PER_WELL,
  COCKTAIL_WELLS,
  COCKTAIL_ANTIBODIES,
  WORKING_STRENGTH,
  WORKING_DILUTION,
  WORKING_CONCENTRATION,
  TOP_CONCENTRATION,
  TOP_DILUTION,
  TOP_AMOUNT,
  TOP_VOLUME,
  TOP_WORKING_CONCENTRATION,
  DILUTION_FACTOR,
  POINTS,
  REPLICATES,
  VOLUME_NEEDED,
  DILUENT_IN_TOP,
  ...CONDITION_TERMS,
];

export const PER_WELL_TERMS: readonly Term[] = [VOLUME_PER_WELL, CELLS_PER_WELL, MASS_PER_WELL];

const ENDS_IN_WELL = /well$/i;

export const perVessel = (term: Term, noun: string): Term =>
  noun === 'well'
    ? term
    : {
        ...term,
        word: term.word.replace(ENDS_IN_WELL, noun),
        alsoAccepted: term.alsoAccepted.map(spelling => spelling.replace(ENDS_IN_WELL, noun)),
      };
