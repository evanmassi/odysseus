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
  WELLS,
  perLabwareKind,
  type SampleNoun,
  type Term,
} from '../terms/termList';
import { findTerm, findTermOn, sampleNounsOf, totalWellVolumeGap } from '../terms/termLookup';
import { assaySetupTitleOf, joinValueName, lowerLead } from '../values/valueNames';

import { fieldName, materialFields } from './materialCatalog';
import { nameWithoutNotes } from './materialLookup';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

export const recipeFinalId = (mixId: string, entryId: string): string =>
  `${mixId}:recipe:${entryId}:final`;

export const mixFinalId = (mixId: string): string => `${mixId}:recipe:final`;

const mixWorkingId = (mixId: string) => `${mixId}:recipe:working`;

export const mixConcentrationName = (mixName: string, ingredient: string): string =>
  joinValueName(`${mixName} ${ingredient}`, MIX_CONCENTRATION.word);

export const finalConcentrationName = (owner: string): string =>
  joinValueName(owner, FINAL_CONCENTRATION.word);

const mixOwners = (mix: MaterialItem) => [mix.name.trim(), nameWithoutNotes(mix.name)];

const mixValue = (mix: MaterialItem, term: Term, names: ReadonlyMap<string, BoardName>) =>
  findTerm(names, term, mixOwners(mix));

export interface RecipePlacement {
  noun: SampleNoun | undefined;
  label: string;
  nameEnd: string;
  idEnd: string;
  perWell: string | undefined;
  wellTotal: string | undefined;
}

export function recipePlacements(
  mix: MaterialItem,
  names: ReadonlyMap<string, BoardName>
): RecipePlacement[] {
  const owners = mixOwners(mix);
  const nouns = sampleNounsOf(names, owners);
  const isSplit = nouns.length > 1;
  return (isSplit ? nouns : [nouns[0]]).map(noun => {
    const find = (term: Term, from: readonly string[]) =>
      (noun && isSplit ? findTermOn(names, term, from, noun) : findTerm(names, term, from, noun))
        ?.name;
    const inThem = noun && isSplit ? ` in the ${lowerLead(perLabwareKind(WELLS, noun).word)}` : '';
    return {
      noun,
      label: `${FINAL_CONCENTRATION.word}${inThem}`,
      nameEnd: inThem,
      idEnd: noun && isSplit ? `:${noun}` : '',
      perWell: find(VOLUME_PER_WELL, owners),
      wellTotal: find(TOTAL_WELL_VOLUME, ['']),
    };
  });
}

const isMix = (item: MaterialItem) =>
  !!item.name.trim() && !item.isSetAside && !!item.recipe.length;

function stockName(mix: MaterialItem) {
  const definition = materialFields(mix).find(candidate => candidate.key === STOCK_FIELD);
  return definition && fieldName(mix, definition);
}

function mixNames(
  mix: MaterialItem,
  materials: ReadonlyMap<string, MaterialItem>,
  names: ReadonlyMap<string, BoardName>,
  assaySetupTitle: string
): BoardName[] {
  const mixName = mix.name.trim();
  const placements = recipePlacements(mix, names).map(placement => {
    const { noun = 'well', perWell, wellTotal } = placement;
    const perWellName = joinValueName(mixName, perLabwareKind(VOLUME_PER_WELL, noun).word);
    const missing: CalculationGap | undefined = !perWell
      ? { problem: `Needs ${perWellName}`, need: perWellName }
      : !wellTotal
        ? totalWellVolumeGap(assaySetupTitle, noun)
        : undefined;
    const scaling = perWell && wellTotal ? ` × ${perWell} ÷ ${wellTotal}` : '';
    return { ...placement, missing, scaling };
  });
  const group: WorkedOutGroup = {
    key: `recipe:${mix.id}`,
    subject: mixName,
    title: FINAL_CONCENTRATION.word,
    settings: { type: 'materials' },
  };
  const inputs: BoardName[] = [];
  const finals: CalculationName[] = [];
  const final = (
    id: string,
    name: string,
    expr: string,
    unit: string,
    gap: CalculationGap | undefined
  ) =>
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
  for (const { idEnd, nameEnd, scaling, missing } of strength ? placements : []) {
    final(
      `${mixFinalId(mix.id)}${idEnd}`,
      `${finalConcentrationName(mixName)}${nameEnd}`,
      `${strength}${scaling}`,
      FOLD_UNIT,
      missing
    );
  }
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
      origin: { type: 'materials' },
    });
    for (const { idEnd, nameEnd, scaling, missing } of placements) {
      final(
        `${recipeFinalId(mix.id, entry.id)}${idEnd}`,
        `${finalConcentrationName(`${mixName} ${ingredient}`)}${nameEnd}`,
        `${inMix}${fromStock ? ` ${fromStock}` : ''}${scaling}`,
        entry.unit === FOLD_UNIT ? FOLD_UNIT : '',
        cannotScale ?? missing
      );
    }
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
  const { items } = protocol.materials;
  const byId = new Map(items.map(item => [item.id, item] as const));
  const assaySetupTitle = assaySetupTitleOf(protocol);
  return items.filter(isMix).flatMap(mix => mixNames(mix, byId, names, assaySetupTitle));
}

const AGREEMENT = 0.01;

export function recipeWarnings(
  protocol: Pick<Protocol, 'materials'>,
  board: SolvedBoard
): Map<string, string[]> {
  const warnings = new Map<string, string[]>();
  const mixes = protocol.materials.items.filter(isMix);
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
