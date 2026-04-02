/**
 * Equipment Item Row
 *
 * Card-row for an individual equipment item, modeled after the lab cards
 * in SystemAdminDashboard. Two-row layout with status chip and info chips.
 */

import { MapPin, Tag, Wrench } from 'lucide-react';

import { Chip } from '@shared/ui/primitives/chip/Chip';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';

import type { EquipmentItem } from '@odysseus/shared-schemas';

interface EquipmentItemRowProps {
  item: EquipmentItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const STATUS_CONFIG: Record<
  string,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  operational: { color: 'success', label: 'Operational' },
  maintenance: { color: 'warning', label: 'Maintenance' },
  out_of_service: { color: 'danger', label: 'Out of Service' },
  decommissioned: { color: 'default', label: 'Decommissioned' },
};

function isMaintenanceApproaching(date: Date): boolean {
  const now = new Date();
  const daysUntil = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= 30 && daysUntil > 0;
}

function isMaintenanceOverdue(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function EquipmentItemRow({ item, isSelected, onSelect }: EquipmentItemRowProps) {
  const isDecommissioned = item.status === 'decommissioned';
  const statusConfig = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['operational'];

  const subtitle = [item.manufacturer, item.model].filter(Boolean).join(' ');

  const nextMaintDate = item.nextMaintenanceDate ? new Date(item.nextMaintenanceDate) : undefined;
  const maintChipColor = nextMaintDate
    ? isMaintenanceOverdue(nextMaintDate)
      ? ('danger' as const)
      : isMaintenanceApproaching(nextMaintDate)
        ? ('warning' as const)
        : ('info' as const)
    : undefined;

  return (
    <div
      className={`rounded-lg cursor-pointer transition-colors outline outline-1 outline-offset-1 p-1 space-y-1 ${
        isSelected
          ? 'outline-primary/70'
          : isDecommissioned
            ? 'outline-muted-foreground/20 opacity-50'
            : 'outline-secondary-foreground/50'
      }`}
      onClick={() => onSelect(item.id)}
      onKeyDown={e => {
        if (e.key === 'Enter') onSelect(item.id);
      }}
      role="button"
      tabIndex={0}
    >
      {/* Row 1: Name + Status */}
      <div className="px-3 py-2.5 rounded-md bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-card-foreground truncate">{item.name}</h4>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <Chip
            color={statusConfig.color}
            size="sm"
            className={isDecommissioned ? 'opacity-60' : undefined}
          >
            {statusConfig.label}
          </Chip>
        </div>
      </div>

      {/* Row 2: Info chips */}
      <div className="px-3 py-1.5 rounded-md bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.location && (
              <Chip color="info" size="sm" leftIcon={<MapPin />}>
                {item.location}
              </Chip>
            )}
            {item.internalId && (
              <Chip color="info" size="sm" leftIcon={<Tag />}>
                {item.internalId}
              </Chip>
            )}
            {nextMaintDate && maintChipColor && (
              <Tooltip content={`Next maintenance: ${nextMaintDate.toLocaleDateString()}`}>
                <Chip
                  color={maintChipColor}
                  size="sm"
                  leftIcon={<Wrench />}
                  className="cursor-help"
                >
                  {nextMaintDate.toLocaleDateString()}
                </Chip>
              </Tooltip>
            )}
          </div>
          {item.serialNumber && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              SN: {item.serialNumber}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
