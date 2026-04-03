/**
 * Equipment Item Row
 *
 * Compact card-row for an individual equipment item with maintenance
 * status indicator and key identifying information.
 */

import { MapPin, Tag, Wrench } from 'lucide-react';

import { Chip } from '@shared/ui/primitives/chip/Chip';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { formatDateForDisplay, normalizeDateString } from '@shared/utils/dateFormatters';

import type { EquipmentItem } from '@odysseus/shared-schemas';

interface EquipmentItemRowProps {
  item: EquipmentItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getMaintenanceChip(nextMaintenanceDate: Date | string):
  | {
      color: 'info' | 'warning' | 'danger';
      label: string;
      tooltip: string;
    }
  | undefined {
  const dateStr = normalizeDateString(nextMaintenanceDate);
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return {
      color: 'danger',
      label: 'Needs Maintenance',
      tooltip: `Was due: ${formatDateForDisplay(dateStr)}`,
    };
  }
  if (daysUntil <= 7) {
    return {
      color: 'danger',
      label: `Due: ${formatDateForDisplay(dateStr)}`,
      tooltip: `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
    };
  }
  if (daysUntil <= 30) {
    return {
      color: 'warning',
      label: `Due: ${formatDateForDisplay(dateStr)}`,
      tooltip: `Due in ${daysUntil} days`,
    };
  }
  return {
    color: 'info',
    label: `Due: ${formatDateForDisplay(dateStr)}`,
    tooltip: `Next maintenance scheduled`,
  };
}

export function EquipmentItemRow({ item, isSelected, onSelect }: EquipmentItemRowProps) {
  const isDecommissioned = item.status === 'decommissioned';
  const subtitle = [item.manufacturer, item.model].filter(Boolean).join(' ');
  const maintChip = item.nextMaintenanceDate
    ? getMaintenanceChip(item.nextMaintenanceDate)
    : undefined;

  return (
    <div
      className={`rounded-lg px-3 py-2 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-card brightness-125 border-l-2 border-l-primary border-y border-r border-border shadow-sm'
          : isDecommissioned
            ? 'bg-card border border-border opacity-50 hover:opacity-65'
            : 'bg-card border border-border hover:bg-accent/50'
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
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-card-foreground truncate">{item.name}</h4>
            {isDecommissioned && (
              <Chip color="danger" size="sm" className="uppercase tracking-wide flex-shrink-0">
                Decommissioned
              </Chip>
            )}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          {item.serialNumber && (
            <p className="text-xs text-muted-foreground/60 truncate">SN: {item.serialNumber}</p>
          )}
        </div>

        {/* Right: Chips stacked */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
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
          {maintChip && (
            <Tooltip content={maintChip.tooltip}>
              <Chip color={maintChip.color} size="sm" leftIcon={<Wrench />} className="cursor-help">
                {maintChip.label}
              </Chip>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
