import { nameKey } from '../formulas/boardCalculation';
import { materialsById, valueRowName } from '../values/valueEdits';
import { joinValueName } from '../values/valueNames';

import { plateAmounts } from './plateMapNames';

import type { Protocol, PlateMapCard } from '@odysseus/shared-schemas';

const plateMaps = (protocol: Protocol) =>
  protocol.cards.filter((card): card is PlateMapCard => card.type === 'plateMap');

export function removeValuesTwinnedByPlate(
  draft: Protocol,
  knownNames: ReadonlyMap<string, string>
): void {
  const newPlateNames = new Set(
    plateMaps(draft).flatMap(plateMap =>
      plateAmounts(plateMap)
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
