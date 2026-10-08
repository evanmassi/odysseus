import { resolveStockTone } from '@shared/utils/stockLevel';

import type { SupplyItemStatus, SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { ItemRowStatusTone } from '@shared/ui/components/inventory';

export const SUPPLY_STATUS_DISPLAY: Record<
  SupplyItemStatus,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  active: { color: 'success', label: 'Active' },
  discontinued: { color: 'warning', label: 'Discontinued' },
  archived: { color: 'danger', label: 'Archived' },
};

export function resolveSupplyStatusTone(item: SupplyItemWithStock): ItemRowStatusTone {
  if (item.status === 'archived') return 'muted';
  const stockTone = resolveStockTone(item.totalStock, item.reorderThreshold);
  return stockTone === 'default' ? 'success' : stockTone;
}
