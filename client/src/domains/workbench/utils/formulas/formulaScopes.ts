import {
  CELLS_PER_WELL,
  EXTRA,
  LIVE_CELL_CONCENTRATION,
  MASS_PER_WELL,
  TOTAL_NEEDED,
  TOTAL_VOLUME_NEEDED,
  VOLUME_PER_WELL,
  WELLS,
  WELLS_USED,
  type Term,
} from '../terms/termList';
import { findTerm } from '../terms/termLookup';
import { joinValueName, upperLead } from '../values/valueNames';

import { nameKey, type SolvedBoard } from './boardCalculation';
import { FORMULA_FUNCTIONS, type FormulaFunction } from './formulaParser';
import { matchesWordStarts } from './nameMatching';

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
  'round up': 'up to a whole number, or to an amount: round up(Total needed, 5 mL)',
  'round down': 'down to a whole number, or to an amount',
  round: 'to the nearest whole number, or amount',
  'at least': 'never below a minimum: at least(Total needed, 100 µL)',
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

export const nameWithin = (name: string, material: MaterialItem | undefined): string =>
  nameWithinOwner(name, material?.name ?? '');

export function nameWithinOwner(name: string, owner: string): string {
  const prefix = owner.trim() ? `${nameKey(owner)} ` : '';
  const trimmed = name.trim();
  if (!prefix || !trimmed.toLowerCase().startsWith(prefix)) return trimmed;
  const rest = trimmed.slice(prefix.length);
  return upperLead(rest);
}

function scopedNames(board: SolvedBoard, material: MaterialItem | undefined) {
  const prefix = ownerPrefix(material);
  const full = [...board.names.values()].map(entry => entry.name);
  const short = new Map(
    prefix
      ? full
          .filter(
            name =>
              name.toLowerCase().startsWith(prefix) &&
              !board.names.has(name.slice(prefix.length).toLowerCase())
          )
          .map(name => [name, nameWithin(name, material)])
      : []
  );
  return { full, short };
}

export interface FormulaTextPart {
  text: string;
  isName: boolean;
}

function splitNames(text: string, names: readonly string[]): FormulaTextPart[] {
  const longestFirst = [...names].sort((a, b) => b.length - a.length);
  const parts: FormulaTextPart[] = [];
  const push = (part: string, isName: boolean) => {
    const last = parts[parts.length - 1];
    if (last && !isName && !last.isName) last.text += part;
    else parts.push({ text: part, isName });
  };
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
      push(text[index++], false);
      continue;
    }
    push(text.slice(index, index + hit.length), true);
    index += hit.length;
  }
  return parts;
}

const swapNames = (text: string, replacements: ReadonlyMap<string, string>): string =>
  splitNames(text, [...replacements.keys()])
    .map(part => (part.isName ? replacements.get(part.text.toLowerCase()) : part.text))
    .join('');

export function formulaTextParts(
  text: string,
  board: SolvedBoard,
  material: MaterialItem | undefined
): FormulaTextPart[] {
  const { full, short } = scopedNames(board, material);
  return splitNames(
    text,
    [...full, ...short.values()].map(name => name.toLowerCase())
  );
}

export function namesWithin(
  expr: string,
  board: SolvedBoard,
  material: MaterialItem | undefined
): string {
  const { full, short } = scopedNames(board, material);
  return swapNames(expr, new Map(full.map(name => [name.toLowerCase(), short.get(name) ?? name])));
}

export function namesInFull(
  text: string,
  board: SolvedBoard,
  material: MaterialItem | undefined
): string {
  const { full, short } = scopedNames(board, material);
  return swapNames(
    text,
    new Map([
      ...full.map((name): [string, string] => [name.toLowerCase(), name]),
      ...[...short].map(([name, within]): [string, string] => [within.toLowerCase(), name]),
    ])
  );
}

export function uniqueName(board: SolvedBoard, base: string): string {
  let name = base;
  for (let suffix = 2; board.names.has(nameKey(name)); suffix++) name = `${base} ${suffix}`;
  return name;
}

export function calculationSuggestions(
  board: SolvedBoard,
  material: MaterialItem | undefined
): CalculationSuggestion[] {
  if (!material) return [];
  const has = (name: string) => board.names.has(nameKey(name));
  const owner = material.name.trim();
  const own = (label: string) => joinValueName(owner, label);
  const find = (term: Term, owners: readonly string[]) => findTerm(board.names, term, owners)?.name;
  const needed = find(TOTAL_NEEDED, [owner]);
  const wells = find(WELLS, [owner]) ?? find(WELLS_USED, ['']);
  const extra = find(EXTRA, [owner, '']);
  const overage = extra ? ` × (1 + ${extra})` : '';
  const cells = find(CELLS_PER_WELL, [owner]);
  const volume = find(VOLUME_PER_WELL, [owner]);
  const amount = cells ?? find(MASS_PER_WELL, [owner]) ?? volume;
  const liveConcentration = find(LIVE_CELL_CONCENTRATION, [owner]);
  const recipes = [
    {
      label: TOTAL_NEEDED.word,
      name: own(TOTAL_NEEDED.word),
      isReady: !!amount && !!wells && !needed,
      expr: `${amount} × ${wells}${overage}`,
    },
    {
      label: 'To take',
      name: own('To take'),
      isReady: !!cells && !!needed && !!liveConcentration,
      expr: `${needed} ÷ ${liveConcentration}`,
    },
    {
      label: TOTAL_VOLUME_NEEDED.word,
      name: own(TOTAL_VOLUME_NEEDED.word),
      isReady: !!cells && !!volume && !!wells && !find(TOTAL_VOLUME_NEEDED, [owner]),
      expr: `${wells} × ${volume}${overage}`,
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
  board: SolvedBoard,
  material: MaterialItem | undefined,
  typed: string,
  ownName: string
): FormulaCompletion[] {
  if (!/[a-z]/i.test(typed)) return [];
  const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
  const { short } = scopedNames(board, material);
  const names: FormulaCompletion[] = [...board.names.values()]
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
    .filter(option => matchesWordStarts(option.name, typed))
    .sort((a, b) => +b.isLocal - +a.isLocal || startsWithFirst(b) - startsWithFirst(a))
    .slice(0, COMPLETION_LIMIT);
}
