/**
 * Consumable Product Row
 *
 * Single-line row for a consumable product with stock level indicator,
 * category info, and key identifying details.
 */

import { MapPin } from 'lucide-react';

import { Chip } from '@shared/ui/primitives/chip/Chip';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { ConsumableProductWithStock } from '@odysseus/shared-schemas';

interface ConsumableProductRowProps {
  product: ConsumableProductWithStock;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getStockChipColor(
  totalStock: number,
  threshold: number | undefined
): 'success' | 'warning' | 'danger' | 'default' {
  if (threshold === undefined) return 'default';
  if (totalStock <= 0 || totalStock <= threshold) return 'danger';
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

export function ConsumableProductRow({ product, isSelected, onSelect }: ConsumableProductRowProps) {
  const isArchived = product.status === 'archived';
  const stockColor = getStockChipColor(product.totalStock, product.reorderThreshold);
  const detailParts = [product.manufacturer, product.catalogNumber].filter(Boolean);
  const statusInfo = STATUS_CHIP[product.status];

  return (
    <div
      className={`rounded-lg px-3 py-1.5 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-card brightness-125 border-l-2 border-l-primary border-y border-r border-border shadow-sm'
          : isArchived
            ? 'bg-card border border-border opacity-50 hover:opacity-65'
            : 'bg-card border border-border hover:bg-accent/50'
      }`}
      onClick={() => onSelect(product.id)}
      onKeyDown={e => {
        if (e.key === 'Enter') onSelect(product.id);
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0 truncate">
          <Tooltip content={product.name} side="top">
            <span className="text-sm font-semibold text-card-foreground truncate">
              {product.name}
            </span>
          </Tooltip>
          {product.status !== 'active' && statusInfo && (
            <Chip
              color={statusInfo.color}
              size="sm"
              className="uppercase tracking-wide flex-shrink-0 ml-1"
            >
              {statusInfo.label}
            </Chip>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {product.locationNames.map(name => (
            <Chip key={name} color="info" size="sm" leftIcon={<MapPin />}>
              {name}
            </Chip>
          ))}
          <Chip color={stockColor} size="sm">
            {product.totalStock}{' '}
            {product.stockUnit ? pluralizeUnit(product.stockUnit, product.totalStock) : 'in stock'}
          </Chip>
        </div>
      </div>
      {detailParts.length > 0 && (
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">{detailParts.join(' · ')}</span>
        </div>
      )}
    </div>
  );
}
