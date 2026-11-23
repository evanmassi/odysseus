import { unitScale, type FieldDefinition, type MaterialItem } from '@odysseus/shared-schemas';

import { STOCK_FIELD } from '../dilutions/dilutionStock';
import { nameKey, type BoardName } from '../formulas/boardCalculation';
import { dimensionKey, displayValue, RATIO_NOTATION } from '../formulas/quantities';
import {
  AMOUNT_FIELD,
  fieldLabel,
  fieldName,
  fieldUnit,
  materialFields,
} from '../materials/materialCatalog';
import { ANTIBODY_DILUTION, STOCK_CONCENTRATION } from '../terms/termList';
import { lowerLead } from '../values/valueNames';

export interface MarkerAmount {
  field: FieldDefinition;
  value: string;
  unit: string;
  name: string;
  label: string;
  text: string;
}

export interface MarkerDose {
  share: string | undefined;
  perWell: string | undefined;
  problem: string | undefined;
}

const VOLUME = dimensionKey({ volume: 1 });

const isVolume = (unit: string) => dimensionKey(unitScale(unit)?.dimension ?? {}) === VOLUME;

export function markerAmount(item: MaterialItem): MarkerAmount | undefined {
  const field = materialFields(item).find(definition => definition.key === AMOUNT_FIELD);
  if (!field) return undefined;
  const value = item.values[AMOUNT_FIELD] ?? '';
  const unit = fieldUnit(item, field);
  return {
    field,
    value,
    unit,
    name: fieldName(item, field),
    label: fieldLabel(item, field),
    text: value.trim() ? displayValue(value, unit) : '',
  };
}

const problemOnly = (problem: string): MarkerDose => ({
  share: undefined,
  perWell: undefined,
  problem,
});

export function markerDose(
  item: MaterialItem,
  names: ReadonlyMap<string, BoardName>,
  volume: string | undefined
): MarkerDose {
  const amount = markerAmount(item);
  if (!amount) return problemOnly(`${item.type} has no ${ANTIBODY_DILUTION.word} in Materials`);
  if (!names.has(nameKey(amount.name))) {
    return problemOnly(`Needs a ${lowerLead(amount.label)}: set it here or in Materials`);
  }
  const { name, unit } = amount;
  if (unit === RATIO_NOTATION) {
    return { share: name, perWell: volume && `${volume} × ${name}`, problem: undefined };
  }
  if (isVolume(unit)) {
    return { share: volume && `${name} ÷ ${volume}`, perWell: name, problem: undefined };
  }
  const stockField = materialFields(item).find(definition => definition.key === STOCK_FIELD);
  const stock = stockField && fieldName(item, stockField);
  if (!stock || !names.has(nameKey(stock))) {
    return problemOnly(
      `Needs ${item.name.trim()}'s ${lowerLead(STOCK_CONCENTRATION.word)} in Materials`
    );
  }
  return {
    share: `${name} ÷ ${stock}`,
    perWell: volume && `${volume} × ${name} ÷ ${stock}`,
    problem: undefined,
  };
}
