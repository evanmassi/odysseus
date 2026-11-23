import { produce } from 'immer';

import { nameKey } from '../formulas/boardCalculation';
import { followOldNames } from '../formulas/nameRenames';
import { RATIO_NOTATION } from '../formulas/quantities';
import { AMOUNT_FIELD, UNIT_PER_ITEM } from '../materials/materialCatalog';
import { writeMaterialField } from '../materials/materialItems';
import { materialsById } from '../values/valueEdits';

import { markerAmount } from './markerAmount';

import type { MovedMarkerDilution, Protocol } from '@odysseus/shared-schemas';

const oldDilutionName = (materialName: string) => `${materialName.trim()} dilution factor`;

export function withMovedMarkerDilutions(
  protocol: Protocol,
  moved: readonly MovedMarkerDilution[]
): Protocol {
  if (!moved.length) return protocol;
  return produce(protocol, draft => {
    const materials = materialsById(draft);
    const byOldName = new Map<string, string>();
    for (const { materialId, dilution } of moved) {
      const material = materials.get(materialId);
      const amount = material && markerAmount(material);
      if (!material || !amount) continue;
      if (!amount.value.trim()) {
        if (amount.field.unit === UNIT_PER_ITEM) material.units[AMOUNT_FIELD] = RATIO_NOTATION;
        writeMaterialField(material, amount.field, dilution);
      }
      const name = markerAmount(material)?.name ?? amount.name;
      byOldName.set(nameKey(oldDilutionName(material.name)), name);
    }
    followOldNames(draft, byOldName);
  });
}
