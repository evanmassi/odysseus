import { nameKey, type BoardCalculation } from '../formulas/boardCalculation';
import { stepNumbers } from '../steps/stepNumbering';
import { STEP_VERBS } from '../steps/stepVerbs';

import { normalizeMaterialKey } from './materialGuesser';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

interface ReadingUse {
  stepId: string;
  stepNumber: string;
  start: number;
  end: number;
}

export interface MaterialReading {
  key: string;
  name: string;
  isOnBoard: boolean;
  uses: ReadingUse[];
}

interface Phrase {
  start: number;
  end: number;
  name: string;
  isReference: boolean;
}

const PHRASE_STOP = new Set([
  'per',
  'to',
  'into',
  'in',
  'and',
  'for',
  'at',
  'on',
  'with',
  'from',
  'then',
  'until',
  'by',
  'or',
  'of',
  'the',
  'a',
  'an',
  'each',
  'is',
  'are',
  'was',
  'before',
  'after',
  'while',
  'using',
]);
const NOT_MATERIALS = new Set([
  'day',
  'step',
  'steps',
  'section',
  'note',
  'optional',
  'repeat',
  'see',
  'then',
  'all',
  'each',
]);
const PHRASE_WORD_LIMIT = 4;
const STEP_QUANTITY =
  /(?<![\w.-])(\d+(?:[.,]\d+)*)\s?(pg\/mL|ng\/mL|µg\/mL|mg\/mL|µL|uL|ul|mL|ml|nL|L|pg|ng|µg|ug|mg|cells|nM|µM|uM|mM|minutes?|mins?|hours?|hrs?|h|seconds?|secs?|s|°C|[×x]\s?g|rpm)(?![\w/µ])/g;
const AMOUNT_UNIT = /^(?:[pnµu]g\/mL|mg\/mL|[µu][lL]|m[lL]|nL|L|[pnµu]g|mg|cells|nM|[µu]M|mM)$/;
const AMOUNT_LEAD = /^\s+(of\s+)?(the\s+)?/;
const MATERIAL_CUE =
  /(?:(?:^|[.;]\s+)\s*([A-Za-z]+)\s+|\b(?:with|in|into|using|from|of|on)\s+(?:the\s+)?)(?=[A-Z])/g;
const LOCKED_SPANS = /\{[^}]+\}|‹[^›]*›/g;
const STARTS_UPPERCASE = /^[A-Z]/;
const STARTS_DIGIT = /^\d/;

function phraseAt(text: string, start: number): Phrase | undefined {
  if (text[start] === '{') {
    const close = text.indexOf('}', start);
    if (close < 0) return undefined;
    return { start, end: close + 1, name: text.slice(start + 1, close), isReference: true };
  }
  const word = /[A-Za-z0-9µ][\w+\-/µ]*/y;
  let end = start;
  let count = 0;
  while (count < PHRASE_WORD_LIMIT) {
    word.lastIndex = count ? end + 1 : start;
    const match = word.exec(text);
    if (!match) break;
    const isStop =
      count > 0 && (PHRASE_STOP.has(match[0].toLowerCase()) || STARTS_DIGIT.test(match[0]));
    if (isStop) break;
    end = match.index + match[0].length;
    count++;
    if (text[end] !== ' ') break;
  }
  return count ? { start, end, name: text.slice(start, end), isReference: false } : undefined;
}

const isNotMaterial = (phrase: Phrase) =>
  NOT_MATERIALS.has(phrase.name.split(' ')[0].toLowerCase());

const boardMaterials = (protocol: Protocol): MaterialItem[] =>
  protocol.blocks
    .flatMap(block => (block.type === 'materials' ? block.items : []))
    .filter(item => item.name.trim());

export function readMaterialReadings(
  protocol: Protocol,
  calculation: BoardCalculation
): MaterialReading[] {
  const onBoard = new Map(
    boardMaterials(protocol).map(item => [normalizeMaterialKey(item.name), item])
  );
  const readings = new Map<string, MaterialReading>();
  const noteMaterial = (name: string, use: ReadingUse) => {
    const material = onBoard.get(normalizeMaterialKey(name));
    const key = `material:${normalizeMaterialKey(name)}`;
    const reading = readings.get(key) ?? {
      key,
      name: material?.name.trim() ?? name,
      isOnBoard: !!material,
      uses: [],
    };
    if (!reading.uses.some(seen => seen.stepId === use.stepId && seen.start === use.start)) {
      reading.uses.push(use);
    }
    readings.set(key, reading);
  };

  for (const page of protocol.pages) {
    const numbers = stepNumbers(page.steps);
    for (const step of page.steps) {
      if (step.kind !== 'step') continue;
      const { text } = step;
      const locked = [...text.matchAll(LOCKED_SPANS)].map(match => [
        match.index ?? 0,
        (match.index ?? 0) + match[0].length,
      ]);
      const isLocked = (index: number) => locked.some(([from, to]) => index >= from && index < to);
      const at = { stepId: step.id, stepNumber: (numbers.get(step.id) ?? '').replace('.', '') };

      for (const match of text.matchAll(STEP_QUANTITY)) {
        const index = match.index ?? 0;
        if (isLocked(index) || !AMOUNT_UNIT.test(match[2].replace(/\s/g, ''))) continue;
        const end = index + match[0].length;
        const lead = AMOUNT_LEAD.exec(text.slice(end));
        const phrase = lead ? phraseAt(text, end + lead[0].length) : undefined;
        if (!lead || !phrase || phrase.isReference || isNotMaterial(phrase)) continue;
        if (!lead[1] && !STARTS_UPPERCASE.test(phrase.name)) continue;
        noteMaterial(phrase.name, { ...at, start: phrase.start, end: phrase.end });
      }

      for (const match of text.matchAll(MATERIAL_CUE)) {
        if (match[1] && !STEP_VERBS.has(match[1].toLowerCase())) continue;
        const phrase = phraseAt(text, (match.index ?? 0) + match[0].length);
        if (!phrase || isLocked(phrase.start) || isNotMaterial(phrase)) continue;
        const known = calculation.names.get(nameKey(phrase.name));
        if (known && known.kind !== 'item') continue;
        noteMaterial(phrase.name, { ...at, start: phrase.start, end: phrase.end });
      }
    }
  }

  const ignored = new Set(protocol.ignoredReadings);
  return [...readings.values()].filter(reading => !ignored.has(reading.key));
}

export function readingStepsText(uses: readonly ReadingUse[]): string {
  const numbers = [...new Set(uses.map(use => use.stepNumber))];
  return `step${numbers.length === 1 ? '' : 's'} ${numbers.join(', ')}`;
}

export function acceptMaterialReadings(
  protocol: Protocol,
  blockId: string,
  readings: readonly MaterialReading[],
  createMaterial: (name: string) => MaterialItem
): void {
  const block = protocol.blocks.find(candidate => candidate.id === blockId);
  if (block?.type !== 'materials') return;
  const edits = new Map<string, ReadingUse & { text: string }>();
  for (const reading of readings) {
    const key = normalizeMaterialKey(reading.name);
    let material = boardMaterials(protocol).find(item => normalizeMaterialKey(item.name) === key);
    if (!material) {
      material = createMaterial(reading.name);
      block.items.push(material);
      const { group } = material;
      block.foldedGroups = block.foldedGroups.filter(folded => folded !== group);
    }
    const text = `{${material.name.trim()}}`;
    for (const use of reading.uses) edits.set(`${use.stepId}:${use.start}`, { ...use, text });
  }
  const steps = new Map(protocol.pages.flatMap(page => page.steps).map(step => [step.id, step]));
  for (const edit of [...edits.values()].sort((x, y) => y.start - x.start)) {
    const step = steps.get(edit.stepId);
    if (step) step.text = step.text.slice(0, edit.start) + edit.text + step.text.slice(edit.end);
  }
}
