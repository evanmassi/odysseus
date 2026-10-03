import { formatQuantity, pluralizeUnit } from '@odysseus/shared-schemas';
import { AlertTriangle, CalendarClock, MapPin } from 'lucide-react';

import { resolveExpiryBadge } from '@domains/reagents/utils/reagentExpiry';
import {
  REAGENT_STATUS_DISPLAY,
  resolveReagentStatusTone,
} from '@domains/reagents/utils/reagentStatus';
import { ItemRowShell } from '@shared/ui/components/inventory';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { resolveStockTone } from '@shared/utils/stockLevel';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

interface ReagentItemRowProps {
  item: ReagentItemWithStock;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function ReagentItemRow({ item, isSelected, onSelect }: ReagentItemRowProps) {
  const isArchived = item.status === 'archived';
  const statusInfo = REAGENT_STATUS_DISPLAY[item.status];
  const stockTone = resolveStockTone(item.totalStock, item.reorderThreshold);
  const expiry = isArchived ? undefined : resolveExpiryBadge(item);

  const stockAmount = (value: number) =>
    item.stockUnit ? formatQuantity(value, item.stockUnit) : String(value);
  const stockLabel = stockAmount(item.totalStock);

  const stockUrgency: 'danger' | 'warning' | undefined =
    !isArchived && (stockTone === 'danger' || stockTone === 'warning') ? stockTone : undefined;

  const statusTone = resolveReagentStatusTone(item);
  const urgentTone = statusTone === 'danger' || statusTone === 'warning' ? statusTone : undefined;

  const stockDetail =
    item.totalStock <= 0
      ? 'Out of stock'
      : item.reorderThreshold !== undefined && item.totalStock <= item.reorderThreshold
        ? `Low stock — ${stockLabel} (reorder at ${stockAmount(item.reorderThreshold)})`
        : `Running low — ${stockLabel}`;

  const urgentTooltip = [expiry?.detail, stockUrgency !== undefined ? stockDetail : undefined]
    .filter(Boolean)
    .join(' · ');

  return (
    <ItemRowShell
      id={item.id}
      isSelected={isSelected}
      onSelect={onSelect}
      statusTone={statusTone}
      name={item.name}
      identityParts={[item.manufacturer, item.catalogNumber]}
      leadingIcon={
        urgentTone ? (
          <Tooltip content={urgentTooltip}>
            <AlertTriangle
              className={`h-5 w-5 flex-shrink-0 cursor-help ${
                urgentTone === 'danger' ? 'text-danger-text' : 'text-warning-text'
              }`}
            />
          </Tooltip>
        ) : undefined
      }
      badge={
        <>
          {item.status !== 'active' && (
            <Chip
              color={statusInfo.color}
              size="sm"
              className="flex-shrink-0 uppercase tracking-wide"
            >
              {statusInfo.label}
            </Chip>
          )}
          {expiry && (
            <Chip color={expiry.tone} size="sm" lead={<CalendarClock />} className="flex-shrink-0">
              {expiry.label}
            </Chip>
          )}
        </>
      }
      trailing={
        <>
          {item.locationNames.map(name => (
            <Chip key={name} color="info" size="sm" lead={<MapPin />}>
              {name}
            </Chip>
          ))}
          <Chip color={stockTone} size="sm">
            {stockLabel} · {item.lotCount} {pluralizeUnit('lot', item.lotCount)}
          </Chip>
        </>
      }
    />
  );
}
