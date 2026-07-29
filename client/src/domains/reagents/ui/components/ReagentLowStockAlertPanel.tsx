/**
 * Reagent Low Stock Alert Panel
 *
 * Reagents at or below their reorder point, with a shortcut to the full reorder list.
 */

import { useMemo, useState } from 'react';

import { formatQuantity } from '@odysseus/shared-schemas';

import { useReagentItemsQuery } from '@domains/reagents/hooks';
import { Button } from '@shared/ui';
import { AlertPanel, type AlertCount } from '@shared/ui/components/inventory';
import { isBelowReorderThreshold } from '@shared/utils/stockLevel';

import { ReagentReorderList } from './ReagentReorderList';

import type { TableColumn } from '@shared/ui/primitives/table/types';

interface LowStockRow {
  id: string;
  name: string;
  manufacturer: string;
  catalogNumber: string;
  stock: string;
  totalStock: number;
}

const columns: TableColumn<LowStockRow>[] = [
  {
    id: 'name',
    header: 'Reagent',
    sortable: true,
    render: (_value, row) => <span className="font-display font-medium">{row.name}</span>,
  },
  {
    id: 'manufacturer',
    header: 'Manufacturer',
    sortable: true,
    render: (_value, row) => <span className="text-muted-foreground">{row.manufacturer}</span>,
  },
  {
    id: 'catalogNumber',
    header: 'Cat #',
    sortable: true,
    render: (_value, row) => <span className="text-muted-foreground">{row.catalogNumber}</span>,
  },
  {
    id: 'totalStock',
    header: 'Stock',
    sortable: true,
    render: (_value, row) => (
      <span
        className={`font-medium ${row.totalStock <= 0 ? 'text-danger-text' : 'text-warning-text'}`}
      >
        {row.stock}
      </span>
    ),
  },
];

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

  const rows: LowStockRow[] = useMemo(
    () =>
      lowStockItems.map(item => ({
        id: item.id,
        name: item.name,
        manufacturer: item.manufacturer ?? '—',
        catalogNumber: item.catalogNumber ?? '—',
        stock: item.stockUnit
          ? formatQuantity(item.totalStock, item.stockUnit)
          : String(item.totalStock),
        totalStock: item.totalStock,
      })),
    [lowStockItems]
  );

  const outOfStockCount = rows.filter(row => row.totalStock <= 0).length;
  const counts: AlertCount[] = [
    { count: outOfStockCount, tone: 'danger', label: 'out of stock' },
    { count: rows.length - outOfStockCount, tone: 'warning', label: 'low' },
  ];

  return (
    <>
      <AlertPanel
        label="Low Stock Alerts"
        counts={counts}
        columns={columns}
        rows={rows}
        defaultSort={{ columnId: 'totalStock', direction: 'asc' }}
        rowTone={row => (row.totalStock <= 0 ? 'danger' : 'warning')}
        selectedItemId={selectedItemId}
        onSelectItem={onSelectItem}
        ariaLabel="Low stock alerts"
        footer={
          <div className="flex justify-center px-3 py-3">
            <Button variant="secondary" size="sm" onClick={() => setShowReorderList(true)}>
              View Full Reorder List
            </Button>
          </div>
        }
      />

      <ReagentReorderList
        isOpen={showReorderList}
        onClose={() => setShowReorderList(false)}
        items={lowStockItems}
      />
    </>
  );
}
