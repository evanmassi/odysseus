/**
 * Equipment Item Row
 *
 * Single-line row for an individual equipment item with maintenance
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

function getMaintenanceIndicator(
  nextMaintenanceDate: Date | string
):
  | { color: 'text-primary' | 'text-warning-text' | 'text-danger-text'; tooltip: string }
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
      color: 'text-danger-text',
      tooltip: `Overdue — was due ${formatDateForDisplay(dateStr)}`,
    };
  }
  if (daysUntil <= 7) {
    return {
      color: 'text-danger-text',
      tooltip: `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'} — ${formatDateForDisplay(dateStr)}`,
    };
  }
  if (daysUntil <= 30) {
    return {
      color: 'text-warning-text',
      tooltip: `Due in ${daysUntil} days — ${formatDateForDisplay(dateStr)}`,
    };
  }
  return {
    color: 'text-primary',
    tooltip: `Next maintenance: ${formatDateForDisplay(dateStr)}`,
  };
}

export function EquipmentItemRow({ item, isSelected, onSelect }: EquipmentItemRowProps) {
  const isDecommissioned = item.status === 'decommissioned';
  const maintIndicator = item.nextMaintenanceDate
    ? getMaintenanceIndicator(item.nextMaintenanceDate)
    : undefined;

  const detailParts = [item.manufacturer, item.model].filter(Boolean);
  const snPart = item.serialNumber ? `SN: ${item.serialNumber}` : undefined;

  return (
    <div
      className={`equip-nav-row equip-nav-row--item ${isSelected ? 'is-selected' : ''} ${
        isDecommissioned ? 'opacity-50 hover:opacity-65' : ''
      }`}
      onClick={() => onSelect(item.id)}
      onKeyDown={e => {
        if (e.key === 'Enter') onSelect(item.id);
      }}
      role="button"
      tabIndex={0}
    >
      {maintIndicator && (
        <Tooltip content={maintIndicator.tooltip}>
          <Wrench className={`w-3.5 h-3.5 flex-shrink-0 cursor-help ${maintIndicator.color}`} />
        </Tooltip>
      )}

      <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
        <span className="font-mono text-xs tracking-[0.02em] text-card-foreground truncate">
          {item.name}
        </span>
        {detailParts.length > 0 && (
          <>
            <span className="text-card-foreground/30 flex-shrink-0">·</span>
            <span className="text-xs text-muted-foreground truncate">
              {detailParts.join(' · ')}
            </span>
          </>
        )}
        {snPart && (
          <>
            <span className="text-card-foreground/30 flex-shrink-0">·</span>
            <span className="text-xs text-muted-foreground/60 truncate">{snPart}</span>
          </>
        )}
        {isDecommissioned && (
          <Chip color="danger" size="sm" className="uppercase tracking-wide flex-shrink-0 ml-1">
            Decommissioned
          </Chip>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
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
    </div>
  );
}
