import { normalizeMaterialKey } from '@odysseus/shared-schemas';

import { firstCardOrNew } from '../cards/createCard';
import { nameKey, type SolvedBoard } from '../formulas/boardCalculation';
import { createId } from '../ids/createId';
import { ensureMaterial, shortNameOf } from '../materials/materialLookup';
import {
  CELLS_PER_WELL,
  CONDITION_NOUNS,
  conditionMeasure,
  FINAL_CONCENTRATION,
  MASS,
  MASS_PER_WELL,
  VOLUME,
  VOLUME_PER_WELL,
} from '../terms/termList';
import { findAmounts } from '../units/textAmounts';
import { insertAfterPeers, materialRowId } from '../values/valueEdits';
import { joinValueName } from '../values/valueNames';

import { stepNumbers } from './stepNumbering';
import { stepVerbBase } from './stepVerbs';

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

export interface ValueReading {
  key: string;
  name: string;
  material: string | undefined;
  label: string;
  value: string;
  unit: string;
  uses: ReadingUse[];
  materialUses: ReadingUse[];
}

interface StepReadings {
  materials: MaterialReading[];
  values: ValueReading[];
}

interface Phrase {
  start: number;
  end: number;
  name: string;
  isReference: boolean;
}

interface ValueDraft extends ValueReading {
  isCondition: boolean;
  isConflicting: boolean;
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
const AMOUNT_LABELS: Readonly<Record<string, string>> = {
  volume: VOLUME.word,
  mass: MASS.word,
  'cell-count': 'Cells',
  'mass-conc': FINAL_CONCENTRATION.word,
  molarity: FINAL_CONCENTRATION.word,
};
const PER_WELL_LABELS: Readonly<Record<string, string>> = {
  volume: VOLUME_PER_WELL.word,
  mass: MASS_PER_WELL.word,
  'cell-count': CELLS_PER_WELL.word,
};
const PHRASE_WORD_LIMIT = 4;
const AMOUNT_LEAD = /^\s+(of\s+)?(the\s+)?/;
const PER_WELL = /^\s+per\s+well\b/i;
const SENTENCE_BREAK = /[.;]\s/;
const WORD = /[A-Za-z]+/g;
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

function conditionNoun(textBefore: string): string | undefined {
  const sentence = textBefore.split(SENTENCE_BREAK).pop() ?? '';
  const bases = (sentence.match(WORD) ?? []).map(word => stepVerbBase(word));
  const verb = bases.reverse().find(base => base && CONDITION_NOUNS[base]);
  return verb && CONDITION_NOUNS[verb];
}

export function readStepReadings(protocol: Protocol, board: SolvedBoard): StepReadings {
  const listed = protocol.materials.items.filter(item => item.name.trim());
  const onBoard = new Map([
    ...listed
      .filter(shortNameOf)
      .map(item => [normalizeMaterialKey(shortNameOf(item)), item] as const),
    ...listed.map(item => [normalizeMaterialKey(item.name), item] as const),
  ]);
  const materials = new Map<string, MaterialReading>();
  const values = new Map<string, ValueDraft>();

  const noteMaterial = (name: string, use: ReadingUse) => {
    const material = onBoard.get(normalizeMaterialKey(name));
    const key = `material:${normalizeMaterialKey(material?.name ?? name)}`;
    const reading = materials.get(key) ?? {
      key,
      name: material?.name.trim() ?? name,
      isOnBoard: !!material,
      uses: [],
    };
    if (!reading.uses.some(seen => seen.stepId === use.stepId && seen.start === use.start)) {
      reading.uses.push(use);
    }
    materials.set(key, reading);
    return reading.name;
  };

  const noteValue = (
    found: Pick<ValueDraft, 'material' | 'label' | 'value' | 'unit' | 'isCondition'>,
    use: ReadingUse,
    materialUse: ReadingUse | undefined
  ) => {
    const name = found.material ? joinValueName(found.material, found.label) : found.label;
    const key = `value:${nameKey(name)}`;
    const reading = values.get(key) ?? {
      ...found,
      key,
      name,
      uses: [],
      materialUses: [],
      isConflicting: false,
    };
    if (reading.value !== found.value || reading.unit !== found.unit) reading.isConflicting = true;
    reading.uses.push(use);
    if (materialUse) reading.materialUses.push(materialUse);
    values.set(key, reading);
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

      for (const amount of findAmounts(text)) {
        const { start: index, end, unit, kind } = amount;
        if (isLocked(index) || !unit || !kind || amount.value === undefined || amount.isRange) {
          continue;
        }
        const use = { ...at, start: index, end };
        const value = String(amount.value);
        const amountNoun = AMOUNT_LABELS[kind];
        if (amountNoun) {
          const lead = AMOUNT_LEAD.exec(text.slice(end));
          const phrase = lead ? phraseAt(text, end + lead[0].length) : undefined;
          if (!lead || !phrase || isNotMaterial(phrase)) continue;
          if (!lead[1] && !phrase.isReference && !STARTS_UPPERCASE.test(phrase.name)) continue;
          const referenced = phrase.isReference
            ? onBoard.get(normalizeMaterialKey(phrase.name))
            : undefined;
          if (phrase.isReference && !referenced) continue;
          const materialUse = phrase.isReference
            ? undefined
            : { ...at, start: phrase.start, end: phrase.end };
          const material = referenced
            ? referenced.name.trim()
            : noteMaterial(phrase.name, { ...at, start: phrase.start, end: phrase.end });
          const perWell = PER_WELL.test(text.slice(phrase.end));
          const label = (perWell ? PER_WELL_LABELS[kind] : undefined) ?? amountNoun;
          noteValue({ material, label, value, unit, isCondition: false }, use, materialUse);
        } else if (conditionMeasure(kind)) {
          const noun = conditionNoun(text.slice(0, index));
          if (noun) {
            noteValue(
              {
                material: undefined,
                label: `${noun} ${conditionMeasure(kind)}`,
                value,
                unit,
                isCondition: true,
              },
              use,
              undefined
            );
          }
        }
      }

      for (const match of text.matchAll(MATERIAL_CUE)) {
        if (match[1] && !stepVerbBase(match[1])) continue;
        const phrase = phraseAt(text, (match.index ?? 0) + match[0].length);
        if (!phrase || isLocked(phrase.start) || isNotMaterial(phrase)) continue;
        const known = board.names.get(nameKey(phrase.name));
        if (known && known.kind !== 'item') continue;
        noteMaterial(phrase.name, { ...at, start: phrase.start, end: phrase.end });
      }
    }
  }

  const ignored = new Set(protocol.ignoredSuggestions);
  const shownValues = [...values.values()].filter(
    ({ isConflicting, isCondition, name, uses, key }) =>
      !isConflicting &&
      !board.names.has(nameKey(name)) &&
      (!isCondition || new Set(uses.map(use => use.stepId)).size > 1) &&
      !ignored.has(key)
  );
  return {
    materials: [...materials.values()].filter(reading => !ignored.has(reading.key)),
    values: shownValues.map(
      ({ key, name, material, label, value, unit, uses, materialUses }): ValueReading => ({
        key,
        name,
        material,
        label,
        value,
        unit,
        uses,
        materialUses,
      })
    ),
  };
}

export function readingStepsText(uses: readonly ReadingUse[]): string {
  const numbers = [...new Set(uses.map(use => use.stepNumber))];
  return `step${numbers.length === 1 ? '' : 's'} ${numbers.join(', ')}`;
}

function addValueFor(
  draft: Protocol,
  material: MaterialItem | undefined,
  reading: ValueReading
): string {
  firstCardOrNew(draft, 'values');
  const valueRowId = material ? materialRowId(draft, material.id) : '';
  insertAfterPeers(draft.values, valueRowId, [
    {
      id: createId(),
      name: reading.label,
      value: reading.value,
      unit: reading.unit,
      ...(valueRowId && { row: valueRowId }),
    },
  ]);
  return material ? joinValueName(material.name.trim(), reading.label) : reading.label;
}

export function acceptStepReadings(
  draft: Protocol,
  readings: { materials?: readonly MaterialReading[]; values?: readonly ValueReading[] },
  createMaterial: (name: string) => MaterialItem
): void {
  const edits = new Map<string, ReadingUse & { text: string }>();
  const replace = (uses: readonly ReadingUse[], text: string) => {
    for (const use of uses) edits.set(`${use.stepId}:${use.start}`, { ...use, text });
  };
  for (const reading of readings.materials ?? []) {
    const material = ensureMaterial(draft, reading.name, createMaterial);
    replace(reading.uses, `{${material.name.trim()}}`);
  }
  for (const reading of readings.values ?? []) {
    const material = reading.material
      ? ensureMaterial(draft, reading.material, createMaterial)
      : undefined;
    const name = addValueFor(draft, material, reading);
    replace(reading.uses, `{${name}}`);
    if (material) replace(reading.materialUses, `{${material.name.trim()}}`);
  }
  const steps = new Map(draft.pages.flatMap(page => page.steps).map(step => [step.id, step]));
  for (const edit of [...edits.values()].sort((x, y) => y.start - x.start)) {
    const step = steps.get(edit.stepId);
    if (step) step.text = step.text.slice(0, edit.start) + edit.text + step.text.slice(edit.end);
  }
}
