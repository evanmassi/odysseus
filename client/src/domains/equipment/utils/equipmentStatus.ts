import { resolveMaintenanceDue, MAINTENANCE_DUE_SOON_DAYS } from './maintenanceSchedule';

import type { EquipmentItem, EquipmentStatus } from '@odysseus/shared-schemas';
import type { ItemRowStatusTone } from '@shared/ui/components/inventory';

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

export function resolveEquipmentStatusTone(item: EquipmentItem): ItemRowStatusTone {
  if (item.status === 'decommissioned') return 'muted';
  const due = item.nextMaintenanceDate
    ? resolveMaintenanceDue(item.nextMaintenanceDate)
    : undefined;
  if (!due) return 'success';
  if (due.daysUntil < 0) return 'danger';
  if (due.daysUntil <= MAINTENANCE_DUE_SOON_DAYS) return 'warning';
  return 'success';
}
