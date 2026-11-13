import { withGreekLetters } from './greekLetters';
import {
  ANTIBODY_STOP_WORDS,
  DECISIVE_KEYWORD_TYPES,
  KEY_RESOURCES_HEADER_ROW,
  KEY_RESOURCES_HEADINGS,
  KEYWORD_RULES,
  REPOSITORY_ACCESSIONS,
  type KeywordRule,
} from './materialGuessRules';
import { guessSupplyShape, pickFirst, type PickTable } from './materialGuessSupplyShape';
import {
  CONJUGATE_LEXICON,
  CYTOKINE_LEXICON,
  FLUORESCENT_PROTEIN_KEYS,
  FLUOROCHROMES_BY_LASER,
  MATERIAL_LEXICON,
  TARGET_LEXICON,
  VENDOR_LEXICON,
  type MaterialLexiconGroup,
} from './materialLexicon';

export interface MaterialAmount {
  value: string;
  unit: string;
}

type MaterialGuessSource = 'list' | 'pattern' | 'none' | 'yours';

export interface MaterialGuess {
  group: string;
  type: string;
  name: string;
  values: Record<string, string>;
  amount?: MaterialAmount;
  why: string;
  source: MaterialGuessSource;
}

export interface RememberedMaterialKind {
  group: string;
  type: string;
  why?: string;
}

interface MaterialGuessContext {
  groupHint?: MaterialLexiconGroup;
  vendor?: string;
  identifier?: string;
}

interface PastedMaterialRow {
  text: string;
  context: MaterialGuessContext;
}

interface Token {
  text: string;
  key: string;
}

interface TokenMatch<T> {
  start: number;
  length: number;
  hit: T;
  text: string;
}

interface LexiconHit {
  group: MaterialLexiconGroup;
  type: string;
  values: Readonly<Record<string, string>>;
  isGeneric: boolean;
}

interface Fluorochrome {
  name: string;
  laser: string;
  isProtein: boolean;
}

interface TargetHit {
  isCytokine: boolean;
}

type Fields = Record<string, string | undefined>;

interface GuessOutcome {
  group: string;
  type: string;
  why: string;
  name?: string;
  fields?: Fields;
  baseValues?: Record<string, string>;
  amount?: MaterialAmount;
  source?: MaterialGuessSource;
}

interface WordAnalysis {
  text: string;
  lowerText: string;
  nameText: string;
  singleToken?: string;
  amount?: MaterialAmount;
  tokens: Token[];
  lexiconHits: TokenMatch<LexiconHit>[];
  lexiconHit?: TokenMatch<LexiconHit>;
  fluorochromeHits: TokenMatch<Fluorochrome>[];
  fluorochrome?: Fluorochrome;
  conjugateHits: TokenMatch<string>[];
  conjugate?: string;
  targetHits: TokenMatch<TargetHit>[];
  target?: TokenMatch<TargetHit>;
  hasAnti: boolean;
  keyword?: KeywordRule;
}

interface AntibodyLabel {
  hostSpecies?: string;
  conjugateName?: string;
}

const LATIN_FOR_GREEK: readonly (readonly [RegExp, string])[] = [
  [/α/g, 'a'],
  [/β/g, 'b'],
  [/γ/g, 'g'],
  [/δ/g, 'd'],
  [/κ/g, 'k'],
  [/λ/g, 'l'],
  [/ε/g, 'e'],
  [/[µμ]/g, 'u'],
];
const NON_KEY_CHARACTERS = /[^a-z0-9]/g;

export const normalizeMaterialKey = (text: string): string =>
  LATIN_FOR_GREEK.reduce(
    (key, [letter, latin]) => key.replace(letter, latin),
    withGreekLetters(text).toLowerCase()
  ).replace(NON_KEY_CHARACTERS, '');

const LIST_SEPARATOR = '|';
const ALIAS_SEPARATOR = '=';
const splitList = (list: string): string[] => list.split(LIST_SEPARATOR);
const splitAliases = (chain: string): string[] => chain.split(ALIAS_SEPARATOR);

function indexLexicon(): ReadonlyMap<string, LexiconHit> {
  const index = new Map<string, LexiconHit>();
  for (const { group, type, values, names, isGeneric = false } of MATERIAL_LEXICON) {
    for (const name of splitList(names)) {
      const key = normalizeMaterialKey(name);
      if (key && !index.has(key)) index.set(key, { group, type, values, isGeneric });
    }
  }
  return index;
}

function indexFluorochromes(): ReadonlyMap<string, Fluorochrome> {
  const index = new Map<string, Fluorochrome>();
  for (const { laser, names } of FLUOROCHROMES_BY_LASER) {
    for (const chain of splitList(names)) {
      const aliases = splitAliases(chain).map(alias => alias.trim());
      const name = aliases[0];
      const fluorochrome = {
        name,
        laser,
        isProtein: FLUORESCENT_PROTEIN_KEYS.has(normalizeMaterialKey(name)),
      };
      for (const alias of aliases) index.set(normalizeMaterialKey(alias), fluorochrome);
    }
  }
  return index;
}

function indexTargets(): ReadonlyMap<string, TargetHit> {
  const index = new Map<string, TargetHit>();
  for (const name of splitList(TARGET_LEXICON)) {
    index.set(normalizeMaterialKey(name), { isCytokine: false });
  }
  for (const name of splitList(CYTOKINE_LEXICON)) {
    index.set(normalizeMaterialKey(name), { isCytokine: true });
  }
  return index;
}

function indexVendors(): ReadonlyMap<string, string> {
  const index = new Map<string, string>();
  for (const chain of splitList(VENDOR_LEXICON)) {
    const aliases = splitAliases(chain);
    for (const alias of aliases) index.set(normalizeMaterialKey(alias), aliases[0]);
  }
  return index;
}

const lexiconByKey = indexLexicon();
const fluorochromeByKey = indexFluorochromes();
const conjugateByKey: ReadonlyMap<string, string> = new Map(
  splitList(CONJUGATE_LEXICON).map(name => [normalizeMaterialKey(name), name])
);
const targetByKey = indexTargets();
const vendorByKey = indexVendors();

export const VENDOR_NAMES: readonly string[] = splitList(VENDOR_LEXICON).map(
  chain => splitAliases(chain)[0]
);

export const CONJUGATE_NAMES: readonly string[] = [
  ...FLUOROCHROMES_BY_LASER.flatMap(({ names }) =>
    splitList(names).map(chain => splitAliases(chain)[0].trim())
  ).filter(name => !FLUORESCENT_PROTEIN_KEYS.has(normalizeMaterialKey(name))),
  'HRP',
  'Biotin',
  'AP',
];

export const isNonFluorochromeConjugate = (name: string): boolean =>
  conjugateByKey.has(normalizeMaterialKey(name));

export const findFluorochromeName = (name: string): string | undefined =>
  fluorochromeByKey.get(normalizeMaterialKey(name))?.name;

export interface DyeLaser {
  name: string;
  laser: string;
}

export function findDyeLaser(name: string): DyeLaser | undefined {
  const key = normalizeMaterialKey(name);
  const fluorochrome = fluorochromeByKey.get(key);
  if (fluorochrome) return { name: fluorochrome.name, laser: fluorochrome.laser };
  const laser = lexiconByKey.get(key)?.values['laser'];
  return laser === undefined ? undefined : { name: name.trim(), laser };
}

const THERAPEUTIC_ANTIBODY = /\b[a-z]{3,}mab\b/i;

export const isTherapeuticAntibodyName = (name: string): boolean => THERAPEUTIC_ANTIBODY.test(name);

export const listWithAnd = (words: readonly string[]): string =>
  words.length < 2
    ? words.join('')
    : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;

const CD_MARKER_KEY = /^cd\d{1,3}[a-z]{0,2}$/;
const INTERLEUKIN_KEY = /^il\d{1,2}[a-z0-9]{0,3}$/;
const CYTOKINE_SPECIES_PREFIX =
  /^(rh|rm|h|m)(?=il\d|ifn|tnf|gmcsf|mcsf|gcsf|tgf|flt3|scf|egf|fgf|vegf|bmp|tpo|epo)/;
const MARKER_SPECIES_PREFIX = /^([hm])(?=cd\d)/;
const ANTI_TOKEN_PREFIX = /^(anti|α)[-‐–]?/i;

const isTargetKey = (key: string): boolean =>
  CD_MARKER_KEY.test(key) || INTERLEUKIN_KEY.test(key) || targetByKey.has(key);

const isCytokineKey = (key: string): boolean =>
  INTERLEUKIN_KEY.test(key) || targetByKey.get(key)?.isCytokine === true;

const TOKEN_SEPARATORS = /[\s,;()[\]]+/;
const LEADING_REAGENT_PREFIX = /^(SA|streptavidin|anti|α)-(?=[A-Z])/i;

const tokenize = (text: string): Token[] =>
  text
    .split(TOKEN_SEPARATORS)
    .flatMap(piece => piece.split(LEADING_REAGENT_PREFIX))
    .filter(piece => piece !== '')
    .map(piece => ({ text: piece, key: normalizeMaterialKey(piece) }))
    .filter(token => token.key !== '');

const toTargetToken = (token: Token): Token => {
  const text = token.text.replace(ANTI_TOKEN_PREFIX, '');
  const key = normalizeMaterialKey(text)
    .replace(CYTOKINE_SPECIES_PREFIX, '')
    .replace(MARKER_SPECIES_PREFIX, '');
  return { text, key };
};

const LONGEST_NAME_TOKENS = 7;
const LONGEST_VENDOR_TOKENS = 4;
const LONGEST_CONJUGATE_TOKENS = 2;
const LONGEST_TARGET_TOKENS = 4;

function findMatches<T>(
  tokens: readonly Token[],
  lookup: (key: string) => T | undefined,
  used: Set<number>,
  longestSpan = LONGEST_NAME_TOKENS
): TokenMatch<T>[] {
  const found: TokenMatch<T>[] = [];
  for (let length = Math.min(longestSpan, tokens.length); length >= 1; length--) {
    for (let start = 0; start + length <= tokens.length; start++) {
      const span = tokens.slice(start, start + length);
      if (span.some((token, offset) => used.has(start + offset) || !token.key)) continue;
      const hit = lookup(span.map(token => token.key).join(''));
      if (!hit) continue;
      for (let offset = 0; offset < length; offset++) used.add(start + offset);
      found.push({ start, length, hit, text: span.map(token => token.text).join(' ') });
    }
  }
  return found.sort((first, second) => first.start - second.start);
}

const tokenIndexes = ({ start, length }: { start: number; length: number }): number[] =>
  Array.from({ length }, (_, offset) => start + offset);

const UNIT_ALIASES: ReadonlyMap<string, string> = new Map([
  ['um', 'µM'],
  ['μm', 'µM'],
  ['µm', 'µM'],
  ['ug/ml', 'µg/mL'],
  ['μg/ml', 'µg/mL'],
  ['µg/ml', 'µg/mL'],
  ['mg/ml', 'mg/mL'],
  ['ng/ml', 'ng/mL'],
  ['pg/ml', 'pg/mL'],
  ['mm', 'mM'],
  ['nm', 'nM'],
  ['pm', 'pM'],
  ['m', 'M'],
  ['%', '%'],
  ['x', 'X'],
  ['×', 'X'],
  ['u/ml', 'U/mL'],
  ['iu/ml', 'IU/mL'],
  ['ul', 'µL'],
  ['µl', 'µL'],
  ['μl', 'µL'],
]);
const CONCENTRATION =
  /(?:^|\s)(\d+(?:\.\d+)?)\s*(mM|[uµμ]M|nM|pM|M|mg\/m[lL]|[uµμ]g\/m[lL]|ng\/m[lL]|pg\/m[lL]|I?U\/m[lL]|%|[x×])(?=$|[\s,;)])/;
const DILUTION = /(?:^|\s)1\s*:\s*(\d[\d,]*)(?=$|[\s,;)])/;
const VOLUME_PER_TEST =
  /(?:^|\s)(\d+(?:\.\d+)?)\s*([uµμ][lL])\s*(?:\/|per)\s*(?:test|sample|10\^?6 cells|well)/i;
const THOUSANDS_SEPARATORS = /,/g;

function extractAmount(text: string): { amount?: MaterialAmount; text: string } {
  const dilution = text.match(DILUTION);
  if (dilution) {
    return {
      amount: { value: dilution[1].replace(THOUSANDS_SEPARATORS, ''), unit: '1:N' },
      text: text.replace(dilution[0], ' '),
    };
  }
  const perTest = text.match(VOLUME_PER_TEST);
  if (perTest) {
    return { amount: { value: perTest[1], unit: 'µL' }, text: text.replace(perTest[0], ' ') };
  }
  const concentration = text.match(CONCENTRATION);
  if (concentration) {
    const unit = UNIT_ALIASES.get(concentration[2].toLowerCase()) ?? concentration[2];
    return {
      amount: { value: concentration[1], unit },
      text: text.replace(concentration[0], ' '),
    };
  }
  return { text };
}

const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;
const WORD_GAP = '[\\s,;()\\[\\]-]*';
const SPACE_BEFORE_PUNCTUATION = /\s+([,;])/g;
const DOUBLED_COMMA = /,\s*,/g;

const escapeForRegex = (text: string): string => text.replace(REGEX_SPECIAL_CHARACTERS, '\\$&');

const removeWords = (text: string, words: readonly string[]): string =>
  text
    .replace(new RegExp(words.map(escapeForRegex).join(WORD_GAP), 'i'), ' ')
    .replace(SPACE_BEFORE_PUNCTUATION, '$1')
    .replace(DOUBLED_COMMA, ',');

const WORD_START = /\b\w/g;
const titleCase = (text: string): string =>
  text.replace(WORD_START, letter => letter.toUpperCase());

const isFilled = (entry: [string, string | undefined]): entry is [string, string] =>
  entry[1] !== undefined && entry[1] !== '';

const withoutBlanks = (fields: Fields): Record<string, string> =>
  Object.fromEntries(Object.entries(fields).filter(isFilled));

const WHITESPACE_RUNS = /\s+/g;
const RRID = /\bRRID\s*:\s*([A-Za-z]+_[\w-]+)/i;
const CATALOG =
  /(?:\bcat(?:alog)?\.?\s*(?:no\.?|#|number)?\s*:?\s*([A-Za-z0-9][\w.\-/]{2,})|#\s*([A-Za-z0-9][\w.\-/]{3,}))/i;
const BARE_CATALOG = /^\s*([A-Za-z0-9][\w.\-/]{2,})\s*;?\s*$/;
const LOT = /\blot\s*(?:#|no\.?)?\s*:?\s*([A-Za-z0-9][\w-]{2,})/i;
const CATALOG_AFTER_VENDOR = /^[A-Za-z]{0,4}-?\d{3,}[\w.-]*$/;
const PLAIN_NUMBER = /^\d+(\.\d+)?$/;
const LONG_NUMBER = /^\d{5,}$/;
const LIST_MARKS = /\s*[|·•]\s*/g;
const EDGE_PUNCTUATION = /^[\s,;:-]+|[\s,;:-]+$/g;

function readIdentifierColumn(identifier: string, values: Record<string, string>): void {
  const rrid = identifier.match(RRID);
  if (rrid) values['rrid'] = rrid[1];
  const catalog = identifier.match(CATALOG) ?? identifier.replace(RRID, '').match(BARE_CATALOG);
  if (catalog) values['catalog'] = catalog[1] ?? catalog[2];
}

function detachVendor(text: string, values: Record<string, string>): string {
  const tokens = tokenize(text);
  const insideKnownNames = new Set<number>();
  findMatches(tokens, key => lexiconByKey.get(key), insideKnownNames);
  const vendorHit = findMatches(
    tokens,
    key => vendorByKey.get(key),
    new Set(),
    LONGEST_VENDOR_TOKENS
  ).find(hit => hit.length < tokens.length);
  if (!vendorHit) return text;
  values['vendor'] ??= vendorHit.hit;
  const after = vendorHit.start + vendorHit.length;
  const nextText = tokens[after]?.text ?? '';
  const isCatalogAfterVendor =
    (!values['catalog'] && CATALOG_AFTER_VENDOR.test(nextText) && !PLAIN_NUMBER.test(nextText)) ||
    LONG_NUMBER.test(nextText);
  if (isCatalogAfterVendor) values['catalog'] = nextText;
  if (tokenIndexes(vendorHit).some(index => insideKnownNames.has(index))) return text;
  const vendorWords = tokens.slice(vendorHit.start, isCatalogAfterVendor ? after + 1 : after);
  return removeWords(
    text,
    vendorWords.map(token => token.text)
  );
}

function readIdentifiers(
  raw: string,
  { vendor, identifier }: MaterialGuessContext
): { text: string; values: Record<string, string> } {
  let text = raw.replace(WHITESPACE_RUNS, ' ').trim();
  const values: Record<string, string> = {};
  if (vendor) values['vendor'] = vendor;
  if (identifier) readIdentifierColumn(identifier, values);
  const rrid = text.match(RRID);
  if (rrid) {
    values['rrid'] = rrid[1];
    text = text.replace(rrid[0], ' ');
  }
  const catalog = text.match(CATALOG);
  if (catalog) {
    values['catalog'] = catalog[1] ?? catalog[2];
    text = text.replace(catalog[0], ' ');
  }
  const lot = text.match(LOT);
  if (lot) text = text.replace(lot[0], ' ');
  text = detachVendor(text, values)
    .replace(LIST_MARKS, ' ')
    .replace(WHITESPACE_RUNS, ' ')
    .replace(EDGE_PUNCTUATION, '');
  return { text, values };
}

const FOUR_CHARACTER_ID = /^\d[A-Za-z0-9]{3}$/;
const DNA_SEQUENCE = /^(?:5'\s*-?\s*)?([ACGTUNRYKMSWBDHVI\s/*\-[\]]{12,})(?:\s*-?\s*3')?$/i;
const BASE_RUN = /[ACGTU]{10,}/i;
const SPACES_AND_DASHES = /[\s-]/g;
const NON_BASES = /[^ACGTU]/gi;
const SEQUENCE_PUNCTUATION = /[\s\-/*[\]]/g;
const MIN_BASE_SHARE = 0.85;

function guessAccession(text: string): GuessOutcome | undefined {
  for (const token of text.split(' ')) {
    if (FOUR_CHARACTER_ID.test(token)) continue;
    const rule = REPOSITORY_ACCESSIONS.find(({ pattern }) => pattern.test(token));
    if (rule) {
      return {
        group: 'soft',
        type: 'Dataset',
        why: `${token} is a ${rule.repository} ID`,
        source: 'pattern',
        fields: { repository: rule.repository, 'accession-number': token },
      };
    }
  }
  return undefined;
}

function guessDnaSequence(text: string): GuessOutcome | undefined {
  const sequence = text.match(DNA_SEQUENCE)?.[1];
  if (!sequence || !BASE_RUN.test(sequence.replace(SPACES_AND_DASHES, ''))) return undefined;
  const baseShare =
    sequence.replace(NON_BASES, '').length / sequence.replace(SEQUENCE_PUNCTUATION, '').length;
  if (baseShare <= MIN_BASE_SHARE) return undefined;
  return {
    group: 'mol',
    type: 'Oligo',
    why: 'reads as a DNA sequence',
    source: 'pattern',
    fields: { sequence: sequence.replace(WHITESPACE_RUNS, '').toUpperCase() },
  };
}

function guessSupply(text: string): GuessOutcome | undefined {
  const shape = guessSupplyShape(text);
  if (!shape) return undefined;
  return {
    group: 'supplies',
    type: shape.type,
    why: `“${shape.match}” reads as a ${shape.type.toLowerCase()}`,
    source: 'pattern',
    fields: shape.values,
  };
}

const ANTI_WORD = /(^|[\s(])(anti|α)\s?-?\s?(?!anti|biotic|fade|mycotic|body|bodies|oxidant|gen)/i;
const DOUBLE_ANTI = /anti-anti/i;

const findDyeFluorochrome = (key: string): Fluorochrome | undefined => {
  const fluorochrome = fluorochromeByKey.get(key);
  return fluorochrome?.isProtein ? undefined : fluorochrome;
};

const findTarget = (key: string): TargetHit | undefined =>
  isTargetKey(key) ? { isCytokine: isCytokineKey(key) } : undefined;

const longestThenLatest = <T>(first: TokenMatch<T>, second: TokenMatch<T>): number =>
  second.length - first.length || second.start - first.start;

function analyzeWords(text: string): WordAnalysis {
  const { amount, text: withoutAmount } = extractAmount(text);
  const nameText = withoutAmount.replace(WHITESPACE_RUNS, ' ').trim() || text;
  const tokens = tokenize(nameText);
  const used = new Set<number>();
  const lexiconHits = findMatches(tokens, key => lexiconByKey.get(key), used);
  const fluorochromeHits = findMatches(tokens, findDyeFluorochrome, used);
  const conjugateHits = findMatches(
    tokens,
    key => conjugateByKey.get(key),
    used,
    LONGEST_CONJUGATE_TOKENS
  );
  const targetHits = findMatches(
    tokens.map(toTargetToken),
    findTarget,
    used,
    LONGEST_TARGET_TOKENS
  );
  return {
    text,
    lowerText: text.toLowerCase(),
    nameText,
    singleToken: text.includes(' ') ? undefined : text,
    amount,
    tokens,
    lexiconHits,
    lexiconHit: [...lexiconHits].sort(longestThenLatest)[0],
    fluorochromeHits,
    fluorochrome: fluorochromeHits[0]?.hit,
    conjugateHits,
    conjugate: conjugateHits[0]?.hit,
    targetHits,
    target: targetHits[0],
    hasAnti: ANTI_WORD.test(nameText) && !DOUBLE_ANTI.test(nameText),
    keyword: KEYWORD_RULES.find(rule => rule.pattern.test(nameText)),
  };
}

const SPECIES_WORDS: PickTable = [
  [/\b(anti-?|α-?)?(human|hu|h)\b/i, 'Human'],
  [/\b(anti-?|α-?)?(mouse|murine|ms)\b/i, 'Mouse'],
  [/\b(anti-?|α-?)?(rat)\b/i, 'Rat'],
  [/\b(non-human primate|nhp|rhesus|cynomolgus|monkey)\b/i, 'Non-human primate'],
];
const KIT_WORD = /\bkits?\b/i;
const KIT_IN_NAME = /kit/i;
const RECOMBINANT_NAME = /\brecombinant\b|^r[hm]/i;
const ANTI_TARGET_WORDS = /\b(anti|α)-?\s*\w+/gi;
const HUMAN_CYTOKINE_NAME = /^r?h(?=IL|IFN|TNF|GM|M-|G-|TGF|FLT|SCF|EGF|FGF|VEGF|BMP|TPO|EPO)/i;
const MOUSE_CYTOKINE_NAME = /^r?m(?=IL|IFN|TNF|GM|M-|G-|TGF|FLT|SCF|EGF|FGF|VEGF|BMP|TPO|EPO)/i;

const keywordOutcome = (rule: KeywordRule, { nameText, amount }: WordAnalysis): GuessOutcome => ({
  group: rule.group,
  type: rule.type,
  why: rule.why ?? `“${(nameText.match(rule.pattern) ?? [''])[0].trim()}” in the name`,
  source: 'pattern',
  amount,
});

function recombinantSpecies(nameText: string): string | undefined {
  const named = pickFirst(nameText.replace(ANTI_TARGET_WORDS, ''), SPECIES_WORDS);
  if (named) return named;
  if (HUMAN_CYTOKINE_NAME.test(nameText)) return 'Human';
  return MOUSE_CYTOKINE_NAME.test(nameText) ? 'Mouse' : undefined;
}

const recombinantOutcome = (
  { nameText, amount }: WordAnalysis,
  target: TokenMatch<TargetHit>
): GuessOutcome => ({
  group: 'chem',
  type: 'Recombinant protein',
  why: `${target.text} is a cytokine or growth factor`,
  amount,
  fields: { species: recombinantSpecies(nameText) },
});

function labelledReagentOutcome(
  { fluorochrome, conjugate, amount }: WordAnalysis,
  { hit, text }: TokenMatch<LexiconHit>
): GuessOutcome {
  const fields: Fields = { ...hit.values };
  if (fluorochrome !== undefined || conjugate !== undefined) {
    fields['conjugate'] = fluorochrome?.name ?? conjugate;
  }
  if (hit.type === 'Dye' && fluorochrome?.laser) fields['laser'] = fluorochrome.laser;
  const known = fields['target'] === 'Viability' ? 'viability dye' : hit.type.toLowerCase();
  return { group: 'ab', type: hit.type, why: `${text}: known ${known}`, fields, amount };
}

const ISOTYPE_WORD = /\bisotype\b/i;
const SECONDARY =
  /\banti-?\s*(mouse|rabbit|rat|goat|human|chicken|donkey|hamster|armenian hamster|sheep|guinea pig|llama)\s*(ig[gmay]?\d?\w?|igg\s*\(h\s*\+\s*l\)|\(h\s*\+\s*l\)|h\s*\+\s*l|fc|f\(ab'?\)2|kappa|lambda)/i;
const SECONDARY_SPECIES_ONLY =
  /\banti-?\s*(mouse|rabbit|rat|goat|chicken|donkey|armenian hamster|hamster|sheep|guinea pig|llama)\b/i;
const HOST =
  /\b(mouse|rat|rabbit|goat|donkey|armenian hamster|syrian hamster|hamster|chicken|sheep|llama|alpaca|guinea pig|horse)\s+(anti|α|monoclonal|polyclonal|mab|igg|recombinant)/i;
const BIOTIN = /biotin/i;
const LEAF_FORMAT = /leaf/i;
const CROSS_ADSORBED = /cross[-\s]?adsorbed|highly cross/i;
const ISOTYPE = /\b(ig[gmade])\s*(\d[a-c]?)?\s*,?\s*(κ|kappa|λ|lambda)?/i;
const KAPPA = /κ|kappa/i;
const IG_PREFIX = /^ig/i;
const ISOTYPE_HOSTS: PickTable = [
  [/\brat\b/i, 'Rat'],
  [/\bmouse\b/i, 'Mouse'],
  [/\brabbit\b/i, 'Rabbit'],
  [/hamster/i, 'Armenian hamster'],
];
const CLONE_AFTER_WORD = /\bclone\s*:?\s*([A-Za-z0-9][\w./-]*)/i;
const DIGIT = /\d/;
const LETTER = /[A-Za-z]/;
const NUMERIC_CLONE = /^\d{1,4}[-.]\d[\w.-]*$/;
const NOT_A_CLONE = /^(anti|α|totalseq)/i;
const LONGEST_CLONE = 14;
const HOST_BEFORE_ANTI = /\b(mouse|rat|rabbit|goat|donkey|hamster|chicken|sheep)\s+anti/gi;
const HUMAN_MARKER_NAME = /\bh(cd\d|il-?\d)/i;
const MOUSE_MARKER_NAME = /\bm(cd\d|il-?\d)/i;

function readsAsAntibody({
  nameText,
  lexiconHit,
  fluorochrome,
  conjugate,
  target,
  hasAnti,
}: WordAnalysis): boolean {
  if (ISOTYPE_WORD.test(nameText)) return true;
  const isLabelled = fluorochrome !== undefined || conjugate !== undefined;
  if (target) {
    if (isLabelled || hasAnti) return true;
    const isPlainMarker =
      !target.hit.isCytokine &&
      !lexiconHit &&
      !FLUORESCENT_PROTEIN_KEYS.has(normalizeMaterialKey(target.text));
    if (isPlainMarker) return true;
  }
  return (fluorochrome !== undefined || hasAnti) && !lexiconHit;
}

const matchSecondary = (nameText: string, hasTarget: boolean): RegExpMatchArray | undefined =>
  nameText.match(SECONDARY) ??
  (hasTarget ? undefined : (nameText.match(SECONDARY_SPECIES_ONLY) ?? undefined));

function conjugateNameOf({ nameText, fluorochrome, conjugate }: WordAnalysis): string | undefined {
  if (fluorochrome) return fluorochrome.name;
  if (BIOTIN.test(nameText)) return 'Biotin';
  return conjugate && !LEAF_FORMAT.test(conjugate) ? conjugate : undefined;
}

function secondaryOutcome(
  { nameText, amount }: WordAnalysis,
  secondary: RegExpMatchArray,
  { hostSpecies, conjugateName }: AntibodyLabel
): GuessOutcome {
  const isotypePart = secondary[2] ? ` ${secondary[2].replace(WHITESPACE_RUNS, '')}` : '';
  return {
    group: 'ab',
    type: 'Secondary reagent',
    why: `“${secondary[0].trim()}” marks a secondary`,
    amount,
    fields: {
      'host-species': hostSpecies,
      'target-species-and-isotype': `${titleCase(secondary[1])}${isotypePart}`,
      conjugate: conjugateName,
      'cross-adsorbed': CROSS_ADSORBED.test(nameText) ? 'Yes' : undefined,
    },
  };
}

function isotypeNameOf(nameText: string): string | undefined {
  const isotype = nameText.match(ISOTYPE);
  if (!isotype) return undefined;
  const lightChain = isotype[3] ? `, ${KAPPA.test(isotype[3]) ? 'κ' : 'λ'}` : '';
  return `${isotype[1].replace(IG_PREFIX, 'Ig')}${isotype[2] ?? ''}${lightChain}`;
}

const isotypeOutcome = (
  { nameText, amount }: WordAnalysis,
  { hostSpecies, conjugateName }: AntibodyLabel
): GuessOutcome => ({
  group: 'ab',
  type: 'Isotype control',
  why: '“isotype” in the name',
  amount,
  fields: {
    isotype: isotypeNameOf(nameText),
    'host-species': hostSpecies ?? pickFirst(nameText, ISOTYPE_HOSTS),
    conjugate: conjugateName,
  },
});

const isCloneToken = (token: Token, index: number, consumed: ReadonlySet<number>): boolean =>
  !consumed.has(index) &&
  !ANTIBODY_STOP_WORDS.has(token.key) &&
  DIGIT.test(token.text) &&
  (LETTER.test(token.text) || NUMERIC_CLONE.test(token.text)) &&
  token.text.length <= LONGEST_CLONE &&
  !NOT_A_CLONE.test(token.text) &&
  !IG_PREFIX.test(token.text);

function cloneOf({
  nameText,
  tokens,
  fluorochromeHits,
  conjugateHits,
  targetHits,
}: WordAnalysis): string | undefined {
  const afterWord = nameText.match(CLONE_AFTER_WORD)?.[1];
  if (afterWord) return afterWord;
  const consumed = new Set(
    [...fluorochromeHits, ...conjugateHits, ...targetHits].flatMap(tokenIndexes)
  );
  return tokens.find((token, index) => isCloneToken(token, index, consumed))?.text;
}

function reactivityOf(nameText: string): string | undefined {
  const named = pickFirst(nameText.replace(HOST_BEFORE_ANTI, 'anti'), SPECIES_WORDS);
  if (named) return named;
  if (HUMAN_MARKER_NAME.test(nameText)) return 'Human';
  return MOUSE_MARKER_NAME.test(nameText) ? 'Mouse' : undefined;
}

function antibodyWhy({ fluorochromeHits, target, hasAnti }: WordAnalysis): string {
  if (fluorochromeHits.length > 0) return `${fluorochromeHits[0].text} is a fluorochrome`;
  if (!target) return '“anti-” marks an antibody';
  const kind = target.hit.isCytokine ? 'cytokine' : 'marker';
  return `${target.text.replace(ANTI_TOKEN_PREFIX, '')} is a ${kind}${hasAnti ? ', with “anti-”' : ''}`;
}

function antibodyOutcome(words: WordAnalysis): GuessOutcome | undefined {
  const { nameText, target, fluorochrome, amount } = words;
  const secondary = matchSecondary(nameText, target !== undefined);
  if (!secondary && !readsAsAntibody(words)) return undefined;
  const host = nameText.match(HOST)?.[1];
  const label = {
    hostSpecies: host ? titleCase(host) : undefined,
    conjugateName: conjugateNameOf(words),
  };
  if (secondary) return secondaryOutcome(words, secondary, label);
  if (ISOTYPE_WORD.test(nameText)) return isotypeOutcome(words, label);
  return {
    group: 'ab',
    type: 'Antibody',
    why: antibodyWhy(words),
    amount,
    fields: {
      target: target?.text,
      clone: cloneOf(words),
      'host-species': label.hostSpecies,
      reactivity: reactivityOf(nameText),
      conjugate: label.conjugateName,
      laser: fluorochrome?.laser,
    },
  };
}

const MIXTURE_MARK = /\+|\bwith\b|\bin\b|\bsupplemented\b|\bcontaining\b|%/i;
const VERSION = /\bv?(\d+(?:\.\d+){0,3})\b/i;
const GLUCOSE_LEVELS: PickTable = [
  [/high[-\s]?glucose|4\.5\s*g\/l/, 'High'],
  [/low[-\s]?glucose|1\s*g\/l/, 'Low'],
  [/no[-\s]?glucose|glucose[-\s]free/, 'None'],
];
const PHENOL_RED_FREE = /phenol[-\s]?red[-\s]?free|no phenol|without phenol/;
const GLUTAMINE_FORMS: PickTable = [
  [/glutamax/, 'GlutaMAX'],
  [/no[-\s]?glutamine|without (l-)?glutamine|glutamine[-\s]free/, 'None'],
  [/(with |\+ ?)(l-)?glutamine/, 'L-glutamine'],
];
const BUFFER_STRENGTH = /(\d+(?:\.\d+)?)\s*[x×]\b/i;
const WITHOUT_CALCIUM =
  /(without|no|w\/o|minus|-)\s*(ca|calcium)|ca\/mg[-\s]?free|calcium[-\s]?free|\(-\)\s*ca/i;
const WITH_CALCIUM = /(with|w\/|\+)\s*(ca|calcium)|\(\+\)\s*ca/i;
const HEAT_INACTIVATED = /heat[-\s]?inactivated|\bhi[-\s]/i;
const WITH_DAPI = /(with|\+|w\/)\s*dapi/i;
const WITHOUT_DAPI = /without dapi|no dapi/i;
const GENOTYPE_MARK = /(-\/-|fl\/fl|\bcre\b|\bko\b|knock)/i;
const GENOTYPE_WORD = /\S*(-\/-|fl\/fl|cre|ko)\S*/i;
const GENERIC_MOUSE_NAME = /^(mice|mouse|mus musculus)$/i;
const SPECIES_NAME = /^[A-Z]\.\s|^[A-Z][a-z]+ [a-z]+$|^[A-Z][a-z]+$|^yeast$/;
const AAV_SEROTYPE = /\bAAV[-\s]?(\d+|DJ|PHP\.\w+)\b/i;
const VSV_G = /\bVSV-?G\b/i;
const ANTICOAGULANTS: PickTable = [
  [/\bedta\b/, 'EDTA'],
  [/heparin/, 'Heparin'],
  [/citrate|acd/, 'Citrate'],
];
const PRESERVATIONS: PickTable = [
  [/ffpe|paraffin/, 'FFPE'],
  [/frozen|oct|snap/, 'Frozen'],
  [/fresh/, 'Fresh'],
];

function calciumAndMagnesiumOf(text: string): string | undefined {
  if (WITHOUT_CALCIUM.test(text)) return 'Without';
  return WITH_CALCIUM.test(text) ? 'With' : undefined;
}

function dapiOf(text: string): string | undefined {
  if (WITH_DAPI.test(text)) return 'With';
  return WITHOUT_DAPI.test(text) ? 'Without' : undefined;
}

function microbialDetails(lexiconHits: readonly TokenMatch<LexiconHit>[]): Fields {
  const microbes = lexiconHits
    .filter(match => match.hit.type === 'Microbial strain')
    .map(match => match.text);
  const species = microbes.find(microbe => SPECIES_NAME.test(microbe));
  return { species, strain: microbes.find(microbe => microbe !== species) };
}

function typeDetails(
  { text, lowerText, nameText, lexiconHits }: WordAnalysis,
  { hit, text: matchedName }: TokenMatch<LexiconHit>
): Fields {
  switch (hit.type) {
    case 'Software':
      return { version: nameText.match(VERSION)?.[1] };
    case 'Dataset':
      return { repository: matchedName };
    case 'Medium':
      return {
        glucose: pickFirst(lowerText, GLUCOSE_LEVELS),
        'phenol-red': PHENOL_RED_FREE.test(lowerText) ? 'No' : undefined,
        glutamine: pickFirst(lowerText, GLUTAMINE_FORMS),
      };
    case 'Buffer': {
      const strength = text.match(BUFFER_STRENGTH);
      return {
        strength: strength ? `${strength[1]}×` : undefined,
        'calcium-and-magnesium': calciumAndMagnesiumOf(text),
      };
    }
    case 'Supplement':
      return { 'heat-inactivated': HEAT_INACTIVATED.test(text) ? 'Yes' : undefined };
    case 'Coating or matrix':
      return { matrix: matchedName };
    case 'Mounting medium':
      return { dapi: dapiOf(text) };
    case 'Recombinant protein':
      return { species: pickFirst(text, SPECIES_WORDS) };
    case 'Organism':
      return {
        genotype: GENOTYPE_MARK.test(text) ? text.match(GENOTYPE_WORD)?.[0] : undefined,
        strain:
          hit.values['species'] === 'Mouse' && !GENERIC_MOUSE_NAME.test(matchedName)
            ? matchedName
            : undefined,
      };
    case 'Microbial strain':
      return microbialDetails(lexiconHits);
    case 'Virus or vector':
      return {
        'serotype-or-pseudotype': (text.match(AAV_SEROTYPE) ?? text.match(VSV_G))?.[0],
      };
    case 'Body fluid':
      return { anticoagulant: pickFirst(lowerText, ANTICOAGULANTS) };
    case 'Tissue':
      return { preservation: pickFirst(lowerText, PRESERVATIONS) };
    default:
      return {};
  }
}

function mixtureOutcome(
  { text, lexiconHits }: WordAnalysis,
  { hit }: TokenMatch<LexiconHit>
): GuessOutcome | undefined {
  const ingredients = lexiconHits.filter(
    match => match.hit.group === 'media' || match.hit.group === 'chem'
  );
  if (ingredients.length < 2 || !MIXTURE_MARK.test(text) || hit.type === 'Fix or perm') {
    return undefined;
  }
  return {
    group: 'media',
    type: ingredients.some(match => match.hit.type === 'Medium') ? 'Medium' : 'Buffer',
    why: `a mix of ${listWithAnd(ingredients.map(match => match.text))}`,
    name: text,
    fields: { recipe: text },
  };
}

function instrumentOutcome(
  raw: string,
  { hit, text }: TokenMatch<LexiconHit>,
  values: Record<string, string>,
  amount: MaterialAmount | undefined
): GuessOutcome {
  const { vendor, ...valuesWithoutVendor } = values;
  return {
    group: hit.group,
    type: hit.type,
    why: `${text}: known ${hit.type.toLowerCase()}`,
    name: raw.trim(),
    amount,
    baseValues: valuesWithoutVendor,
    fields: {
      ...hit.values,
      model: hit.isGeneric ? undefined : text,
      manufacturer: vendor,
    },
  };
}

function lexiconOutcome(
  raw: string,
  words: WordAnalysis,
  lexiconHit: TokenMatch<LexiconHit>,
  values: Record<string, string>
): GuessOutcome {
  const { hit, text } = lexiconHit;
  const { amount } = words;
  const mixture = mixtureOutcome(words, lexiconHit);
  if (mixture) return mixture;
  if (hit.group === 'equip') return instrumentOutcome(raw, lexiconHit, values, amount);
  if (amount && (hit.type === 'Chemical' || (hit.type === 'Solvent' && amount.unit !== '%'))) {
    return { group: 'media', type: 'Stock solution', why: `${text} with a concentration`, amount };
  }
  const known = hit.type === 'Other' ? 'supply' : hit.type.toLowerCase();
  return {
    group: hit.group,
    type: hit.type,
    why: `${text}: known ${known}`,
    amount,
    fields: { ...hit.values, ...typeDetails(words, lexiconHit) },
  };
}

const PEPTIDE_SEQUENCE = /^[ACDEFGHIKLMNPQRSTVWY]{7,40}$/;
const PDB_ID = /^\d[A-Za-z][A-Za-z0-9]{2}$/;

function fallbackOutcome(
  { singleToken, amount }: WordAnalysis,
  groupHint: MaterialLexiconGroup | undefined
): GuessOutcome {
  if (singleToken && PEPTIDE_SEQUENCE.test(singleToken)) {
    return {
      group: 'chem',
      type: 'Peptide',
      why: 'reads as a peptide sequence',
      source: 'pattern',
      fields: { sequence: singleToken },
    };
  }
  if (singleToken && PDB_ID.test(singleToken)) {
    return {
      group: 'soft',
      type: 'Dataset',
      why: `${singleToken} reads as a PDB ID`,
      source: 'pattern',
      fields: { repository: 'PDB', 'accession-number': singleToken },
    };
  }
  if (amount) {
    return {
      group: 'media',
      type: 'Stock solution',
      why: 'has a concentration',
      source: 'pattern',
      amount,
    };
  }
  if (groupHint) {
    return {
      group: groupHint,
      type: 'Other',
      why: 'from the table heading above it',
      source: 'pattern',
    };
  }
  return { group: 'unsorted', type: 'Other', why: 'not recognized', source: 'none' };
}

function guessFromWords(
  raw: string,
  words: WordAnalysis,
  values: Record<string, string>,
  groupHint: MaterialLexiconGroup | undefined
): GuessOutcome {
  const { nameText, lexiconHit, fluorochrome, conjugate, target, hasAnti, keyword, amount } = words;
  if (KIT_WORD.test(nameText) && !(lexiconHit && KIT_IN_NAME.test(lexiconHit.text))) {
    return { group: 'kits', type: 'Kit', why: '“kit” in the name', source: 'pattern', amount };
  }
  const isPlainName = !fluorochrome && !conjugate && !hasAnti;
  if (isPlainName && keyword && !lexiconHit && DECISIVE_KEYWORD_TYPES.has(keyword.type)) {
    return keywordOutcome(keyword, words);
  }
  if (isPlainName && target?.hit.isCytokine && RECOMBINANT_NAME.test(nameText)) {
    return recombinantOutcome(words, target);
  }
  if (lexiconHit?.hit.group === 'ab') return labelledReagentOutcome(words, lexiconHit);
  const antibody = antibodyOutcome(words);
  if (antibody) return antibody;
  if (lexiconHit) return lexiconOutcome(raw, words, lexiconHit, values);
  if (target?.hit.isCytokine) return recombinantOutcome(words, target);
  if (keyword && !(target && keyword.type === 'Antibody')) return keywordOutcome(keyword, words);
  return fallbackOutcome(words, groupHint);
}

const assembleGuess = (
  outcome: GuessOutcome,
  defaultName: string,
  values: Record<string, string>
): MaterialGuess => ({
  group: outcome.group,
  type: outcome.type,
  name: outcome.name ?? defaultName,
  values: { ...(outcome.baseValues ?? values), ...withoutBlanks(outcome.fields ?? {}) },
  amount: outcome.amount,
  why: outcome.why,
  source: outcome.source ?? 'list',
});

function guessFromText(raw: string, context: MaterialGuessContext): MaterialGuess {
  const { text, values } = readIdentifiers(raw, context);
  const patternOutcome = guessAccession(text) ?? guessDnaSequence(text) ?? guessSupply(text);
  if (patternOutcome) return assembleGuess(patternOutcome, text, values);
  const words = analyzeWords(text);
  return assembleGuess(
    guessFromWords(raw, words, values, context.groupHint),
    words.nameText,
    values
  );
}

function withTherapeuticAntibody(guess: MaterialGuess): MaterialGuess {
  const antibody = guess.name.match(THERAPEUTIC_ANTIBODY)?.[0];
  if (!antibody || guess.group === 'ab') return guess;
  return {
    ...guess,
    group: 'ab',
    type: 'Antibody',
    why: `${antibody} is a therapeutic antibody`,
  };
}

export function guessMaterial(
  raw: string,
  remembered: ReadonlyMap<string, RememberedMaterialKind>,
  context: MaterialGuessContext = {}
): MaterialGuess {
  const guess = withTherapeuticAntibody(guessFromText(raw, context));
  const memory =
    remembered.get(normalizeMaterialKey(guess.name)) ?? remembered.get(normalizeMaterialKey(raw));
  if (!memory || (memory.group === guess.group && memory.type === guess.type)) return guess;
  return {
    ...guess,
    group: memory.group,
    type: memory.type,
    why: memory.why ?? 'you filed it this way before',
    source: 'yours',
  };
}

const LINE_BREAK = /\r?\n/;
const LIST_BULLET = /^\s*(\d+[.)]|[-•*·–])\s+/;
const TRAILING_COLON_OR_TAB = /[:\t]+$/;
const TAB_RUN = /\t+/;

export function splitPastedMaterials(text: string): PastedMaterialRow[] {
  const rows: PastedMaterialRow[] = [];
  let groupHint: MaterialLexiconGroup | undefined;
  for (const line of text.split(LINE_BREAK)) {
    const row = line.replace(LIST_BULLET, '').trim();
    if (!row || KEY_RESOURCES_HEADER_ROW.test(row)) continue;
    const headingText = row.replace(TRAILING_COLON_OR_TAB, '').trim();
    const heading = KEY_RESOURCES_HEADINGS.find(({ pattern }) => pattern.test(headingText));
    if (heading) {
      groupHint = heading.group;
      continue;
    }
    const [name, vendor, identifier] = row.split(TAB_RUN).map(cell => cell.trim());
    rows.push({
      text: name,
      context: { groupHint, vendor: vendor || undefined, identifier: identifier || undefined },
    });
  }
  return rows;
}
