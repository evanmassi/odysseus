import { nameKey } from '../formulas/boardCalculation';
import { materialsById, valueRowName } from '../values/valueEdits';
import { joinValueName } from '../values/valueNames';

import { plateAmounts } from './plateMapNames';

import type { Protocol } from '@odysseus/shared-schemas';

export function removeValuesTwinnedByPlate(
  draft: Protocol,
  knownNames: ReadonlyMap<string, string>
): void {
  const newPlateNames = new Set(
    draft.plateMaps.flatMap(plateMap =>
      plateAmounts(plateMap, draft.series)
        .filter(amount => knownNames.get(`${plateMap.id}:${amount.key}`) !== amount.name)
        .map(amount => nameKey(amount.name))
    )
  );
  if (!newPlateNames.size) return;
  const materials = materialsById(draft);
  const { values } = draft;
  values.items = values.items.filter(item => {
    if ('materialField' in item) return true;
    const valueRow = values.rows.find(candidate => candidate.id === item.row);
    const fullName = valueRow
      ? joinValueName(valueRowName(valueRow, materials), item.name)
      : item.name;
    return !newPlateNames.has(nameKey(fullName));
  });
}
