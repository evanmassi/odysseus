/**
 * Supply Item Row
 *
 * Inset card for an individual supply item: a status line, the colored low-stock
 * icon, a two-line identity, and location/stock chips.
 */

import type { CSSProperties } from 'react';

import { AlertTriangle, MapPin } from 'lucide-react';

import { Chip } from '@shared/ui/primitives/chip/Chip';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';

interface SupplyItemRowProps {
  item: SupplyItemWithStock;
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

function getStockChipColor(
  totalStock: number,
  threshold: number | undefined
): 'success' | 'warning' | 'danger' | 'default' {
  if (threshold === undefined) return 'default';
  if (totalStock <= 0) return 'danger';
  if (totalStock <= threshold * 2) return 'warning';
  return 'success';
}

const STATUS_CHIP: Record<
  string,
  { color: 'success' | 'warning' | 'danger' | 'default'; label: string }
> = {
  active: { color: 'success', label: 'Active' },
  discontinued: { color: 'warning', label: 'Discontinued' },
  archived: { color: 'danger', label: 'Archived' },
};

export function SupplyItemRow({ item, isSelected, onSelect }: SupplyItemRowProps) {
  const isArchived = item.status === 'archived';
  const stockColor = getStockChipColor(item.totalStock, item.reorderThreshold);
  const statusInfo = STATUS_CHIP[item.status];

  // The low-stock triangle (and the warning/danger line tone) only show when the
  // item is actually at or below reorder — a healthy stock reads as active.
  const isUrgent = !isArchived && (stockColor === 'danger' || stockColor === 'warning');
  const statusTone = isArchived ? 'muted' : stockColor === 'default' ? 'success' : stockColor;

  const unit = pluralizeUnit(item.stockUnit ?? 'unit', item.totalStock);
  const urgentTooltip =
    item.totalStock <= 0
      ? 'Out of stock'
      : item.reorderThreshold !== undefined && item.totalStock <= item.reorderThreshold
        ? `Low stock — ${item.totalStock} ${unit} (reorder at ${item.reorderThreshold})`
        : `Running low — ${item.totalStock} ${unit}`;

  const identityParts = [item.manufacturer, item.catalogNumber].filter(Boolean);

  // Low/out items tint their hover + selected glow to match the alert table
  // (empty = danger/red, low = warning/amber); healthy and archived rows stay primary.
  const rowStyle: CSSProperties | undefined =
    isArchived || stockColor === 'success' || stockColor === 'default'
      ? undefined
      : ({
          '--row-tone':
            stockColor === 'danger' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
        } as CSSProperties);

  return (
    <div
      className={`nav-tree-row nav-tree-row--item ${isSelected ? 'is-selected' : ''} ${
        isArchived ? 'opacity-50 hover:opacity-65' : ''
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

      {isUrgent && (
        <Tooltip content={urgentTooltip}>
          <AlertTriangle
            className={`h-5 w-5 flex-shrink-0 cursor-help ${
              stockColor === 'danger' ? 'text-danger-text' : 'text-warning-text'
            }`}
          />
        </Tooltip>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-display text-body font-medium leading-tight text-card-foreground">
            {item.name}
          </span>
          {item.status !== 'active' && statusInfo && (
            <Chip
              color={statusInfo.color}
              size="sm"
              className="flex-shrink-0 uppercase tracking-wide"
            >
              {statusInfo.label}
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
        {item.locationNames.map(name => (
          <Chip key={name} color="info" size="sm" leftIcon={<MapPin />}>
            {name}
          </Chip>
        ))}
        <Chip color={stockColor} size="sm">
          {item.totalStock}{' '}
          {item.stockUnit ? pluralizeUnit(item.stockUnit, item.totalStock) : 'in stock'}
        </Chip>
      </div>
    </div>
  );
}
