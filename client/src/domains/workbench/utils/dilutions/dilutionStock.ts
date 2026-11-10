import { unitScale, type MaterialItem, type Protocol } from '@odysseus/shared-schemas';

import { dimensionKey, readableAmount, readNumber } from '../formulas/quantities';
import { isTherapeuticAntibodyName } from '../materials/materialGuesser';
import { materialNamed } from '../materials/materialLookup';

export const STOCK_FIELD = 'stock-concentration';
export const WEIGHT_FIELD = 'molecular-weight';

export type StockReading =
  | { kind: 'undiluted' }
  | { kind: 'ready'; inSeriesUnit: number; shown: string; material: string }
  | { kind: 'ask'; need: 'stock' | 'weight'; unit: string; issue: string }
  | { kind: 'problem'; issue: string };

const MOLAR = dimensionKey({ amount: 1, volume: -1 });
const MASS_CONCENTRATION = dimensionKey({ mass: 1, volume: -1 });
const LARGE_MOLECULE_TYPE = /protein|antibod|isotype/i;

function materialNumber(item: MaterialItem, key: string) {
  const value = readNumber(item.values[key] ?? '');
  return value === undefined ? undefined : { value, unit: item.units[key] ?? '' };
}

type Conversion = { value: number } | { needsWeight: true } | { error: string };

function convertConcentration(
  value: number,
  from: string,
  to: string,
  gramsPerMol: number
): Conversion {
  const source = unitScale(from);
  const target = unitScale(to);
  if (!source || !target) {
    return { error: `${from || 'a plain number'} cannot become ${to || 'a plain number'}` };
  }
  const sourceKind = dimensionKey(source.dimension);
  const targetKind = dimensionKey(target.dimension);
  if (sourceKind === targetKind) return { value: (value * source.factor) / target.factor };
  const crossesMassAndMolar =
    new Set([sourceKind, targetKind, MOLAR, MASS_CONCENTRATION]).size === 2;
  if (!crossesMassAndMolar) return { error: `the stock is in ${from} and the series in ${to}` };
  if (!gramsPerMol) return { needsWeight: true };
  const base = value * source.factor;
  return {
    value:
      (sourceKind === MASS_CONCENTRATION ? base / gramsPerMol : base * gramsPerMol) / target.factor,
  };
}

const isLargeMolecule = (item: MaterialItem) =>
  item.group === 'ab' ||
  LARGE_MOLECULE_TYPE.test(item.type) ||
  isTherapeuticAntibodyName(item.name);

export function stockFor(
  protocol: Pick<Protocol, 'blocks'>,
  subject: string,
  seriesUnit: string,
  isRatio: boolean
): StockReading {
  if (isRatio) return { kind: 'undiluted' };
  const material = materialNamed(protocol, subject);
  const stock = material && materialNumber(material, STOCK_FIELD);
  if (!material || !stock) {
    return {
      kind: 'ask',
      need: 'stock',
      unit: seriesUnit,
      issue: material
        ? `${material.name} has no stock concentration yet.`
        : `${subject || 'This treatment'} is not in Materials yet.`,
    };
  }
  const weight = materialNumber(material, WEIGHT_FIELD);
  const gramsPerMol = weight ? weight.value * (unitScale(weight.unit)?.factor ?? 1) : 0;
  const conversion = convertConcentration(stock.value, stock.unit, seriesUnit, gramsPerMol);
  const shown = readableAmount(String(stock.value), stock.unit);
  if ('needsWeight' in conversion) {
    const isLarge = isLargeMolecule(material);
    return {
      kind: 'ask',
      need: 'weight',
      unit: isLarge ? 'kDa' : 'g/mol',
      issue: `Its stock is ${shown}, so turning it into ${seriesUnit} needs a molecular weight${isLarge ? ' (about 150 kDa for an IgG)' : ''}.`,
    };
  }
  if ('error' in conversion) {
    return {
      kind: 'problem',
      issue: `This series cannot be made from the stock: ${conversion.error}.`,
    };
  }
  return { kind: 'ready', inSeriesUnit: conversion.value, shown, material: material.name };
}
