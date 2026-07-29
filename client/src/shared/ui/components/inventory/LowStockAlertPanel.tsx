/**
 * Low Stock Alert Panel
 *
 * Items at or below their reorder point, shared by the inventory catalogs. The caller
 * supplies the already-filtered items and decides how a quantity reads in its own
 * units; the columns, counts, and reorder shortcut are the same everywhere.
 */

import { useMemo } from 'react';

import { Button } from '../../primitives';

import { AlertPanel, type AlertCount } from './AlertPanel';

import type { TableColumn } from '../../primitives/table/types';

export interface LowStockItem {
  id: string;
  name: string;
  totalStock: number;
  manufacturer?: string;
  catalogNumber?: string;
}

interface LowStockRow {
  id: string;
  name: string;
  manufacturer: string;
  catalogNumber: string;
  stock: string;
  totalStock: number;
}

interface LowStockAlertPanelProps<T extends LowStockItem> {
  /** Items already below threshold — the caller owns the predicate and the query. */
  items: T[];
  /** Column header for the item name, e.g. 'Item' or 'Reagent'. */
  itemHeader: string;
  /** Renders the on-hand quantity in the catalog's own units. */
  formatStock: (item: T) => string;
  onSelectItem: (id: string) => void;
  onViewReorderList: () => void;
  selectedItemId?: string;
}

function buildColumns(itemHeader: string): TableColumn<LowStockRow>[] {
  return [
    {
      id: 'name',
      header: itemHeader,
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
}

export function LowStockAlertPanel<T extends LowStockItem>({
  items,
  itemHeader,
  formatStock,
  onSelectItem,
  onViewReorderList,
  selectedItemId,
}: LowStockAlertPanelProps<T>) {
  const columns = useMemo(() => buildColumns(itemHeader), [itemHeader]);

  const rows: LowStockRow[] = useMemo(
    () =>
      items.map(item => ({
        id: item.id,
        name: item.name,
        manufacturer: item.manufacturer ?? '—',
        catalogNumber: item.catalogNumber ?? '—',
        stock: formatStock(item),
        totalStock: item.totalStock,
      })),
    [items, formatStock]
  );

  const outOfStockCount = rows.filter(row => row.totalStock <= 0).length;
  const counts: AlertCount[] = [
    { count: outOfStockCount, tone: 'danger', label: 'out of stock' },
    { count: rows.length - outOfStockCount, tone: 'warning', label: 'low' },
  ];

  return (
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
          <Button variant="secondary" size="sm" onClick={onViewReorderList}>
            View Full Reorder List
          </Button>
        </div>
      }
    />
  );
}
