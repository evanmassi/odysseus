/**
 * Consumable Product Row
 *
 * Single-line row for a consumable product with stock level indicator,
 * category info, and key identifying details.
 */

import { Chip } from '@shared/ui/primitives/chip/Chip';

import type { ConsumableProductWithStock } from '@odysseus/shared-schemas';

interface ConsumableProductRowProps {
  product: ConsumableProductWithStock;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getStockIndicator(totalStock: number, threshold: number | undefined) {
  if (threshold === undefined) return undefined;
  if (totalStock <= 0) return { color: 'text-danger-text', bg: 'bg-danger-bg/20' } as const;
  if (totalStock <= threshold) return { color: 'text-danger-text', bg: 'bg-danger-bg/20' } as const;
  if (totalStock <= threshold * 2)
    return { color: 'text-warning-text', bg: 'bg-warning-bg/20' } as const;
  return { color: 'text-success-text', bg: 'bg-success-bg/20' } as const;
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
  const stockIndicator = getStockIndicator(product.totalStock, product.reorderThreshold);
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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
          <span className="text-sm font-semibold text-card-foreground truncate">
            {product.name}
          </span>
          {detailParts.length > 0 && (
            <>
              <span className="text-card-foreground/30 flex-shrink-0">·</span>
              <span className="text-xs text-muted-foreground truncate">
                {detailParts.join(' · ')}
              </span>
            </>
          )}
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
          {product.stockUnit && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                stockIndicator
                  ? `${stockIndicator.color} ${stockIndicator.bg}`
                  : 'text-muted-foreground bg-muted'
              }`}
            >
              {product.totalStock} {product.stockUnit}
              {product.totalStock !== 1 ? 's' : ''}
            </span>
          )}
          {!product.stockUnit && (
            <span className="text-xs text-muted-foreground">{product.totalStock} in stock</span>
          )}
        </div>
      </div>
    </div>
  );
}
