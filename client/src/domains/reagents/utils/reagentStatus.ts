import { resolveStockTone } from '@shared/utils/stockLevel';

import { resolveExpiryBadge } from './reagentExpiry';

import type { ReagentItemStatus, ReagentItemWithStock } from '@odysseus/shared-schemas';
import type { ItemRowStatusTone } from '@shared/ui/components/inventory';

export const REAGENT_STATUS_DISPLAY: Record<
  ReagentItemStatus,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  active: { color: 'success', label: 'Active' },
  discontinued: { color: 'warning', label: 'Discontinued' },
  archived: { color: 'danger', label: 'Archived' },
};

export function resolveReagentStatusTone(item: ReagentItemWithStock): ItemRowStatusTone {
  if (item.status === 'archived') return 'muted';
  const stockTone = resolveStockTone(item.totalStock, item.reorderThreshold);
  const expiry = resolveExpiryBadge(item);
  if (expiry?.tone === 'danger' || stockTone === 'danger') return 'danger';
  if (expiry !== undefined || stockTone === 'warning') return 'warning';
  return 'success';
}
