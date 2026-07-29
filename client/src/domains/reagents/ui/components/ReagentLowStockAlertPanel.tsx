/**
 * Reagent Low Stock Alert Panel
 *
 * Binds the shared low-stock panel to the reagent list and its reorder modal.
 */

import { useMemo, useState } from 'react';

import { formatQuantity } from '@odysseus/shared-schemas';

import { useReagentItemsQuery } from '@domains/reagents/hooks';
import { LowStockAlertPanel } from '@shared/ui/components/inventory';
import { isBelowReorderThreshold } from '@shared/utils/stockLevel';

import { ReagentReorderList } from './ReagentReorderList';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';

const formatStock = (item: ReagentItemWithStock) =>
  item.stockUnit ? formatQuantity(item.totalStock, item.stockUnit) : String(item.totalStock);

interface ReagentLowStockAlertPanelProps {
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
}

export function ReagentLowStockAlertPanel({
  selectedItemId,
  onSelectItem,
}: ReagentLowStockAlertPanelProps) {
  const { data: items = [] } = useReagentItemsQuery();
  const [showReorderList, setShowReorderList] = useState(false);

  const lowStockItems = useMemo(() => items.filter(isBelowReorderThreshold), [items]);

  return (
    <>
      <LowStockAlertPanel
        items={lowStockItems}
        itemHeader="Reagent"
        formatStock={formatStock}
        selectedItemId={selectedItemId}
        onSelectItem={onSelectItem}
        onViewReorderList={() => setShowReorderList(true)}
      />

      <ReagentReorderList
        isOpen={showReorderList}
        onClose={() => setShowReorderList(false)}
        items={lowStockItems}
      />
    </>
  );
}
