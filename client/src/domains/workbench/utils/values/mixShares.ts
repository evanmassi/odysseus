import { nameKey, type BoardCalculation } from '../formulas/boardCalculation';
import {
  autoFormat,
  displayValue,
  isSameDimension,
  quantityOf,
  readNumber,
  readableAmount,
  type Quantity,
} from '../formulas/quantities';

import { columnKey } from './valueNames';

export type WellShare = { share: number; working: string } | { missing: string };

const WELL_VOLUME_NAMES = ['Well volume', 'Final well volume', 'Total well volume'];
const VOLUME_PER_WELL = columnKey('Volume per well');
const VOLUME = { volume: 1 };
const SIGNIFICANT_FIGURES = 3;

const isVolume = (quantity: Quantity | undefined): quantity is Quantity =>
  !!quantity && quantity.magnitude > 0 && isSameDimension(quantity.dimension, VOLUME);

function wellVolume(
  calculation: BoardCalculation
): { name: string; quantity: Quantity } | undefined {
  for (const name of WELL_VOLUME_NAMES) {
    const entry = calculation.names.get(nameKey(name));
    const result = entry?.kind === 'formula' ? calculation.results.get(entry.id) : undefined;
    const quantity =
      entry?.kind === 'value'
        ? quantityOf(entry.value, entry.unit)
        : result?.status === 'ok'
          ? result.quantity
          : undefined;
    if (entry && isVolume(quantity)) return { name: entry.name, quantity };
  }
  return undefined;
}

export function wellShareOf(
  cells: readonly { columnKey: string; value: string; unit: string }[],
  calculation: BoardCalculation
): WellShare {
  const added = cells.find(cell => cell.columnKey === VOLUME_PER_WELL);
  const addedVolume = added && quantityOf(added.value, added.unit);
  if (!added || !isVolume(addedVolume)) return { missing: 'Needs a Volume per well on this row' };
  const total = wellVolume(calculation);
  if (!total) {
    return { missing: 'Needs the well total: add "Well volume 80 µL" under Whole experiment' };
  }
  return {
    share: addedVolume.magnitude / total.quantity.magnitude,
    working: `× ${displayValue(added.value, added.unit)} ÷ ${autoFormat(total.quantity)} (${total.name})`,
  };
}

export function scaledAmount(amount: string, unit: string, share: number): string | undefined {
  const number = readNumber(amount);
  if (number === undefined) return undefined;
  return readableAmount(String(Number((number * share).toPrecision(SIGNIFICANT_FIGURES))), unit);
}
