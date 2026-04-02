/**
 * Equipment Item Row
 *
 * Compact card-row for an individual equipment item with maintenance
 * status indicator and key identifying information.
 */

import { MapPin, Tag, Wrench } from 'lucide-react';

import { Chip } from '@shared/ui/primitives/chip/Chip';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import type { EquipmentItem } from '@odysseus/shared-schemas';

interface EquipmentItemRowProps {
  item: EquipmentItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getMaintenanceChip(date: Date): {
  color: 'info' | 'warning' | 'danger';
  label: string;
  tooltip: string;
} {
  const now = new Date();
  const daysUntil = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntil < 0) {
    return {
      color: 'danger',
      label: 'Needs Maintenance',
      tooltip: `Was due: ${formatDateForDisplay(date)}`,
    };
  }
  if (daysUntil <= 7) {
    return {
      color: 'danger',
      label: `Due: ${formatDateForDisplay(date)}`,
      tooltip: `Due in ${Math.ceil(daysUntil)} day${Math.ceil(daysUntil) === 1 ? '' : 's'}`,
    };
  }
  if (daysUntil <= 30) {
    return {
      color: 'warning',
      label: `Due: ${formatDateForDisplay(date)}`,
      tooltip: `Due in ${Math.ceil(daysUntil)} days`,
    };
  }
  return {
    color: 'info',
    label: `Due: ${formatDateForDisplay(date)}`,
    tooltip: `Next maintenance scheduled`,
  };
}

export function EquipmentItemRow({ item, isSelected, onSelect }: EquipmentItemRowProps) {
  const isDecommissioned = item.status === 'decommissioned';
  const subtitle = [item.manufacturer, item.model].filter(Boolean).join(' ');
  const nextMaintDate = item.nextMaintenanceDate ? new Date(item.nextMaintenanceDate) : undefined;
  const maintChip = nextMaintDate ? getMaintenanceChip(nextMaintDate) : undefined;

  return (
    <div
      className={`bg-card border border-border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
        isSelected
          ? 'outline outline-1 outline-offset-4 outline-primary/70'
          : isDecommissioned
            ? 'opacity-50'
            : 'hover:bg-accent/50'
      }`}
      onClick={() => onSelect(item.id)}
      onKeyDown={e => {
        if (e.key === 'Enter') onSelect(item.id);
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left: Identity */}
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-card-foreground truncate">{item.name}</h4>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          {item.serialNumber && (
            <p className="text-xs text-muted-foreground/60 truncate">SN: {item.serialNumber}</p>
          )}
        </div>

        {/* Right: Chips stacked */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {maintChip && (
            <Tooltip content={maintChip.tooltip}>
              <Chip color={maintChip.color} size="sm" leftIcon={<Wrench />} className="cursor-help">
                {maintChip.label}
              </Chip>
            </Tooltip>
          )}
          {(item.location != null || item.assetTag != null) && (
            <div className="flex items-center gap-1.5">
              {item.location && (
                <Chip color="info" size="sm" leftIcon={<MapPin />}>
                  {item.location}
                </Chip>
              )}
              {item.assetTag && (
                <Chip color="info" size="sm" leftIcon={<Tag />}>
                  {item.assetTag}
                </Chip>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
