import { nameKey } from '../formulas/boardCalculation';
import { materialsById, sectionName } from '../values/valueEdits';
import { joinValueName } from '../values/valueNames';

import { plateAmounts } from './vesselMapNames';

import type { Protocol, VesselMapBlock } from '@odysseus/shared-schemas';

const vesselMaps = (protocol: Protocol) =>
  protocol.blocks.filter((block): block is VesselMapBlock => block.type === 'plate');

export function dropValuesTwinnedByPlate(
  draft: Protocol,
  knownNames: ReadonlyMap<string, string>
): void {
  const newPlateNames = new Set(
    vesselMaps(draft).flatMap(plate =>
      plateAmounts(plate)
        .filter(amount => knownNames.get(`${plate.id}:${amount.key}`) !== amount.name)
        .map(amount => nameKey(amount.name))
    )
  );
  if (!newPlateNames.size) return;
  const materials = materialsById(draft);
  for (const block of draft.blocks) {
    if (block.type !== 'values') continue;
    block.items = block.items.filter(item => {
      if ('materialField' in item) return true;
      const section = block.sections.find(candidate => candidate.id === item.section);
      const fullName = section
        ? joinValueName(sectionName(section, materials), item.name)
        : item.name;
      return !newPlateNames.has(nameKey(fullName));
    });
  }
}
