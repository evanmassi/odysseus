import { leadVerb } from './stepKinds';

export interface StepTime {
  label: string;
  minutes: number;
  isOvernight: boolean;
}

export interface StepWait {
  time: StepTime;
  conditions: string[];
}

export interface StepWaitSplit {
  action: string | undefined;
  wait: StepWait | undefined;
}

const TIME_PATTERN =
  /(\d+(?:\.\d+)?)(?:\s?[-–]\s?\d+(?:\.\d+)?)?\s?(seconds?|secs?|s|minutes?|mins?|hours?|hrs?|h|days?)\b|overnight/i;
const TIME_PHRASE = new RegExp(`(?:\\s+for)?\\s+(?:${TIME_PATTERN.source})`, 'gi');

const CONDITIONS: ReadonlyArray<[pattern: RegExp, label: (match: string) => string]> = [
  [/-?\d+(?:\.\d+)?\s?°C/i, match => match.replace(/\s?°C/, ' °C')],
  [/room temperature/i, () => 'RT'],
  [/\bRT\b/, () => 'RT'],
  [/\bon ice\b/i, () => 'on ice'],
  [/in the dark|protected from light/i, () => 'dark'],
  [/\bshaking\b|on a shaker|\brocking\b/i, () => 'shaking'],
  [/\d+(?:\.\d+)?\s?%\s?CO2/i, match => match],
];
const CONDITION_PHRASES = CONDITIONS.map(
  ([pattern]) =>
    new RegExp(`\\s+(?:at\\s+|in\\s+|with\\s+)?(?:${pattern.source})`, `g${pattern.flags}`)
);

const WAIT_VERBS = new Set([
  'incubate',
  'rest',
  'leave',
  'wait',
  'stand',
  'sit',
  'culture',
  'keep',
  'store',
]);
const REAGENT_VERBS = new Set([
  'add',
  'block',
  'coat',
  'fix',
  'label',
  'lyse',
  'permeabilize',
  'resuspend',
  'stain',
  'stimulate',
  'treat',
]);
const JOINED_WAIT =
  /^(.*?)(?:[,;]\s*(?:then\s+)?|\s+(?:and|then)\s+)(incubate|rest|leave|wait|stand|sit|keep)\b(.*)$/i;

const MINUTES_PER_UNIT: ReadonlyArray<[prefix: string, minutes: number]> = [
  ['mi', 1],
  ['s', 1 / 60],
  ['h', 60],
  ['d', 24 * 60],
];

const verbOf = (text: string): string => leadVerb(text).base;

export function stepTime(text: string): StepTime | undefined {
  const match = TIME_PATTERN.exec(text);
  if (!match) return undefined;
  if (!match[1]) return { label: 'overnight', minutes: 0, isOvernight: true };
  const unit = match[2].toLowerCase();
  const perUnit = MINUTES_PER_UNIT.find(([prefix]) => unit.startsWith(prefix))?.[1] ?? 1;
  return { label: match[0], minutes: parseFloat(match[1]) * perUnit, isOvernight: false };
}

function conditionsOf(text: string): string[] {
  return CONDITIONS.flatMap(([pattern, label]) => {
    const match = pattern.exec(text);
    return match ? [label(match[0])] : [];
  });
}

const sentence = (text: string) => `${text.trim().replace(/[\s,;.]+$/, '')}.`;

function withoutWaitPhrases(text: string): string {
  return CONDITION_PHRASES.reduce(
    (remaining, phrase) => remaining.replace(phrase, ''),
    text.replace(TIME_PHRASE, '')
  );
}

export function splitStepWait(text: string): StepWaitSplit {
  const time = stepTime(text);
  if (!time) return { action: text, wait: undefined };
  const verb = verbOf(text);
  if (WAIT_VERBS.has(verb)) {
    return { action: undefined, wait: { time, conditions: conditionsOf(text) } };
  }
  const joined = JOINED_WAIT.exec(text);
  const joinedTime = joined && stepTime(joined[3]);
  if (joined && joinedTime) {
    return {
      action: sentence(joined[1]),
      wait: { time: joinedTime, conditions: conditionsOf(joined[3]) },
    };
  }
  if (REAGENT_VERBS.has(verb)) {
    return {
      action: sentence(withoutWaitPhrases(text)),
      wait: { time, conditions: conditionsOf(text) },
    };
  }
  return { action: text, wait: undefined };
}

const escapeForPattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function withoutTime(text: string, time: StepTime): string {
  const phrase = new RegExp(`(^|\\s+)(?:for\\s+)?${escapeForPattern(time.label)}`, 'i');
  return text.replace(phrase, '').trim();
}

export function durationText(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const rest = rounded % 60;
  return `${Math.floor(rounded / 60)} h${rest ? ` ${rest} min` : ''}`;
}
