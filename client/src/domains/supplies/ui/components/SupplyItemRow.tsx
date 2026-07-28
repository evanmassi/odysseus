/**
 * Supply Item Row
 *
 * Inset card for an individual supply item: a status line, the colored low-stock
 * icon, a two-line identity, and location/stock chips.
 */

import { AlertTriangle, MapPin } from 'lucide-react';

import { SUPPLY_STATUS_DISPLAY } from '@domains/supplies/utils/supplyStatus';
import { ItemRowShell, type ItemRowStatusTone } from '@shared/ui/components/inventory';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';
import { resolveStockTone } from '@shared/utils/stockLevel';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';

interface SupplyItemRowProps {
  item: SupplyItemWithStock;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function SupplyItemRow({ item, isSelected, onSelect }: SupplyItemRowProps) {
  const isArchived = item.status === 'archived';
  const stockColor = resolveStockTone(item.totalStock, item.reorderThreshold);
  const statusInfo = SUPPLY_STATUS_DISPLAY[item.status];

  // The tooltip distinguishes "running low" (the early warning band) from "low stock".
  const isUrgent = !isArchived && (stockColor === 'danger' || stockColor === 'warning');
  const statusTone: ItemRowStatusTone = isArchived
    ? 'muted'
    : stockColor === 'default'
      ? 'success'
      : stockColor;

  const unit = pluralizeUnit(item.stockUnit ?? 'unit', item.totalStock);
  const urgentTooltip =
    item.totalStock <= 0
      ? 'Out of stock'
      : item.reorderThreshold !== undefined && item.totalStock <= item.reorderThreshold
        ? `Low stock — ${item.totalStock} ${unit} (reorder at ${item.reorderThreshold})`
        : `Running low — ${item.totalStock} ${unit}`;

  return (
    <ItemRowShell
      id={item.id}
      isSelected={isSelected}
      onSelect={onSelect}
      statusTone={statusTone}
      name={item.name}
      identityParts={[item.manufacturer, item.catalogNumber]}
      leadingIcon={
        isUrgent ? (
          <Tooltip content={urgentTooltip}>
            <AlertTriangle
              className={`h-5 w-5 flex-shrink-0 cursor-help ${
                stockColor === 'danger' ? 'text-danger-text' : 'text-warning-text'
              }`}
            />
          </Tooltip>
        ) : undefined
      }
      badge={
        item.status !== 'active' &&
        statusInfo && (
          <Chip
            color={statusInfo.color}
            size="sm"
            className="flex-shrink-0 uppercase tracking-wide"
          >
            {statusInfo.label}
          </Chip>
        )
      }
      trailing={
        <>
          {item.locationNames.map(name => (
            <Chip key={name} color="info" size="sm" lead={<MapPin />}>
              {name}
            </Chip>
          ))}
          <Chip color={stockColor} size="sm">
            {item.totalStock}{' '}
            {item.stockUnit ? pluralizeUnit(item.stockUnit, item.totalStock) : 'in stock'}
          </Chip>
        </>
      }
    />
  );
}
