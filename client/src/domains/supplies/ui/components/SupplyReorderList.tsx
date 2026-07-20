/**
 * Supply Reorder List
 *
 * Full reorder list modal with sortable table and CSV export.
 */

import { useState, useCallback, useMemo } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { Download, ShoppingCart } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { httpClient } from '@infra/api';
import { AccentTick, Button, Table } from '@shared/ui';
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
  vendorCatalogNumber: string;
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
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

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
          vendorCatalogNumber: p.vendorCatalogNumber ?? '—',
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
        render: (_value, row) => <span className="font-display font-medium">{row.name}</span>,
      },
      {
        id: 'manufacturer',
        header: 'Manufacturer',
        sortable: true,
        render: (_value, row) => (
          <div className="flex flex-col leading-tight">
            <span className="text-muted-foreground">{row.manufacturer}</span>
            {row.catalogNumber !== '—' && (
              <span className="font-mono text-data-sm tracking-[0.02em] text-foreground/45">
                {row.catalogNumber}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'vendorName',
        header: 'Vendor',
        sortable: true,
        render: (_value, row) => (
          <div className="flex flex-col leading-tight">
            <span className="text-muted-foreground">{row.vendorName}</span>
            {row.vendorCatalogNumber !== '—' && (
              <span className="font-mono text-data-sm tracking-[0.02em] text-foreground/45">
                {row.vendorCatalogNumber}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'totalStock',
        header: 'Current Stock',
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
      locator={
        <div className="flex items-center gap-2.5">
          <AccentTick />
          <span className="font-mono text-data-sm tracking-[0.04em] text-foreground">
            {items.length} <span className="text-foreground/45">below reorder</span>
          </span>
        </div>
      }
    >
      <Table
        columns={columns}
        data={sortedRows}
        hoverable
        sortable
        sortConfig={sortConfig}
        onSort={setSortConfig}
        density="compact"
        className="text-data"
        toolbar={{
          right: isAdmin ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleExportCsv()}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Export CSV
            </Button>
          ) : undefined,
        }}
        aria-label="Reorder list"
      />
    </BaseModal>
  );
}
