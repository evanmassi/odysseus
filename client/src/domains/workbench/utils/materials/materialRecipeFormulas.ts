import { STOCK_FIELD } from '../dilutions/dilutionStock';
import {
  formulaAnswerText,
  nameKey,
  type BoardCalculation,
  type BoardName,
  type WorkedOutGroup,
} from '../formulas/boardCalculation';
import {
  DILUTION_FACTOR_NOTATION,
  displayValue,
  FOLD_UNIT,
  quantityOf,
} from '../formulas/quantities';
import { joinValueName } from '../values/valueNames';

import { fieldName, materialFields } from './materialCatalog';
import { nameWithoutNotes } from './materialLookup';

import type { MaterialItem, MaterialsBlock, Protocol } from '@odysseus/shared-schemas';

const WELL_VOLUME_NAMES = ['Well volume', 'Final well volume', 'Total well volume'];
const MISSING_WELL_TOTAL = 'Needs the well total: add "Well volume 80 µL" under Whole experiment';

export const recipeFinalId = (mixId: string, entryId: string): string =>
  `${mixId}:recipe:${entryId}:final`;

export const mixFinalId = (mixId: string): string => `${mixId}:recipe:final`;

const mixWorkingId = (mixId: string) => `${mixId}:recipe:working`;

export const wellTotalName = (
  names: ReadonlyMap<string, BoardName> | BoardCalculation['names']
): string | undefined =>
  WELL_VOLUME_NAMES.map(name => names.get(nameKey(name))).find(Boolean)?.name;

function mixValue(mix: MaterialItem, label: string, names: ReadonlyMap<string, BoardName>) {
  const owners = [mix.name.trim(), nameWithoutNotes(mix.name)];
  return owners.map(owner => names.get(nameKey(joinValueName(owner, label)))).find(Boolean);
}

const isMix = (item: MaterialItem) => !!item.name.trim() && !item.isDropped && !!item.recipe.length;

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
  const perWell = mixValue(mix, 'Volume per well', names)?.name;
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
  const final = (id: string, name: string, expr: string, unit: string, problem = missing) =>
    finals.push({
      kind: 'formula',
      id,
      name,
      expr,
      unit,
      workedOut: group,
      ...(problem && { problem }),
    });

  const stockField = stockName(mix);
  const stock =
    mix.units[STOCK_FIELD] === FOLD_UNIT && stockField && names.has(nameKey(stockField))
      ? stockField
      : undefined;
  const dilution = mixValue(mix, 'Working dilution', names);
  const concentration = mixValue(mix, 'Working concentration', names)?.name;
  const dilutes = dilution
    ? `${dilution.kind === 'value' && dilution.unit === DILUTION_FACTOR_NOTATION ? '÷' : '×'} ${dilution.name}`
    : undefined;
  const fromStock =
    dilutes ?? (concentration && stock ? `× ${concentration} ÷ ${stock}` : undefined);
  const working = dilutes && stock ? `${mixName} working` : concentration;
  if (dilutes && stock) {
    final(mixWorkingId(mix.id), `${mixName} working`, `${stock} ${dilutes}`, FOLD_UNIT, undefined);
  }
  const strength = working ?? stock;
  if (strength)
    final(mixFinalId(mix.id), `${mixName} in the well`, `${strength}${scaling}`, FOLD_UNIT);
  const cannotScale =
    concentration && !fromStock
      ? `Needs ${joinValueName(mixName, 'Stock concentration')} in X to scale by its working concentration`
      : undefined;
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
    final(
      recipeFinalId(mix.id, entry.id),
      `${mixName} ${ingredient} in the well`,
      `${inMix}${fromStock ? ` ${fromStock}` : ''}${scaling}`,
      entry.unit === FOLD_UNIT ? FOLD_UNIT : '',
      cannotScale ?? missing
    );
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
    block.items.filter(isMix).flatMap(mix => mixNames(mix, block.id, byId, names))
  );
}

const AGREEMENT = 0.01;

export function recipeWarnings(
  protocol: Protocol,
  calculation: BoardCalculation
): Map<string, string[]> {
  const warnings = new Map<string, string[]>();
  const mixes = protocol.blocks
    .flatMap(block => (block.type === 'materials' ? block.items : []))
    .filter(isMix);
  for (const mix of mixes) {
    const result = calculation.results.get(mixWorkingId(mix.id));
    const typed = mixValue(mix, 'Working concentration', calculation.names);
    if (result?.status !== 'ok' || typed?.kind !== 'value') continue;
    const typedQuantity = quantityOf(typed.value, typed.unit);
    if (!typedQuantity) continue;
    const made = result.quantity.magnitude;
    if (Math.abs(made - typedQuantity.magnitude) <= AGREEMENT * Math.abs(made)) continue;
    warnings.set(mixWorkingId(mix.id), [
      `Working concentration says ${displayValue(typed.value, typed.unit)}, but the working dilution makes ${formulaAnswerText(result)}.`,
    ]);
  }
  return warnings;
}
