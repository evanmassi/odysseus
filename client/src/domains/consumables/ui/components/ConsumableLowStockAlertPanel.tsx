/**
 * Consumable Low Stock Alert Panel
 *
 * Collapsible panel showing products below their reorder threshold.
 * Matches EquipmentMaintenanceAlertPanel structure.
 */

import { useState } from 'react';

import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

import { useConsumableReorderListQuery } from '@domains/consumables/hooks';
import { Button } from '@shared/ui';

import { ConsumableReorderList } from './ConsumableReorderList';

import type { ConsumableProductWithStock } from '@odysseus/shared-schemas';

interface ConsumableLowStockAlertPanelProps {
  onSelectProduct: (id: string) => void;
}

export function ConsumableLowStockAlertPanel({ onSelectProduct }: ConsumableLowStockAlertPanelProps) {
  const { data: lowStockProducts = [] } = useConsumableReorderListQuery();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReorderList, setShowReorderList] = useState(false);

  if (lowStockProducts.length === 0) return null;

  return (
    <>
      <div className="mb-2 rounded-lg border border-warning-border bg-warning-bg/10 overflow-hidden flex-shrink-0">
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-warning-bg/20 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <AlertTriangle size={16} className="text-warning-text flex-shrink-0" />
          <span className="text-sm font-medium text-warning-text">
            {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} low on stock
          </span>
        </button>

        {isExpanded && (
          <div className="px-3 pb-3">
            <div className="space-y-1 mb-2">
              {lowStockProducts.slice(0, 10).map((product: ConsumableProductWithStock) => (
                <button
                  key={product.id}
                  type="button"
                  className="w-full flex items-center justify-between text-left px-2 py-1 rounded hover:bg-accent/50 transition-colors"
                  onClick={() => onSelectProduct(product.id)}
                >
                  <span className="text-xs text-card-foreground truncate">{product.name}</span>
                  <span className={`text-xs font-medium flex-shrink-0 ml-2 ${
                    product.totalStock <= 0 ? 'text-danger-text' : 'text-warning-text'
                  }`}>
                    {product.totalStock} / {product.reorderThreshold}
                  </span>
                </button>
              ))}
              {lowStockProducts.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{lowStockProducts.length - 10} more
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowReorderList(true)}
              className="w-full"
            >
              View Full Reorder List
            </Button>
          </div>
        )}
      </div>

      <ConsumableReorderList
        isOpen={showReorderList}
        onClose={() => setShowReorderList(false)}
        products={lowStockProducts}
      />
    </>
  );
}
