import { stepVerbBase } from '../steps/stepVerbs';

export type StepKind = 'handle' | 'clean' | 'measure' | 'wait' | 'other';

export type StepPicture =
  | 'tubePipette'
  | 'platePipette'
  | 'resuspend'
  | 'vortex'
  | 'invert'
  | 'transfer'
  | 'dilute'
  | 'harvest'
  | 'centrifuge'
  | 'wash'
  | 'filter'
  | 'incubator'
  | 'stopwatch'
  | 'iceBucket'
  | 'waterBath'
  | 'hemocytometer'
  | 'cytometer'
  | 'plateReader'
  | 'fridge'
  | 'computer'
  | 'neutral';

export interface StepLook {
  kind: StepKind;
  picture: StepPicture;
}

export interface LeadVerb {
  base: string;
  wordCount: number;
}

const look = (kind: StepKind, picture: StepPicture, verbs: readonly string[]) =>
  verbs.map(verb => [verb, { kind, picture }] as const);

const VERB_LOOKS = new Map<string, StepLook>([
  ...look('handle', 'tubePipette', [
    'add',
    'block',
    'combine',
    'dispense',
    'dissolve',
    'fix',
    'load',
    'lyse',
    'make',
    'neutralize',
    'permeabilize',
    'prepare',
    'stain',
    'stimulate',
    'treat',
  ]),
  ...look('handle', 'resuspend', ['mix', 'pipette', 'resuspend']),
  ...look('handle', 'vortex', ['vortex']),
  ...look('handle', 'invert', ['invert', 'shake']),
  ...look('handle', 'transfer', ['aliquot', 'transfer']),
  ...look('handle', 'dilute', ['dilute']),
  ...look('handle', 'harvest', ['detach', 'trypsinize']),
  ...look('handle', 'platePipette', ['coat', 'plate', 'seed', 'split']),
  ...look('clean', 'centrifuge', ['centrifuge', 'pellet', 'spin']),
  ...look('clean', 'wash', ['aspirate', 'decant', 'discard', 'remove', 'rinse', 'wash']),
  ...look('clean', 'filter', ['filter']),
  ...look('clean', 'tubePipette', ['elute']),
  ...look('measure', 'hemocytometer', ['count', 'image']),
  ...look('measure', 'cytometer', ['acquire', 'run']),
  ...look('measure', 'plateReader', ['read']),
  ...look('measure', 'computer', ['measure', 'record', 'weigh']),
  ...look('wait', 'incubator', ['culture', 'incubate']),
  ...look('wait', 'stopwatch', ['leave', 'rest', 'sit', 'stand', 'wait']),
  ...look('wait', 'fridge', ['freeze', 'keep', 'store']),
  ...look('other', 'waterBath', ['heat', 'thaw', 'warm']),
  ...look('other', 'harvest', ['collect', 'harvest']),
  ...look('other', 'computer', ['set']),
  ...look('other', 'neutral', ['bring', 'label', 'place', 'take']),
]);

const FALLBACK: StepLook = { kind: 'other', picture: 'neutral' };
const LEADING_WORDS = new Set(['let']);
const PARTICLES = new Set(['up', 'down', 'out', 'off']);

const bareWord = (word: string | undefined) => (word ?? '').replace(/[^A-Za-z]/g, '');

export function leadVerb(text: string): LeadVerb {
  const words = text.trim().split(/\s+/);
  const skipped = LEADING_WORDS.has(bareWord(words[0]).toLowerCase()) ? 1 : 0;
  const word = bareWord(words[skipped]);
  const hasParticle = PARTICLES.has(bareWord(words[skipped + 1]).toLowerCase());
  return {
    base: stepVerbBase(word) ?? word.toLowerCase(),
    wordCount: skipped + 1 + (hasParticle ? 1 : 0),
  };
}

export const isFlowVerb = (verb: string): boolean => VERB_LOOKS.has(verb);

function waitPicture(text: string): StepPicture | undefined {
  if (/\b4\s?°C\b|fridge|refrigerat/i.test(text)) return 'fridge';
  if (/incubator|37\s?°C/i.test(text)) return 'incubator';
  if (/room temperature/i.test(text) || /\bRT\b/.test(text)) return 'stopwatch';
  return undefined;
}

export function stepLook(verb: string | undefined, text: string): StepLook {
  const found = (verb ? VERB_LOOKS.get(verb) : undefined) ?? FALLBACK;
  if (/\bon ice\b/i.test(text)) return { ...found, picture: 'iceBucket' };
  const forWait = found.kind === 'wait' ? waitPicture(text) : undefined;
  return forWait ? { ...found, picture: forWait } : found;
}
