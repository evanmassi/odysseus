import { lineValueOf, normalizePlateMap, plateValueKey } from './plateMapValues';

import type { Protocol } from './protocolFileSchemas';

export function moveStainsToStainSide(protocol: Protocol): void {
  const stainIds = new Map<string, string>();
  for (const card of protocol.blocks) {
    if (card.type !== 'cytometer') continue;
    for (const stain of card.mixes) {
      const key = plateValueKey(stain.name);
      if (key && !stainIds.has(key)) stainIds.set(key, stain.id);
    }
  }
  if (!stainIds.size) return;
  for (const card of protocol.blocks) {
    if (card.type !== 'plate') continue;
    for (const [wellKey, lines] of Object.entries(card.cells)) {
      for (const line of card.lines) {
        const stainId = stainIds.get(plateValueKey(lineValueOf(line, lines[line.id])?.text ?? ''));
        if (!stainId) continue;
        card.stain[wellKey] ??= stainId;
        delete lines[line.id];
      }
    }
    normalizePlateMap(card);
  }
}
