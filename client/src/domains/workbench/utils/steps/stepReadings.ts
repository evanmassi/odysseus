import { UNIT_REGISTRY, type MaterialItem, type Protocol } from '@odysseus/shared-schemas';

import { firstBlockOrNew } from '../blocks/createBlock';
import { nameKey, type BoardCalculation } from '../formulas/boardCalculation';
import { createId } from '../ids/createId';
import { normalizeMaterialKey } from '../materials/materialGuesser';
import { ensureMaterial } from '../materials/materialLookup';
import { insertAfterPeers } from '../values/valueEdits';
import { valueUnitOf } from '../values/valueLines';
import { joinValueName } from '../values/valueNames';

import { stepNumbers } from './stepNumbering';
import { stepVerbBase } from './stepVerbs';

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
  volume: 'Volume',
  mass: 'Amount',
  'cell-count': 'Cells',
  'mass-conc': 'Concentration',
  molarity: 'Concentration',
};
const CONDITION_LABELS: Readonly<Record<string, string>> = {
  time: 'time',
  temperature: 'temperature',
  'g-force': 'speed',
  'rotor-speed': 'speed',
};
const CONDITION_NOUNS: Readonly<Record<string, string>> = {
  centrifuge: 'Spin',
  spin: 'Spin',
  pellet: 'Spin',
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
};
const PHRASE_WORD_LIMIT = 4;
const STEP_QUANTITY =
  /(?<![\w.-])(\d+(?:[.,]\d+)*)\s?(pg\/mL|ng\/mL|µg\/mL|mg\/mL|µL|uL|ul|mL|ml|nL|L|pg|ng|µg|ug|mg|cells|nM|µM|uM|mM|minutes?|mins?|hours?|hrs?|h|seconds?|secs?|s|°C|[×x]\s?g|rpm)(?![\w/µ])/g;
const AMOUNT_LEAD = /^\s+(of\s+)?(the\s+)?/;
const PER_WELL = /^\s+per\s+well\b/i;
const SENTENCE_BREAK = /[.;]\s/;
const WORD = /[A-Za-z]+/g;
const MATERIAL_CUE =
  /(?:(?:^|[.;]\s+)\s*([A-Za-z]+)\s+|\b(?:with|in|into|using|from|of|on)\s+(?:the\s+)?)(?=[A-Z])/g;
const LOCKED_SPANS = /\{[^}]+\}|‹[^›]*›/g;
const STARTS_UPPERCASE = /^[A-Z]/;
const STARTS_DIGIT = /^\d/;

const unitKind = (unit: string) => UNIT_REGISTRY.find(entry => entry.id === unit)?.kind ?? '';

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

function conditionNoun(textBefore: string): string | undefined {
  const sentence = textBefore.split(SENTENCE_BREAK).pop() ?? '';
  const bases = (sentence.match(WORD) ?? []).map(word => stepVerbBase(word));
  const verb = bases.reverse().find(base => base && CONDITION_NOUNS[base]);
  return verb && CONDITION_NOUNS[verb];
}

export function readStepReadings(protocol: Protocol, calculation: BoardCalculation): StepReadings {
  const onBoard = new Map(
    boardMaterials(protocol).map(item => [normalizeMaterialKey(item.name), item])
  );
  const materials = new Map<string, MaterialReading>();
  const values = new Map<string, ValueDraft>();

  const noteMaterial = (name: string, use: ReadingUse) => {
    const material = onBoard.get(normalizeMaterialKey(name));
    const key = `material:${normalizeMaterialKey(name)}`;
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

      for (const match of text.matchAll(STEP_QUANTITY)) {
        const index = match.index ?? 0;
        const unit = valueUnitOf(match[2].replace(/\s/g, ''));
        if (isLocked(index) || !unit) continue;
        const end = index + match[0].length;
        const use = { ...at, start: index, end };
        const value = match[1].replace(/,/g, '');
        const kind = unitKind(unit);
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
          const label =
            amountNoun === 'Cells'
              ? perWell
                ? 'Per well'
                : 'Cells'
              : `${amountNoun}${perWell ? ' per well' : ''}`;
          noteValue({ material, label, value, unit, isCondition: false }, use, materialUse);
        } else if (CONDITION_LABELS[kind]) {
          const noun = conditionNoun(text.slice(0, index));
          if (noun) {
            noteValue(
              {
                material: undefined,
                label: `${noun} ${CONDITION_LABELS[kind]}`,
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
        const known = calculation.names.get(nameKey(phrase.name));
        if (known && known.kind !== 'item') continue;
        noteMaterial(phrase.name, { ...at, start: phrase.start, end: phrase.end });
      }
    }
  }

  const ignored = new Set(protocol.ignoredReadings);
  const shownValues = [...values.values()].filter(
    ({ isConflicting, isCondition, name, uses, key }) =>
      !isConflicting &&
      !calculation.names.has(nameKey(name)) &&
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
  const block = firstBlockOrNew(draft, 'values');
  let section = material
    ? block.sections.find(
        candidate => 'materialId' in candidate && candidate.materialId === material.id
      )
    : undefined;
  if (material && !section) {
    section = { id: createId(), materialId: material.id };
    block.sections.push(section);
  }
  const sectionId = section?.id ?? '';
  insertAfterPeers(block, sectionId, [
    {
      id: createId(),
      name: reading.label,
      value: reading.value,
      unit: reading.unit,
      ...(sectionId && { section: sectionId }),
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
