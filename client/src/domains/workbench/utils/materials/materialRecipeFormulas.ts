import { STOCK_FIELD } from '../dilutions/dilutionStock';
import {
  nameKey,
  type BoardCalculation,
  type BoardName,
  type WorkedOutGroup,
} from '../formulas/boardCalculation';
import { FOLD_UNIT } from '../formulas/quantities';
import { joinValueName } from '../values/valueNames';

import { fieldName, materialFields } from './materialCatalog';
import { nameWithoutNotes } from './materialLookup';

import type { MaterialItem, MaterialsBlock, Protocol } from '@odysseus/shared-schemas';

const WELL_VOLUME_NAMES = ['Well volume', 'Final well volume', 'Total well volume'];
const MISSING_WELL_TOTAL = 'Needs the well total: add "Well volume 80 µL" under Whole experiment';

export const recipeFinalId = (mixId: string, entryId: string): string =>
  `${mixId}:recipe:${entryId}:final`;

export const mixFinalId = (mixId: string): string => `${mixId}:recipe:final`;

export const wellTotalName = (
  names: ReadonlyMap<string, BoardName> | BoardCalculation['names']
): string | undefined =>
  WELL_VOLUME_NAMES.map(name => names.get(nameKey(name))).find(Boolean)?.name;

function perWellName(mix: MaterialItem, names: ReadonlyMap<string, BoardName>) {
  const owners = [mix.name.trim(), nameWithoutNotes(mix.name)];
  return owners
    .map(owner => names.get(nameKey(joinValueName(owner, 'Volume per well'))))
    .find(Boolean)?.name;
}

function stockName(mix: MaterialItem) {
  const definition = materialFields(mix).find(candidate => candidate.key === STOCK_FIELD);
  return definition && fieldName(mix, definition);
}

function mixNames(
  mix: MaterialItem,
  materialsBlockId: string,
  materials: ReadonlyMap<string, MaterialItem>,
  names: ReadonlyMap<string, BoardName>
): BoardName[] {
  const mixName = mix.name.trim();
  const perWell = perWellName(mix, names);
  const wellTotal = wellTotalName(names);
  const scaling = perWell && wellTotal ? ` × ${perWell} ÷ ${wellTotal}` : '';
  const missing = !perWell
    ? `Needs ${joinValueName(mixName, 'Volume per well')}`
    : !wellTotal
      ? MISSING_WELL_TOTAL
      : undefined;
  const group: WorkedOutGroup = {
    key: `recipe:${mix.id}`,
    subject: mixName,
    title: 'Final in the well',
    settingsBlockId: materialsBlockId,
  };
  const inputs: BoardName[] = [];
  const finals: Array<Extract<BoardName, { kind: 'formula' }>> = [];

  const stock = stockName(mix);
  if (mix.units[STOCK_FIELD] === FOLD_UNIT && (mix.values[STOCK_FIELD] ?? '').trim() && stock) {
    finals.push({
      kind: 'formula',
      id: mixFinalId(mix.id),
      name: `${mixName} in the well`,
      expr: `${stock}${scaling}`,
      unit: FOLD_UNIT,
      workedOut: group,
      ...(missing && { problem: missing }),
    });
  }
  for (const entry of mix.recipe) {
    const ingredient = materials.get(entry.materialId)?.name.trim();
    if (!ingredient) continue;
    const inMix = `${mixName} ${ingredient} in the mix`;
    inputs.push({
      kind: 'value',
      id: `${mix.id}:recipe:${entry.id}`,
      name: inMix,
      value: entry.amount,
      unit: entry.unit,
      workedOut: group,
      sourceBlockId: materialsBlockId,
    });
    finals.push({
      kind: 'formula',
      id: recipeFinalId(mix.id, entry.id),
      name: `${mixName} ${ingredient} in the well`,
      expr: `${inMix}${scaling}`,
      unit: entry.unit === FOLD_UNIT ? FOLD_UNIT : '',
      workedOut: group,
      ...(missing && { problem: missing }),
    });
  }

  const clash = [...inputs, ...finals]
    .map(entry => entry.name)
    .find(name => names.has(nameKey(name)));
  if (!clash) return [...inputs, ...finals];
  const problem = `Rename “${clash}”: the ${mixName} recipe needs that name.`;
  return finals
    .filter(entry => !names.has(nameKey(entry.name)))
    .map(entry => ({ ...entry, problem }));
}

export function recipeFormulaNames(protocol: Protocol, taken: readonly BoardName[]): BoardName[] {
  const names = new Map(taken.map(entry => [nameKey(entry.name), entry]));
  const materialBlocks = protocol.blocks.filter(
    (block): block is MaterialsBlock => block.type === 'materials'
  );
  const byId = new Map(
    materialBlocks.flatMap(block => block.items).map(item => [item.id, item] as const)
  );
  return materialBlocks.flatMap(block =>
    block.items
      .filter(item => item.name.trim() && !item.isDropped && item.recipe.length)
      .flatMap(mix => mixNames(mix, block.id, byId, names))
  );
}
