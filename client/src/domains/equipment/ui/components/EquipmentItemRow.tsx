/**
 * Equipment Item Row
 *
 * Inset card for an individual equipment item: a status line, the colored
 * maintenance icon, a two-line identity, and location/asset chips.
 */

import type { CSSProperties } from 'react';

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

/** Short status stripe — same idiom as the navigator locator strip. */
const STATUS_LINE: Record<'success' | 'warning' | 'danger' | 'muted', string> = {
  success: 'bg-success-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-success-bg)/0.6)]',
  warning: 'bg-warning-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-warning-bg)/0.6)]',
  danger: 'bg-danger-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-danger-bg)/0.6)]',
  muted: 'bg-muted-foreground/40',
};

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

export function EquipmentItemRow({ item, isSelected, onSelect }: EquipmentItemRowProps) {
  const isDecommissioned = item.status === 'decommissioned';
  const maint = item.nextMaintenanceDate
    ? getMaintenanceIndicator(item.nextMaintenanceDate)
    : undefined;

  // Maintenance wrench (and the warning/danger line tone) only show when actually
  // due or overdue — a far-future schedule reads as active.
  const isUrgent = maint?.color === 'text-warning-text' || maint?.color === 'text-danger-text';
  const statusTone = isDecommissioned
    ? 'muted'
    : maint?.color === 'text-danger-text'
      ? 'danger'
      : maint?.color === 'text-warning-text'
        ? 'warning'
        : 'success';

  const identityParts = [
    item.manufacturer,
    item.model,
    item.serialNumber ? `SN ${item.serialNumber}` : '',
  ].filter(Boolean);

  // Due-soon/overdue items tint their hover + selected glow to match the maintenance
  // alert table (overdue = danger/red, due-soon = warning/amber); healthy and
  // decommissioned rows stay primary.
  const rowStyle: CSSProperties | undefined =
    statusTone === 'danger'
      ? ({ '--row-tone': 'var(--color-danger-bg)' } as CSSProperties)
      : statusTone === 'warning'
        ? ({ '--row-tone': 'var(--color-warning-bg)' } as CSSProperties)
        : undefined;

  return (
    <div
      className={`nav-tree-row nav-tree-row--item ${isSelected ? 'is-selected' : ''} ${
        isDecommissioned ? 'opacity-50 hover:opacity-65' : ''
      }`}
      style={rowStyle}
      onClick={() => onSelect(item.id)}
      onKeyDown={e => {
        if (e.key === 'Enter') onSelect(item.id);
      }}
      role="button"
      tabIndex={0}
    >
      <span aria-hidden className={`h-7 w-0.5 flex-shrink-0 ${STATUS_LINE[statusTone]}`} />

      {isUrgent && maint && (
        <Tooltip content={maint.tooltip}>
          <Wrench className={`h-5 w-5 flex-shrink-0 cursor-help ${maint.color}`} />
        </Tooltip>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-display text-body font-medium leading-tight text-card-foreground">
            {item.name}
          </span>
          {isDecommissioned && (
            <Chip color="danger" size="sm" className="flex-shrink-0 uppercase tracking-wide">
              Decommissioned
            </Chip>
          )}
        </div>
        {identityParts.length > 0 && (
          <span className="truncate font-mono text-data-sm tracking-[0.02em] text-muted-foreground">
            {identityParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1.5 text-foreground/30">{'//'}</span>}
                {part}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5">
        {item.location && (
          <Chip color="info" size="sm" lead={<MapPin />}>
            {item.location}
          </Chip>
        )}
        {item.assetTag && (
          <Chip color="info" size="sm" lead={<Tag />}>
            {item.assetTag}
          </Chip>
        )}
      </div>
    </div>
  );
}
