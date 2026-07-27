/**
 * Supply Low Stock Alert Panel
 *
 * Items at or below their reorder threshold, with a shortcut to the full reorder list.
 */

import { useState, useMemo } from 'react';

import { useSupplyReorderListQuery } from '@domains/supplies/hooks';
import { Button } from '@shared/ui';
import { AlertPanel, type AlertCount } from '@shared/ui/components/inventory';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import { SupplyReorderList } from './SupplyReorderList';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
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
    header: 'Item',
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

interface SupplyLowStockAlertPanelProps {
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
}

export function SupplyLowStockAlertPanel({
  selectedItemId,
  onSelectItem,
}: SupplyLowStockAlertPanelProps) {
  const { data: lowStockItems = [] } = useSupplyReorderListQuery();
  const [showReorderList, setShowReorderList] = useState(false);

  const rows: LowStockRow[] = useMemo(
    () =>
      lowStockItems.map((p: SupplyItemWithStock) => ({
        id: p.id,
        name: p.name,
        manufacturer: p.manufacturer ?? '—',
        catalogNumber: p.catalogNumber ?? '—',
        stock: `${p.totalStock} ${pluralizeUnit(p.stockUnit ?? 'unit', p.totalStock)}`,
        totalStock: p.totalStock,
      })),
    [lowStockItems]
  );

  const outOfStockCount = rows.filter(r => r.totalStock <= 0).length;
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

      <SupplyReorderList
        isOpen={showReorderList}
        onClose={() => setShowReorderList(false)}
        items={lowStockItems}
      />
    </>
  );
}
