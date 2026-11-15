import { UNIT_REGISTRY, formatQuantity, type UnitKind } from '@odysseus/shared-schemas';

export interface TextAmount {
  start: number;
  end: number;
  text: string;
  value: number | undefined;
  isRange: boolean;
  unit: string | undefined;
  kind: UnitKind | undefined;
}

const UNIT_SPELLINGS: ReadonlyArray<[unit: string, spellings: readonly string[]]> = [
  ['%', ['%', 'percent']],
  ['X', ['×', 'x', 'X', 'fold']],
  ['nL', ['nL', 'nl']],
  ['µL', ['µL', 'µl', 'μL', 'μl', 'uL', 'ul']],
  ['mL', ['mL', 'ml']],
  ['L', ['L', 'l']],
  ['pg', ['pg']],
  ['ng', ['ng']],
  ['µg', ['µg', 'μg', 'ug']],
  ['mg', ['mg']],
  ['kg', ['kg']],
  ['cells', ['cells', 'cell']],
  ['cells/mL', ['cells/mL', 'cells/ml', 'cell/mL', 'cell/ml']],
  ['pg/mL', ['pg/mL', 'pg/ml']],
  ['ng/mL', ['ng/mL', 'ng/ml']],
  ['µg/mL', ['µg/mL', 'µg/ml', 'μg/mL', 'μg/ml', 'ug/mL', 'ug/ml']],
  ['mg/mL', ['mg/mL', 'mg/ml']],
  ['ng/µL', ['ng/µL', 'ng/µl', 'ng/μL', 'ng/uL', 'ng/ul']],
  ['pM', ['pM']],
  ['nM', ['nM']],
  ['µM', ['µM', 'μM', 'uM']],
  ['mM', ['mM']],
  ['M', ['M']],
  ['s', ['s', 'sec', 'secs', 'second', 'seconds']],
  ['min', ['min', 'mins', 'minute', 'minutes']],
  ['h', ['h', 'hr', 'hrs', 'hour', 'hours']],
  ['d', ['d', 'day', 'days']],
  ['wk', ['wk', 'week', 'weeks']],
  ['°C', ['°C', 'ºC', 'C']],
  ['× g', ['× g', '×g', 'x g', 'xg', 'rcf', 'RCF']],
  ['rpm', ['rpm', 'RPM']],
];

const GRAM_SPELLING = 'g';
const MIN_G_FORCE = 100;

const PHRASES: ReadonlyArray<[pattern: RegExp, kind: UnitKind]> = [
  [/\bovernight\b/gi, 'time'],
  [/\broom temperature\b/gi, 'temperature'],
  [/\bRT\b/g, 'temperature'],
  [/\bon ice\b/gi, 'temperature'],
];

const UNIT_BY_SPELLING = new Map(
  UNIT_SPELLINGS.flatMap(([unit, spellings]) =>
    spellings.flatMap(spelling => [
      [spelling, unit] as const,
      [spelling.replace(/\s/g, ''), unit] as const,
    ])
  )
);

const KIND_BY_UNIT = new Map(UNIT_REGISTRY.map(entry => [entry.id, entry.kind]));

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SPELLING_ALTERNATION = [...UNIT_BY_SPELLING.keys(), GRAM_SPELLING]
  .sort((a, b) => b.length - a.length)
  .map(escape)
  .join('|');

const NUMBER = String.raw`\d[\d,]*(?:\.\d+)?`;
const UNIT_AMOUNT = new RegExp(
  String.raw`(?<![A-Za-z\d.\-])(-?${NUMBER})(\s?[-–]\s?${NUMBER})?\s?(${SPELLING_ALTERNATION})(?![A-Za-zµμ/\d])`,
  'g'
);
const RATIO = /(?<![A-Za-z\d:])\d+:\d+(?![\d:])/g;

const numberOf = (text: string) => Number(text.replace(/,/g, ''));

const PHRASE_LABELS: ReadonlyArray<[pattern: RegExp, label: string]> = [
  [/^room temperature$/i, 'RT'],
  [/^on ice$/i, 'on ice'],
  [/^overnight$/i, 'overnight'],
];

export function amountLabel(amount: TextAmount): string {
  if (amount.unit && amount.value !== undefined && !amount.isRange) {
    return formatQuantity(amount.value, amount.unit);
  }
  return PHRASE_LABELS.find(([pattern]) => pattern.test(amount.text))?.[1] ?? amount.text;
}

export function amountUnit(spelling: string, value: number | undefined): string | undefined {
  // PITFALL: a bare "g" is g-force in a spin and grams on a balance; protocols spin at 100 × g or more and rarely weigh that much.
  if (spelling === GRAM_SPELLING) {
    if (value === undefined) return undefined;
    return value >= MIN_G_FORCE ? '× g' : 'g';
  }
  const compact = spelling.replace(/\s/g, '');
  return (
    UNIT_BY_SPELLING.get(spelling) ??
    UNIT_BY_SPELLING.get(compact) ??
    UNIT_BY_SPELLING.get(compact.toLowerCase())
  );
}

export function readTypedAmount(text: string): { value: string; unit: string } | undefined {
  const trimmed = text.trim();
  const [amount] = findAmounts(trimmed);
  const isWhole = amount?.start === 0 && amount.end === trimmed.length;
  if (!isWhole || !amount.unit || amount.value === undefined || amount.isRange) return undefined;
  return { value: String(amount.value), unit: amount.unit };
}

export function findAmounts(text: string): TextAmount[] {
  const found: TextAmount[] = [];
  for (const match of text.matchAll(UNIT_AMOUNT)) {
    const value = numberOf(match[1]);
    const unit = amountUnit(match[3], value);
    if (!unit) continue;
    const start = match.index ?? 0;
    found.push({
      start,
      end: start + match[0].length,
      text: match[0],
      value,
      isRange: !!match[2],
      unit,
      kind: KIND_BY_UNIT.get(unit),
    });
  }
  for (const [pattern, kind] of PHRASES) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      found.push({
        start,
        end: start + match[0].length,
        text: match[0],
        value: undefined,
        isRange: false,
        unit: undefined,
        kind,
      });
    }
  }
  for (const match of text.matchAll(RATIO)) {
    const start = match.index ?? 0;
    found.push({
      start,
      end: start + match[0].length,
      text: match[0],
      value: undefined,
      isRange: false,
      unit: undefined,
      kind: undefined,
    });
  }
  found.sort((a, b) => a.start - b.start);
  const kept: TextAmount[] = [];
  for (const amount of found) {
    const last = kept[kept.length - 1];
    if (!last || amount.start >= last.end) kept.push(amount);
  }
  return kept;
}
