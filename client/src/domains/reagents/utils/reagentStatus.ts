/**
 * Reagent Status Display
 *
 * Chip color + label for each reagent item status, shared by the item row and info panel.
 */

import type { ReagentItemStatus } from '@odysseus/shared-schemas';

export const REAGENT_STATUS_DISPLAY: Record<
  ReagentItemStatus,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  active: { color: 'success', label: 'Active' },
  discontinued: { color: 'warning', label: 'Discontinued' },
  archived: { color: 'danger', label: 'Archived' },
};
