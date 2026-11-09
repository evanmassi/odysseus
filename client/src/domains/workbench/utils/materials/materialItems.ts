import { displayValue } from '../formulas/quantities';
import { createId } from '../ids/createId';

import { UNIT_PER_ITEM, fieldUnit, materialFields } from './materialCatalog';
import { normalizeMaterialKey, type MaterialAmount, type MaterialGuess } from './materialGuesser';

import type { RememberedMaterial } from './materialMemory';
import type { FieldDefinition, MaterialItem } from '@odysseus/shared-schemas';

export const UNSORTED_GROUP = 'unsorted';
export const OTHER_TYPE = 'Other';

const GROUP_DEFAULT_FIELDS: Readonly<Record<string, readonly string[]>> = {
  equip: ['model'],
  soft: ['source'],
};
const TYPE_DEFAULT_FIELDS: Readonly<Record<string, readonly string[]>> = {
  Software: ['version'],
  Dataset: ['repository', 'accession-number'],
};
const PHYSICAL_DEFAULT_FIELDS = ['vendor', 'catalog', 'lot'];
const AMOUNT_FIELDS = [
  'amount',
  'dilution',
  'final-concentration',
  'stock-concentration',
  'top-concentration',
  'coating-concentration',
];
const MOLAR_STOCK_UNITS = new Set(['mM', 'M']);
export const RECIPE_FIELD = 'recipe';
const MADE_ON_FIELD = 'made-on';

const hasText = (value: string | undefined): value is string => !!value?.trim();

const materialDefaultFields = (group: string, type: string): readonly string[] =>
  TYPE_DEFAULT_FIELDS[type] ?? GROUP_DEFAULT_FIELDS[group] ?? PHYSICAL_DEFAULT_FIELDS;

export function showMaterialField(item: MaterialItem, key: string): void {
  if (!item.shownFields.includes(key)) item.shownFields.push(key);
}

function newMaterial(group: string, type: string, name: string): MaterialItem {
  const item: MaterialItem = {
    id: createId(),
    group,
    type,
    name,
    shownFields: [],
    values: {},
    units: {},
    customFields: [],
    fieldLabels: {},
    isDropped: false,
    recipe: [],
  };
  const keys = new Set(materialFields(item).map(definition => definition.key));
  item.shownFields = materialDefaultFields(group, type).filter(key => keys.has(key));
  return item;
}

function showMadeHereFields(item: MaterialItem): void {
  const isMadeHere =
    hasText(item.values[RECIPE_FIELD]) &&
    materialFields(item).some(definition => definition.key === MADE_ON_FIELD);
  if (isMadeHere) showMaterialField(item, MADE_ON_FIELD);
}

export function applyMaterialKind(item: MaterialItem, group: string, type: string): void {
  item.group = group;
  item.type = type;
  const keys = new Set(materialFields(item).map(definition => definition.key));
  item.shownFields = [
    ...new Set([...item.shownFields, ...materialDefaultFields(group, type)]),
  ].filter(key => keys.has(key));
}

export function materialText(item: MaterialItem, definition: FieldDefinition): string {
  const raw = item.values[definition.key] ?? '';
  if (!raw.trim()) return '';
  return displayValue(raw, definition.kind === 'number' ? fieldUnit(item, definition) : '');
}

export function writeMaterialField(
  item: MaterialItem,
  definition: FieldDefinition,
  value: string
): void {
  const isOwn = materialFields(item).some(own => own.key === definition.key);
  if (!isOwn && value.trim()) item.customFields.push({ ...definition });
  item.values[definition.key] = value;
  if (value.trim()) showMaterialField(item, definition.key);
  if (definition.key === RECIPE_FIELD) showMadeHereFields(item);
}

export function copyMaterialField(item: MaterialItem, source: MaterialItem, key: string): boolean {
  const own = materialFields(item).find(definition => definition.key === key);
  const definition = own ?? materialFields(source).find(candidate => candidate.key === key);
  if (!definition) return false;
  if (!own) item.customFields.push({ ...definition });
  item.values[key] = source.values[key] ?? '';
  if (source.units[key]) item.units[key] = source.units[key];
  showMaterialField(item, key);
  return true;
}

export function mergeMaterialInto(target: MaterialItem, source: MaterialItem): void {
  const targetKeys = new Set(materialFields(target).map(definition => definition.key));
  for (const definition of materialFields(source)) {
    const { key } = definition;
    if (!hasText(source.values[key]) || hasText(target.values[key])) continue;
    if (!targetKeys.has(key)) target.customFields.push({ ...definition });
    target.values[key] = source.values[key];
    if (source.units[key]) target.units[key] = source.units[key];
    showMaterialField(target, key);
  }
}

export const findDuplicateMaterial = (
  items: readonly MaterialItem[],
  item: MaterialItem,
  keptBoth: readonly string[]
): MaterialItem | undefined => {
  const key = normalizeMaterialKey(item.name);
  if (keptBoth.includes(key)) return undefined;
  return items.find(other => other.id !== item.id && normalizeMaterialKey(other.name) === key);
};

function placeAmount(item: MaterialItem, { value, unit }: MaterialAmount): void {
  const fields = materialFields(item);
  const order = MOLAR_STOCK_UNITS.has(unit)
    ? ['stock-concentration', ...AMOUNT_FIELDS]
    : AMOUNT_FIELDS;
  for (const key of order) {
    const definition = fields.find(candidate => candidate.key === key);
    if (!definition) continue;
    if (definition.kind === 'text') {
      item.values[key] =
        unit === '1:N' ? `1:${value}` : `${value}${unit === '%' ? '' : ' '}${unit}`;
    } else if (definition.unit === UNIT_PER_ITEM && (definition.units?.includes(unit) ?? true)) {
      item.values[key] = value;
      item.units[key] = unit;
    } else if (definition.unit === unit) {
      item.values[key] = value;
    } else {
      continue;
    }
    showMaterialField(item, key);
    return;
  }
}

function recallMaterial(item: MaterialItem, recalled: RememberedMaterial | undefined): void {
  if (!recalled || recalled.group !== item.group || recalled.type !== item.type) return;
  for (const custom of recalled.customFields) {
    if (!materialFields(item).some(definition => definition.key === custom.key)) {
      item.customFields.push({ ...custom });
    }
  }
  for (const [key, value] of Object.entries(recalled.values)) {
    if (hasText(item.values[key]) || !value.trim()) continue;
    item.values[key] = value;
    if (recalled.units[key]) item.units[key] = recalled.units[key];
  }
  item.shownFields = [...new Set([...item.shownFields, ...recalled.shownFields])];
}

export function materialFromGuess(
  guess: MaterialGuess,
  rememberedMaterials: Readonly<Record<string, RememberedMaterial>>
): MaterialItem {
  const item = newMaterial(guess.group, guess.type, guess.name);
  const fields = materialFields(item);
  for (const [key, value] of Object.entries(guess.values)) {
    const definition = fields.find(candidate => candidate.key === key);
    if (!definition || (definition.kind === 'choice' && !definition.options.includes(value))) {
      continue;
    }
    item.values[key] = value;
    showMaterialField(item, key);
  }
  if (guess.amount) placeAmount(item, guess.amount);
  recallMaterial(item, rememberedMaterials[normalizeMaterialKey(item.name)]);
  showMadeHereFields(item);
  return item;
}

export function materialColumns(items: readonly MaterialItem[]): FieldDefinition[] {
  const columns: FieldDefinition[] = [];
  for (const item of items) {
    for (const definition of materialFields(item)) {
      const isShown = item.shownFields.includes(definition.key);
      if (isShown && !columns.some(column => column.key === definition.key)) {
        columns.push(definition);
      }
    }
  }
  return columns;
}
