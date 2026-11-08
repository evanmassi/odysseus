import { nameKey, type BoardCalculation } from './boardCalculation';
import { FORMULA_FUNCTIONS, type FormulaFunction } from './formulaParser';

import type { MaterialItem } from '@odysseus/shared-schemas';

export interface CalculationSuggestion {
  label: string;
  name: string;
  expr: string;
}

export interface FormulaCompletion {
  name: string;
  label: string;
  isLocal: boolean;
  isFunction: boolean;
}

export const FORMULA_FUNCTION_HINTS: Readonly<Record<FormulaFunction, string>> = {
  'round up': 'to a whole number, or to a step: round up(Mix, 5 mL)',
  'round down': 'to a whole number, or to a step',
  round: 'to the nearest whole number, or step',
  'at least': 'never below a minimum: at least(Needed, 100 µL)',
};

const COMPLETION_LIMIT = 8;
const FORMULA_WORD = /[^+\-*/×÷−()=,]*$/;
const isWordCharacter = (character: string | undefined) => /[A-Za-z0-9_µ°]/.test(character ?? '');

const ownerPrefix = (material: MaterialItem | undefined) =>
  material ? `${nameKey(material.name)} ` : '';

export function formulaMaterial(
  name: string,
  materials: readonly MaterialItem[]
): MaterialItem | undefined {
  const key = nameKey(name);
  return materials
    .filter(item => key.startsWith(ownerPrefix(item)))
    .sort((a, b) => b.name.trim().length - a.name.trim().length)[0];
}

export function nameWithin(name: string, material: MaterialItem | undefined): string {
  const prefix = ownerPrefix(material);
  const trimmed = name.trim();
  if (!prefix || !trimmed.toLowerCase().startsWith(prefix)) return trimmed;
  const rest = trimmed.slice(prefix.length);
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

function scopedNames(calculation: BoardCalculation, material: MaterialItem | undefined) {
  const prefix = ownerPrefix(material);
  const full = [...calculation.names.values()].map(entry => entry.name);
  const short = new Map(
    prefix
      ? full
          .filter(
            name =>
              name.toLowerCase().startsWith(prefix) &&
              !calculation.names.has(name.slice(prefix.length).toLowerCase())
          )
          .map(name => [name, nameWithin(name, material)])
      : []
  );
  return { full, short };
}

function swapNames(text: string, replacements: ReadonlyMap<string, string>): string {
  const longestFirst = [...replacements.keys()].sort((a, b) => b.length - a.length);
  let swapped = '';
  let index = 0;
  while (index < text.length) {
    const hit = isWordCharacter(text[index - 1])
      ? undefined
      : longestFirst.find(
          name =>
            text.slice(index, index + name.length).toLowerCase() === name &&
            !isWordCharacter(text[index + name.length])
        );
    if (!hit) {
      swapped += text[index++];
      continue;
    }
    swapped += replacements.get(hit);
    index += hit.length;
  }
  return swapped;
}

export function namesWithin(
  expr: string,
  calculation: BoardCalculation,
  material: MaterialItem | undefined
): string {
  const { full, short } = scopedNames(calculation, material);
  return swapNames(expr, new Map(full.map(name => [name.toLowerCase(), short.get(name) ?? name])));
}

export function namesInFull(
  text: string,
  calculation: BoardCalculation,
  material: MaterialItem | undefined
): string {
  const { full, short } = scopedNames(calculation, material);
  return swapNames(
    text,
    new Map([
      ...full.map((name): [string, string] => [name.toLowerCase(), name]),
      ...[...short].map(([name, within]): [string, string] => [within.toLowerCase(), name]),
    ])
  );
}

export function uniqueName(calculation: BoardCalculation, base: string): string {
  let name = base;
  for (let suffix = 2; calculation.names.has(nameKey(name)); suffix++) name = `${base} ${suffix}`;
  return name;
}

export function calculationSuggestions(
  calculation: BoardCalculation,
  material: MaterialItem | undefined
): CalculationSuggestion[] {
  if (!material) return [];
  const has = (name: string) => calculation.names.has(nameKey(name));
  const own = (suffix: string) => `${material.name.trim()} ${suffix}`;
  const wells = [own('wells'), 'Wells used'].find(has);
  const overage = has('Overage') ? ' × (1 + Overage)' : '';
  const amount = [own('per well'), own('volume per well')].find(has);
  const isCells = has(own('per well'));
  const viability = has(own('viability')) ? ` × ${own('viability')}` : '';
  const recipes = [
    {
      label: 'Needed',
      name: own('needed'),
      isReady: !!amount && !!wells,
      expr: `${amount} × ${wells}${overage}`,
    },
    {
      label: 'To take',
      name: own('to take'),
      isReady: isCells && has(own('needed')) && has(own('count')),
      expr: viability
        ? `${own('needed')} ÷ (${own('count')}${viability})`
        : `${own('needed')} ÷ ${own('count')}`,
    },
    {
      label: 'Mix',
      name: own('mix'),
      isReady: isCells && has(own('volume per well')) && !!wells,
      expr: `${wells} × ${own('volume per well')}${overage}`,
    },
  ];
  return recipes
    .filter(recipe => recipe.isReady && !has(recipe.name))
    .map(({ label, name, expr }) => ({ label, name, expr }));
}

export function formulaWordAt(value: string, caret: number) {
  const before = value.slice(0, caret);
  const word = FORMULA_WORD.exec(before)?.[0] ?? '';
  return { start: before.length - word.trimStart().length, end: before.length, text: word.trim() };
}

export function formulaCompletions(
  calculation: BoardCalculation,
  material: MaterialItem | undefined,
  typed: string,
  ownName: string
): FormulaCompletion[] {
  if (!/[a-z]/i.test(typed)) return [];
  const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
  const { short } = scopedNames(calculation, material);
  const names: FormulaCompletion[] = [...calculation.names.values()]
    .filter(entry => entry.kind !== 'item' && nameKey(entry.name) !== nameKey(ownName))
    .map(entry => ({
      name: entry.name,
      label: short.get(entry.name) ?? entry.name,
      isLocal: short.has(entry.name),
      isFunction: false,
    }));
  const functions: FormulaCompletion[] = FORMULA_FUNCTIONS.map(name => ({
    name,
    label: name,
    isLocal: false,
    isFunction: true,
  }));
  const startsWithFirst = (option: FormulaCompletion) =>
    +option.label.toLowerCase().startsWith(words[0]);
  return [...names, ...functions]
    .filter(option => option.label.toLowerCase() !== typed.toLowerCase())
    .filter(option => {
      const parts = option.name.toLowerCase().split(/[\s-]+/);
      return words.every(word => parts.some(part => part.startsWith(word)));
    })
    .sort((a, b) => +b.isLocal - +a.isLocal || startsWithFirst(b) - startsWithFirst(a))
    .slice(0, COMPLETION_LIMIT);
}
