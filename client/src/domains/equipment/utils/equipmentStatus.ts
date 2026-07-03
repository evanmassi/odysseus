/**
 * Equipment Status Labels
 *
 * Human-readable labels for equipment statuses, shared by the edit form,
 * info panel, and bulk update.
 */

import type { EquipmentStatus } from '@odysseus/shared-schemas';

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  under_maintenance: 'Under Maintenance',
  out_of_service: 'Out of Service',
  decommissioned: 'Decommissioned',
};
