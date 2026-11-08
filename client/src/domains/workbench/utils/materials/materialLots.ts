import { showMaterialField } from './materialItems';

import type { MaterialItem, Protocol } from '@odysseus/shared-schemas';

type LotMemory = Protocol['lotMemory'];

export const LOT_FIELD = 'lot';

const lotOf = (item: MaterialItem) => (item.values[LOT_FIELD] ?? '').trim();

export function rememberLotValue(
  lotMemory: LotMemory,
  item: MaterialItem,
  key: string,
  value: string
): void {
  const lot = lotOf(item);
  if (!lot) return;
  const lots = (lotMemory[item.id] ??= {});
  (lots[lot] ??= {})[key] = value;
}

export function fillFromLotMemory(lotMemory: LotMemory, item: MaterialItem): boolean {
  const remembered = lotMemory[item.id]?.[lotOf(item)];
  if (!remembered) return false;
  let isFilled = false;
  for (const [key, value] of Object.entries(remembered)) {
    if ((item.values[key] ?? '').trim()) continue;
    item.values[key] = value;
    showMaterialField(item, key);
    isFilled = true;
  }
  return isFilled;
}
