import type { UnitKind } from '@odysseus/shared-schemas';

export interface Term {
  word: string;
  alsoAccepted: readonly string[];
  formerly?: readonly string[];
  meaning?: string;
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
  meaning: 'Volume of it added to each well',
  alsoAccepted: ['Volume per well', 'Vol/well', 'Vol per well', 'Volume/well', 'Volume added'],
  unitKind: 'volume',
  unit: 'µL',
};

export const CELLS_PER_WELL: Term = {
  word: 'Cells/well',
  meaning: 'Cells added to each well',
  alsoAccepted: ['Cells per well', 'Per well'],
  unitKind: 'cell-count',
  unit: 'cells',
};

export const MASS_PER_WELL: Term = {
  word: 'Mass/well',
  meaning: 'Mass of it added to each well',
  alsoAccepted: ['Mass per well', 'Amount per well', 'Per well'],
  unitKind: 'mass',
  unit: 'µg',
};

export const TOTAL_WELL_VOLUME: Term = {
  word: 'Total well vol.',
  meaning: 'Total liquid in each well',
  alsoAccepted: ['Well volume', 'Total well volume', 'Final well volume'],
  unitKind: 'volume',
  unit: 'µL',
};

export const EXTRA: Term = {
  word: 'Extra (dead vol.)',
  meaning: 'Extra made on top of what the wells use, to cover dead volume',
  alsoAccepted: ['Extra', 'Overage', 'Dead volume', 'Dead vol.'],
  unitKind: 'percent',
  unit: '%',
};

export const TOTAL_CELL_CONCENTRATION: Term = {
  word: 'Total cell conc.',
  meaning: 'Cells per mL in the suspension, live and dead',
  alsoAccepted: ['Total cell concentration', 'Cell conc.', 'Cell concentration'],
  formerly: ['Count'],
  unitKind: 'count-conc',
  unit: 'cells/mL',
};

export const LIVE_CELL_CONCENTRATION: Term = {
  word: 'Live cell conc.',
  meaning: 'Live cells per mL in the suspension; plating uses this',
  alsoAccepted: ['Live cell concentration', 'Viable cell conc.', 'Viable cell concentration'],
  unitKind: 'count-conc',
  unit: 'cells/mL',
};

export const TOTAL_CELLS: Term = {
  word: 'Total cells',
  meaning: 'All the cells in the suspension, live and dead',
  alsoAccepted: ['Total count'],
  unitKind: 'cell-count',
  unit: 'cells',
};

export const LIVE_CELLS: Term = {
  word: 'Live cells',
  meaning: 'Live cells in the whole suspension',
  alsoAccepted: ['Live count', 'Viable cells'],
  unitKind: 'cell-count',
  unit: 'cells',
};

export const PLATING_CONCENTRATION: Term = {
  word: 'Plating conc.',
  meaning: 'Cells per mL to plate at: cells/well ÷ vol./well',
  alsoAccepted: ['Plating concentration'],
  unitKind: 'count-conc',
  unit: 'cells/mL',
};

export const STOCK_CONCENTRATION: Term = {
  word: 'Stock conc.',
  meaning: 'Concentration of the stock you start from',
  alsoAccepted: ['Stock concentration'],
};

export const FINAL_CONCENTRATION: Term = {
  word: 'Final conc.',
  meaning: 'Concentration it ends at in the well',
  alsoAccepted: ['Final concentration', 'Final in the well', 'In the well'],
  formerly: ['Concentration'],
};

export const MIX_CONCENTRATION: Term = {
  word: 'Mix conc.',
  meaning: 'Concentration of this ingredient in the mix',
  alsoAccepted: ['In the mix'],
};

export const MOLECULAR_WEIGHT: Term = {
  word: 'MW',
  meaning: 'Molecular weight, to turn a mass into molar',
  alsoAccepted: ['Molecular weight'],
};

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

export const ANTIBODY_DILUTION: Term = {
  word: 'Dil.',
  meaning: 'How far the antibody is diluted for staining',
  alsoAccepted: ['Dilution'],
};

export const PER_TEST: Term = {
  word: 'Per test',
  alsoAccepted: [],
  formerly: ['Amount'],
  unitKind: 'volume',
  unit: 'µL',
};

export const TOTAL_NEEDED: Term = {
  word: 'Total needed',
  meaning: 'Total to prepare: amount per well × wells × extra',
  alsoAccepted: ['Needed', 'Cells needed'],
};

export const TOTAL_VOLUME_NEEDED: Term = {
  word: 'Total vol. needed',
  meaning: 'Total volume to prepare: vol./well × wells × extra',
  alsoAccepted: [],
  formerly: ['Mix'],
};

export const CELLS_PER_VIAL: Term = { word: 'Cells per vial', alsoAccepted: [] };

export const VIABILITY: Term = {
  word: 'Viability',
  meaning: 'Share of the cells that are alive',
  alsoAccepted: [],
  unitKind: 'percent',
  unit: '%',
};

export const WELLS: Term = { word: 'Wells', alsoAccepted: [] };

export const WELLS_USED: Term = { word: 'Wells used', alsoAccepted: [] };

export const COCKTAIL_VOLUME_PER_WELL: Term = {
  word: 'Cocktail vol./well',
  meaning: 'Volume of the cocktail each well gets',
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
  meaning: 'How many times stronger the prep is than in the well',
  alsoAccepted: [],
  formerly: ['Working'],
};

export const WORKING_DILUTION: Term = {
  word: 'Working dil.',
  meaning: 'How far the stock is diluted to make the working solution',
  alsoAccepted: ['Working dilution'],
};

export const WORKING_CONCENTRATION: Term = {
  word: 'Working conc.',
  meaning: 'Concentration of the prep before it goes in the well',
  alsoAccepted: ['Working concentration'],
};

export const TOP_CONCENTRATION: Term = {
  word: 'Top conc.',
  meaning: 'Concentration of the strongest point',
  alsoAccepted: ['Top concentration', 'Top dose'],
};

export const TOP_DILUTION: Term = {
  word: 'Top dil.',
  meaning: 'Dilution of the strongest point',
  alsoAccepted: ['Top dilution'],
};

export const TOP_AMOUNT: Term = {
  word: 'Top amount',
  meaning: 'Amount at the strongest point',
  alsoAccepted: ['Top dose'],
};

export const TOP_VOLUME: Term = {
  word: 'Top vol.',
  meaning: 'Volume made in the strongest point of the prep',
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
  meaning: 'How much each point is diluted from the one before',
  alsoAccepted: ['Dilution factor', 'DF'],
  formerly: ['Fold'],
};

export const ROUND_TO: Term = {
  word: 'Round to',
  meaning: 'Volumes round up to this, to match your pipette',
  alsoAccepted: [],
};

export const POINTS: Term = {
  word: 'Points',
  meaning: 'How many points the series has',
  alsoAccepted: [],
};

export const TOP_POSITION = 'Top';

export const REPLICATES: Term = {
  word: 'Replicates',
  meaning: 'Wells holding the same point',
  alsoAccepted: ['Reps', 'Wells per point'],
};

export const VOLUME_NEEDED: Term = {
  word: 'Vol. needed',
  meaning: 'Volume of working solution each point needs, extra included',
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
  TOTAL_CELL_CONCENTRATION,
  LIVE_CELL_CONCENTRATION,
  TOTAL_CELLS,
  LIVE_CELLS,
  PLATING_CONCENTRATION,
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
  PER_TEST,
  TOTAL_NEEDED,
  TOTAL_VOLUME_NEEDED,
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
  ROUND_TO,
  REPLICATES,
  VOLUME_NEEDED,
  DILUENT_IN_TOP,
  ...CONDITION_TERMS,
];

export const PER_WELL_TERMS: readonly Term[] = [VOLUME_PER_WELL, CELLS_PER_WELL, MASS_PER_WELL];

const ENDS_IN_WELL = /well$/i;

export const perLabwareKind = (term: Term, noun: string): Term =>
  noun === 'well'
    ? term
    : {
        ...term,
        word: term.word.replace(ENDS_IN_WELL, noun),
        alsoAccepted: term.alsoAccepted.map(spelling => spelling.replace(ENDS_IN_WELL, noun)),
      };
