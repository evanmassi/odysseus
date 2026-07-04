/**
 * Supply Status Display
 *
 * Chip color + label for each supply item status, shared by the item row and info panel.
 */

import type { SupplyItemStatus } from '@odysseus/shared-schemas';

export const SUPPLY_STATUS_DISPLAY: Record<
  SupplyItemStatus,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  active: { color: 'success', label: 'Active' },
  discontinued: { color: 'warning', label: 'Discontinued' },
  archived: { color: 'danger', label: 'Archived' },
};
