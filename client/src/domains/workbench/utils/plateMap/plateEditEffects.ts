import { nameKey } from '../formulas/boardCalculation';
import { materialsById, valueRowName } from '../values/valueEdits';
import { joinValueName } from '../values/valueNames';

import { plateAmounts } from './plateMapNames';

import type { Protocol, PlateMapCard } from '@odysseus/shared-schemas';

const plateMaps = (protocol: Protocol) =>
  protocol.blocks.filter((card): card is PlateMapCard => card.type === 'plate');

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
  for (const card of draft.blocks) {
    if (card.type !== 'values') continue;
    card.items = card.items.filter(item => {
      if ('materialField' in item) return true;
      const valueRow = card.sections.find(candidate => candidate.id === item.section);
      const fullName = valueRow
        ? joinValueName(valueRowName(valueRow, materials), item.name)
        : item.name;
      return !newPlateNames.has(nameKey(fullName));
    });
  }
}
