/**
 * Supply Reorder List
 *
 * Full reorder list modal with sortable table and CSV export.
 */

import { useState, useCallback, useMemo } from 'react';

import { Download, ShoppingCart } from 'lucide-react';

import { httpClient } from '@infra/api';
import { Button, Table } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { downloadBlob } from '@shared/utils/downloadBlob';
import { formatCurrency } from '@shared/utils/formatCurrency';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui/primitives/table/types';

interface ReorderRow {
  id: string;
  name: string;
  manufacturer: string;
  catalogNumber: string;
  vendorName: string;
  stock: string;
  totalStock: number;
  reorder: string;
  price: string;
}

interface SupplyReorderListProps {
  isOpen: boolean;
  onClose: () => void;
  items: SupplyItemWithStock[];
}

export function SupplyReorderList({ isOpen, onClose, items }: SupplyReorderListProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    columnId: 'totalStock',
    direction: 'asc',
  });

  const rows: ReorderRow[] = useMemo(
    () =>
      items.map(p => {
        const unit = p.stockUnit ?? 'unit';
        const reorderUnit = p.reorderUnit ?? unit;
        return {
          id: p.id,
          name: p.name,
          manufacturer: p.manufacturer ?? '—',
          catalogNumber: p.catalogNumber ?? '—',
          vendorName: p.vendorName ?? '—',
          stock: `${p.totalStock} ${pluralizeUnit(unit, p.totalStock)}`,
          totalStock: p.totalStock,
          reorder: p.reorderQuantity
            ? `${p.reorderQuantity} ${pluralizeUnit(reorderUnit, p.reorderQuantity)}`
            : '—',
          price: formatCurrency(p.unitPrice) ?? '—',
        };
      }),
    [items]
  );

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    const { columnId, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      if (columnId === 'totalStock') return (a.totalStock - b.totalStock) * multiplier;
      if (columnId === 'name') return a.name.localeCompare(b.name) * multiplier;
      if (columnId === 'manufacturer')
        return a.manufacturer.localeCompare(b.manufacturer) * multiplier;
      if (columnId === 'catalogNumber')
        return a.catalogNumber.localeCompare(b.catalogNumber) * multiplier;
      if (columnId === 'vendorName') return a.vendorName.localeCompare(b.vendorName) * multiplier;
      return 0;
    });

    return sorted;
  }, [rows, sortConfig]);

  const columns: TableColumn<ReorderRow>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Item',
        sortable: true,
        render: (_value, row) => <span className="font-medium">{row.name}</span>,
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
        id: 'vendorName',
        header: 'Vendor',
        sortable: true,
        render: (_value, row) => <span className="text-muted-foreground">{row.vendorName}</span>,
      },
      {
        id: 'totalStock',
        header: 'Stock',
        sortable: true,
        align: 'left',
        render: (_value, row) => (
          <span
            className={`font-medium ${row.totalStock <= 0 ? 'text-danger-text' : 'text-warning-text'}`}
          >
            {row.stock}
          </span>
        ),
      },
      {
        id: 'reorder',
        header: 'Reorder Qty',
        align: 'left',
        render: (_value, row) => row.reorder,
      },
      {
        id: 'price',
        header: 'Price',
        align: 'left',
        render: (_value, row) => <span className="text-muted-foreground">{row.price}</span>,
      },
    ],
    []
  );

  const handleExportCsv = useCallback(async () => {
    try {
      const blob = await httpClient.getBlob('/admin/export/supply-reorder-list?format=csv');
      const date = new Date().toISOString().split('T')[0];
      downloadBlob(blob, `odysseus-supply-reorder-list-${date}.csv`);
    } catch {
      notifications.error('Failed to export reorder list');
    }
  }, []);

  return (
    <BaseModal
      isOpen={isOpen}
      title="Reorder List"
      icon={<ShoppingCart size={24} />}
      onClose={onClose}
      size="lg"
      fixedHeight
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? 's' : ''} below reorder threshold
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleExportCsv()}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <Table
            columns={columns}
            data={sortedRows}
            size="sm"
            hoverable
            sortable
            sortConfig={sortConfig}
            onSort={setSortConfig}
            variant="default"
            density="compact"
            className="text-xs"
            stickyHeader
            aria-label="Reorder list"
          />
        </div>
      </div>
    </BaseModal>
  );
}
