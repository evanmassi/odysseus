import { STOCK_FIELD } from '../dilutions/dilutionStock';
import {
  calculationAnswerText,
  nameKey,
  type SolvedBoard,
  type BoardName,
  type CalculationName,
  type CalculationGap,
  type WorkedOutGroup,
} from '../formulas/boardCalculation';
import {
  DILUTION_FACTOR_NOTATION,
  displayValue,
  FOLD_UNIT,
  quantityOf,
} from '../formulas/quantities';
import {
  FINAL_CONCENTRATION,
  MIX_CONCENTRATION,
  STOCK_CONCENTRATION,
  TOTAL_WELL_VOLUME,
  VOLUME_PER_WELL,
  WORKING_CONCENTRATION,
  WORKING_DILUTION,
  WORKING_STRENGTH,
  type Term,
} from '../terms/termList';
import { findTerm } from '../terms/termLookup';
import { generalTitleOf, joinValueName, lowerLead } from '../values/valueNames';

import { fieldName, materialFields } from './materialCatalog';
import { nameWithoutNotes } from './materialLookup';

import type { MaterialItem, MaterialsCard, Protocol } from '@odysseus/shared-schemas';

const missingWellTotal = (generalTitle: string): CalculationGap => ({
  problem: `Needs the ${lowerLead(TOTAL_WELL_VOLUME.word)}: add "${TOTAL_WELL_VOLUME.word} 80 µL" under ${generalTitle}`,
  need: TOTAL_WELL_VOLUME.word,
});

export const recipeFinalId = (mixId: string, entryId: string): string =>
  `${mixId}:recipe:${entryId}:final`;

export const mixFinalId = (mixId: string): string => `${mixId}:recipe:final`;

const mixWorkingId = (mixId: string) => `${mixId}:recipe:working`;

export const mixConcentrationName = (mixName: string, ingredient: string): string =>
  joinValueName(`${mixName} ${ingredient}`, MIX_CONCENTRATION.word);

export const finalConcentrationName = (owner: string): string =>
  joinValueName(owner, FINAL_CONCENTRATION.word);

export const wellTotalName = (names: ReadonlyMap<string, BoardName>): string | undefined =>
  findTerm(names, TOTAL_WELL_VOLUME, [''])?.name;

const mixValue = (mix: MaterialItem, term: Term, names: ReadonlyMap<string, BoardName>) =>
  findTerm(names, term, [mix.name.trim(), nameWithoutNotes(mix.name)]);

const isMix = (item: MaterialItem) =>
  !!item.name.trim() && !item.isSetAside && !!item.recipe.length;

function stockName(mix: MaterialItem) {
  const definition = materialFields(mix).find(candidate => candidate.key === STOCK_FIELD);
  return definition && fieldName(mix, definition);
}

function mixNames(
  mix: MaterialItem,
  materialsCardId: string,
  materials: ReadonlyMap<string, MaterialItem>,
  names: ReadonlyMap<string, BoardName>,
  generalTitle: string
): BoardName[] {
  const mixName = mix.name.trim();
  const perWell = mixValue(mix, VOLUME_PER_WELL, names)?.name;
  const wellTotal = wellTotalName(names);
  const scaling = perWell && wellTotal ? ` × ${perWell} ÷ ${wellTotal}` : '';
  const perWellName = joinValueName(mixName, VOLUME_PER_WELL.word);
  const missing: CalculationGap | undefined = !perWell
    ? { problem: `Needs ${perWellName}`, need: perWellName }
    : !wellTotal
      ? missingWellTotal(generalTitle)
      : undefined;
  const group: WorkedOutGroup = {
    key: `recipe:${mix.id}`,
    subject: mixName,
    title: FINAL_CONCENTRATION.word,
    settingsCardId: materialsCardId,
  };
  const inputs: BoardName[] = [];
  const finals: CalculationName[] = [];
  const final = (id: string, name: string, expr: string, unit: string, gap = missing) =>
    finals.push({ kind: 'calculation', id, name, formula: expr, unit, workedOut: group, ...gap });

  const stockField = stockName(mix);
  const stock =
    mix.units[STOCK_FIELD] === FOLD_UNIT && stockField && names.has(nameKey(stockField))
      ? stockField
      : undefined;
  const dilution = mixValue(mix, WORKING_DILUTION, names);
  const concentration = mixValue(mix, WORKING_CONCENTRATION, names)?.name;
  const dilutes = dilution
    ? `${dilution.kind === 'value' && dilution.unit === DILUTION_FACTOR_NOTATION ? '÷' : '×'} ${dilution.name}`
    : undefined;
  const fromStock =
    dilutes ?? (concentration && stock ? `× ${concentration} ÷ ${stock}` : undefined);
  const workingName = joinValueName(mixName, WORKING_STRENGTH.word);
  const working = dilutes && stock ? workingName : concentration;
  if (dilutes && stock) {
    final(mixWorkingId(mix.id), workingName, `${stock} ${dilutes}`, FOLD_UNIT, undefined);
  }
  const strength = working ?? stock;
  if (strength)
    final(mixFinalId(mix.id), finalConcentrationName(mixName), `${strength}${scaling}`, FOLD_UNIT);
  const stockNeed = joinValueName(mixName, STOCK_CONCENTRATION.word);
  const cannotScale: CalculationGap | undefined =
    concentration && !fromStock
      ? {
          problem: `Needs ${stockNeed} as a strength like 1000× to scale by its ${lowerLead(WORKING_CONCENTRATION.word)}`,
          need: stockNeed,
        }
      : undefined;
  for (const entry of mix.recipe) {
    const ingredient = materials.get(entry.materialId)?.name.trim();
    if (!ingredient) continue;
    const inMix = mixConcentrationName(mixName, ingredient);
    inputs.push({
      kind: 'value',
      id: `${mix.id}:recipe:${entry.id}`,
      name: inMix,
      value: entry.amount,
      unit: entry.unit,
      workedOut: group,
      originCardId: materialsCardId,
    });
    final(
      recipeFinalId(mix.id, entry.id),
      finalConcentrationName(`${mixName} ${ingredient}`),
      `${inMix}${fromStock ? ` ${fromStock}` : ''}${scaling}`,
      entry.unit === FOLD_UNIT ? FOLD_UNIT : '',
      cannotScale ?? missing
    );
  }

  const takenName = [...inputs, ...finals]
    .map(entry => entry.name)
    .find(name => names.has(nameKey(name)));
  if (!takenName) return [...inputs, ...finals];
  const problem = `Rename "${takenName}": the ${mixName} recipe needs that name.`;
  return finals
    .filter(entry => !names.has(nameKey(entry.name)))
    .map(({ need: _need, ...entry }) => ({ ...entry, problem }));
}

export function recipeCalculationNames(
  protocol: Protocol,
  taken: readonly BoardName[]
): BoardName[] {
  const names = new Map(taken.map(entry => [nameKey(entry.name), entry]));
  const materialCards = protocol.cards.filter(
    (card): card is MaterialsCard => card.type === 'materials'
  );
  const byId = new Map(
    materialCards.flatMap(card => card.items).map(item => [item.id, item] as const)
  );
  const generalTitle = generalTitleOf(protocol.cards);
  return materialCards.flatMap(card =>
    card.items.filter(isMix).flatMap(mix => mixNames(mix, card.id, byId, names, generalTitle))
  );
}

const AGREEMENT = 0.01;

export function recipeWarnings(
  protocol: Pick<Protocol, 'cards'>,
  board: SolvedBoard
): Map<string, string[]> {
  const warnings = new Map<string, string[]>();
  const mixes = protocol.cards
    .flatMap(card => (card.type === 'materials' ? card.items : []))
    .filter(isMix);
  for (const mix of mixes) {
    const result = board.results.get(mixWorkingId(mix.id));
    const typed = mixValue(mix, WORKING_CONCENTRATION, board.names);
    if (result?.status !== 'ok' || typed?.kind !== 'value') continue;
    const typedQuantity = quantityOf(typed.value, typed.unit);
    if (!typedQuantity) continue;
    const made = result.quantity.magnitude;
    if (Math.abs(made - typedQuantity.magnitude) <= AGREEMENT * Math.abs(made)) continue;
    warnings.set(mixWorkingId(mix.id), [
      `${WORKING_CONCENTRATION.word} says ${displayValue(typed.value, typed.unit)}, but the ${lowerLead(WORKING_DILUTION.word)} makes ${calculationAnswerText(result)}.`,
    ]);
  }
  return warnings;
}
