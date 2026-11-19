import { lineValueOf, normalizeVesselMap, plateValueKey } from './vesselMapValues';

import type { Protocol } from './protocolFileSchemas';

export function moveMixesToStainSide(protocol: Protocol): void {
  const mixIds = new Map<string, string>();
  for (const block of protocol.blocks) {
    if (block.type !== 'cytometer') continue;
    for (const mix of block.mixes) {
      const key = plateValueKey(mix.name);
      if (key && !mixIds.has(key)) mixIds.set(key, mix.id);
    }
  }
  if (!mixIds.size) return;
  for (const block of protocol.blocks) {
    if (block.type !== 'plate') continue;
    for (const [wellKey, lines] of Object.entries(block.cells)) {
      for (const line of block.lines) {
        const mixId = mixIds.get(plateValueKey(lineValueOf(line, lines[line.id])?.text ?? ''));
        if (!mixId) continue;
        block.stain[wellKey] ??= mixId;
        delete lines[line.id];
      }
    }
    normalizeVesselMap(block);
  }
}
