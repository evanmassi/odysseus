/**
 * Equipment Status Display
 *
 * Chip color + label for each equipment status, shared by the edit form,
 * info panel, and bulk update.
 */

import type { EquipmentStatus } from '@odysseus/shared-schemas';

export const EQUIPMENT_STATUS_DISPLAY: Record<
  EquipmentStatus,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  active: { color: 'success', label: 'Active' },
  inactive: { color: 'default', label: 'Inactive' },
  under_maintenance: { color: 'warning', label: 'Under Maintenance' },
  out_of_service: { color: 'danger', label: 'Out of Service' },
  decommissioned: { color: 'danger', label: 'Decommissioned' },
};
