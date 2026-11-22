import { lineValueOf, normalizePlateMap, plateValueKey } from './plateMapValues';

import type { Protocol } from './protocolFileSchemas';

export function moveStainsToStainSide(protocol: Protocol): void {
  const stainIds = new Map<string, string>();
  for (const block of protocol.blocks) {
    if (block.type !== 'cytometer') continue;
    for (const stain of block.mixes) {
      const key = plateValueKey(stain.name);
      if (key && !stainIds.has(key)) stainIds.set(key, stain.id);
    }
  }
  if (!stainIds.size) return;
  for (const block of protocol.blocks) {
    if (block.type !== 'plate') continue;
    for (const [wellKey, lines] of Object.entries(block.cells)) {
      for (const line of block.lines) {
        const stainId = stainIds.get(plateValueKey(lineValueOf(line, lines[line.id])?.text ?? ''));
        if (!stainId) continue;
        block.stain[wellKey] ??= stainId;
        delete lines[line.id];
      }
    }
    normalizePlateMap(block);
  }
}
