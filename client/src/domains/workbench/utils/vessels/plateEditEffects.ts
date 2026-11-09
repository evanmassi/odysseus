import { nameKey } from '../formulas/boardCalculation';
import { materialsById, sectionName } from '../values/valueEdits';
import { joinValueName } from '../values/valueNames';

import { plateAmounts } from './vesselMapNames';

import type { Protocol, VesselMapBlock } from '@odysseus/shared-schemas';

const vesselMaps = (protocol: Protocol) =>
  protocol.blocks.filter((block): block is VesselMapBlock => block.type === 'plate');

const plateValueTexts = (protocol: Protocol) =>
  new Map(
    vesselMaps(protocol).flatMap(plate =>
      plate.lines.flatMap(line => line.values.map(value => [value.id, value.text.trim()] as const))
    )
  );

export function renameMaterialsAfterPlateValues(before: Protocol, draft: Protocol): void {
  const previous = plateValueTexts(before);
  const materials = draft.blocks.flatMap(block => (block.type === 'materials' ? block.items : []));
  const named = (text: string) => materials.find(item => nameKey(item.name) === nameKey(text));
  for (const [valueId, text] of plateValueTexts(draft)) {
    const old = previous.get(valueId);
    if (!old || !text || nameKey(old) === nameKey(text) || named(text)) continue;
    const material = named(old);
    if (material) material.name = text;
  }
}

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
