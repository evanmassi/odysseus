import { unitScale } from '@odysseus/shared-schemas';

import { amountLabel, findAmounts, type TextAmount } from '../units/textAmounts';

import { actionProse, leadVerb } from './stepKinds';

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

const OTHER_CONDITIONS: ReadonlyArray<[pattern: RegExp, label: (match: string) => string]> = [
  [/in the dark|protected from light/i, () => 'dark'],
  [/\bshaking\b|on a shaker|\brocking\b/i, () => 'shaking'],
  [/\d+(?:\.\d+)?\s?%\s?CO2/i, match => match],
];
const OTHER_CONDITION_PHRASES = OTHER_CONDITIONS.map(
  ([pattern]) =>
    new RegExp(`\\s+(?:at\\s+|in\\s+|with\\s+)?(?:${pattern.source})`, `g${pattern.flags}`)
);
const WAIT_PHRASE_LEAD = /\s+(?:(?:for|at|in|with)\s+)?$/;
const OVERNIGHT = /^overnight$/i;
const SECONDS_PER_MINUTE = 60;

const isWaitAmount = (amount: TextAmount) =>
  amount.kind === 'time' || amount.kind === 'temperature';

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

const verbOf = (text: string): string => leadVerb(text).base;

export function stepTime(text: string): StepTime | undefined {
  const time = findAmounts(text).find(amount => amount.kind === 'time');
  if (!time) return undefined;
  if (OVERNIGHT.test(time.text)) return { label: 'overnight', minutes: 0, isOvernight: true };
  const seconds = unitScale(time.unit ?? '')?.factor ?? SECONDS_PER_MINUTE;
  return {
    label: amountLabel(time),
    minutes: ((time.value ?? 0) * seconds) / SECONDS_PER_MINUTE,
    isOvernight: false,
  };
}

function conditionsOf(text: string): string[] {
  const temperatures = findAmounts(text)
    .filter(amount => amount.kind === 'temperature')
    .map(amountLabel);
  const others = OTHER_CONDITIONS.flatMap(([pattern, label]) => {
    const match = pattern.exec(text);
    return match ? [label(match[0])] : [];
  });
  return [...new Set([...temperatures, ...others])];
}

const sentence = (text: string) => `${text.trim().replace(/[\s,;.]+$/, '')}.`;

function withoutWaitPhrases(text: string): string {
  let remaining = text;
  for (const amount of findAmounts(text).filter(isWaitAmount).reverse()) {
    const before = remaining.slice(0, amount.start);
    const lead = WAIT_PHRASE_LEAD.exec(before);
    const cutFrom = lead ? before.length - lead[0].length : amount.start;
    remaining = remaining.slice(0, cutFrom) + remaining.slice(amount.end);
  }
  return OTHER_CONDITION_PHRASES.reduce((rest, phrase) => rest.replace(phrase, ''), remaining);
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
  const lead = leadAction(text);
  const leadTime = stepTime(lead);
  if (REAGENT_VERBS.has(verb) && leadTime) {
    const rest = text.slice(lead.length);
    return {
      action: rest ? withoutWaitPhrases(lead) + rest : sentence(withoutWaitPhrases(lead)),
      wait: { time: leadTime, conditions: conditionsOf(lead) },
    };
  }
  return { action: text, wait: undefined };
}

function leadAction(text: string): string {
  let length = 0;
  let verbCount = 0;
  for (const piece of actionProse(text, true)) {
    if (piece.kind === 'verb' && verbCount++ > 0) return text.slice(0, length);
    length += piece.text.length;
  }
  return text;
}

export function durationText(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const rest = rounded % 60;
  return `${Math.floor(rounded / 60)} h${rest ? ` ${rest} min` : ''}`;
}
