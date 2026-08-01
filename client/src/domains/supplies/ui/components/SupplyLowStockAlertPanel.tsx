/**
 * Supply Low Stock Alert Panel
 *
 * Binds the shared low-stock panel to the supply list and its reorder modal.
 */

import { useState, useMemo } from 'react';

import { pluralizeUnit } from '@odysseus/shared-schemas';

import { useSupplyItemsQuery } from '@domains/supplies/hooks';
import { LowStockAlertPanel } from '@shared/ui/components/inventory';
import { isBelowReorderThreshold } from '@shared/utils/stockLevel';

import { SupplyReorderList } from './SupplyReorderList';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';

const formatStock = (item: SupplyItemWithStock) =>
  `${item.totalStock} ${pluralizeUnit(item.stockUnit ?? 'unit', item.totalStock)}`;

interface SupplyLowStockAlertPanelProps {
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
}

export function SupplyLowStockAlertPanel({
  selectedItemId,
  onSelectItem,
}: SupplyLowStockAlertPanelProps) {
  const { data: items = [] } = useSupplyItemsQuery();
  const [showReorderList, setShowReorderList] = useState(false);

  const lowStockItems = useMemo(() => items.filter(isBelowReorderThreshold), [items]);

  return (
    <>
      <LowStockAlertPanel
        items={lowStockItems}
        itemHeader="Item"
        formatStock={formatStock}
        selectedItemId={selectedItemId}
        onSelectItem={onSelectItem}
        onViewReorderList={() => setShowReorderList(true)}
      />

      <SupplyReorderList
        isOpen={showReorderList}
        onClose={() => setShowReorderList(false)}
        items={lowStockItems}
      />
    </>
  );
}
