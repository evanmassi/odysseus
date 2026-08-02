/**
 * Equipment Item Row
 *
 * Inset card for an individual equipment item: a status line, the colored
 * maintenance icon, a two-line identity, and location/asset chips.
 */

import { MapPin, Tag, Wrench } from 'lucide-react';

import { resolveMaintenanceDue } from '@domains/equipment/utils/maintenanceSchedule';
import { ItemRowShell, type ItemRowStatusTone } from '@shared/ui/components/inventory';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import type { EquipmentItem } from '@odysseus/shared-schemas';

interface EquipmentItemRowProps {
  item: EquipmentItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  /** Resolved by the tab, which already holds the lab's location tree. */
  locationName?: string;
}

function getMaintenanceIndicator(
  nextMaintenanceDate: Date | string
):
  | { color: 'text-primary' | 'text-warning-text' | 'text-danger-text'; tooltip: string }
  | undefined {
  const due = resolveMaintenanceDue(nextMaintenanceDate);
  if (!due) return undefined;
  const { daysUntil, dateStr } = due;

  if (daysUntil < 0) {
    return {
      color: 'text-danger-text',
      tooltip: `Overdue — was due ${formatDateForDisplay(dateStr)}`,
    };
  }
  if (daysUntil <= 30) {
    return {
      color: 'text-warning-text',
      tooltip: `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'} — ${formatDateForDisplay(dateStr)}`,
    };
  }
  return {
    color: 'text-primary',
    tooltip: `Next maintenance: ${formatDateForDisplay(dateStr)}`,
  };
}

export function EquipmentItemRow({
  item,
  isSelected,
  onSelect,
  locationName,
}: EquipmentItemRowProps) {
  const isDecommissioned = item.status === 'decommissioned';
  const maint = item.nextMaintenanceDate
    ? getMaintenanceIndicator(item.nextMaintenanceDate)
    : undefined;

  // Maintenance wrench (and the warning/danger line tone) only show when actually
  // due or overdue — a far-future schedule reads as active.
  const isUrgent = maint?.color === 'text-warning-text' || maint?.color === 'text-danger-text';
  const statusTone: ItemRowStatusTone = isDecommissioned
    ? 'muted'
    : maint?.color === 'text-danger-text'
      ? 'danger'
      : maint?.color === 'text-warning-text'
        ? 'warning'
        : 'success';

  return (
    <ItemRowShell
      id={item.id}
      isSelected={isSelected}
      onSelect={onSelect}
      statusTone={statusTone}
      name={item.name}
      identityParts={[
        item.manufacturer,
        item.model,
        item.serialNumber ? `SN ${item.serialNumber}` : undefined,
      ]}
      leadingIcon={
        isUrgent && maint ? (
          <Tooltip content={maint.tooltip}>
            <Wrench className={`h-5 w-5 flex-shrink-0 cursor-help ${maint.color}`} />
          </Tooltip>
        ) : undefined
      }
      badge={
        isDecommissioned && (
          <Chip color="danger" size="sm" className="flex-shrink-0 uppercase tracking-wide">
            Decommissioned
          </Chip>
        )
      }
      trailing={
        <>
          {locationName && (
            <Chip color="info" size="sm" lead={<MapPin />}>
              {locationName}
            </Chip>
          )}
          {item.assetTag && (
            <Chip color="info" size="sm" lead={<Tag />}>
              {item.assetTag}
            </Chip>
          )}
        </>
      }
    />
  );
}
