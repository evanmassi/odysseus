import { nameKey } from '../formulas/boardCalculation';
import { materialsById, valueRowName } from '../values/valueEdits';
import { joinValueName } from '../values/valueNames';

import { plateAmounts } from './plateMapNames';

import type { Protocol, PlateMapBlock } from '@odysseus/shared-schemas';

const plateMaps = (protocol: Protocol) =>
  protocol.blocks.filter((block): block is PlateMapBlock => block.type === 'plate');

export function dropValuesTwinnedByPlate(
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
  for (const block of draft.blocks) {
    if (block.type !== 'values') continue;
    block.items = block.items.filter(item => {
      if ('materialField' in item) return true;
      const valueRow = block.sections.find(candidate => candidate.id === item.section);
      const fullName = valueRow
        ? joinValueName(valueRowName(valueRow, materials), item.name)
        : item.name;
      return !newPlateNames.has(nameKey(fullName));
    });
  }
}
