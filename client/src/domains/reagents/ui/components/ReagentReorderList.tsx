/**
 * Reagent Reorder List
 *
 * Full reorder list modal with a sortable table and CSV export. The rows are already
 * loaded by the tab, so the export is built here rather than fetched again.
 */

import { useCallback, useMemo, useState } from 'react';

import { formatQuantity, pluralizeUnit } from '@odysseus/shared-schemas';
import { Download, ShoppingCart } from 'lucide-react';

import { AccentTick, Button, Table } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { escapeCsvValue } from '@shared/utils/csv';
import { downloadBlob } from '@shared/utils/downloadBlob';
import { formatCurrency } from '@shared/utils/formatCurrency';

import type { ReagentItemWithStock } from '@odysseus/shared-schemas';
import type { SortConfig, TableColumn } from '@shared/ui/primitives/table/types';

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

const CSV_HEADERS = [
  'Reagent',
  'Manufacturer',
  'Catalog #',
  'Vendor',
  'Vendor Catalog #',
  'Current Stock',
  'Reorder Qty',
  'Unit Price',
];

interface ReagentReorderListProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReagentItemWithStock[];
}

export function ReagentReorderList({ isOpen, onClose, items }: ReagentReorderListProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    columnId: 'totalStock',
    direction: 'asc',
  });

  const rows: ReorderRow[] = useMemo(
    () =>
      items.map(item => {
        const reorderUnit = item.reorderUnit ?? item.stockUnit;
        return {
          id: item.id,
          name: item.name,
          manufacturer: item.manufacturer ?? '—',
          catalogNumber: item.catalogNumber ?? '—',
          vendorName: item.vendorName ?? '—',
          vendorCatalogNumber: item.vendorCatalogNumber ?? '—',
          stock: item.stockUnit
            ? formatQuantity(item.totalStock, item.stockUnit)
            : String(item.totalStock),
          totalStock: item.totalStock,
          reorder:
            item.reorderQuantity !== undefined
              ? `${item.reorderQuantity} ${reorderUnit ? pluralizeUnit(reorderUnit, item.reorderQuantity) : ''}`.trim()
              : '—',
          price: formatCurrency(item.unitPrice) ?? '—',
        };
      }),
    [items]
  );

  const sortedRows = useMemo(() => {
    const { columnId, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const [left, right] = [a[columnId as keyof ReorderRow], b[columnId as keyof ReorderRow]];
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * multiplier;
      return String(left).localeCompare(String(right)) * multiplier;
    });
  }, [rows, sortConfig]);

  const columns: TableColumn<ReorderRow>[] = useMemo(
    () => [
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
        sortable: true,
        render: (_value, row) => <span className="text-card-foreground">{row.reorder}</span>,
      },
      {
        id: 'price',
        header: 'Unit Price',
        sortable: true,
        render: (_value, row) => <span className="text-muted-foreground">{row.price}</span>,
      },
    ],
    []
  );

  const handleExportCsv = useCallback(() => {
    const content = [
      CSV_HEADERS,
      ...sortedRows.map(row => [
        row.name,
        row.manufacturer,
        row.catalogNumber,
        row.vendorName,
        row.vendorCatalogNumber,
        row.stock,
        row.reorder,
        row.price,
      ]),
    ]
      .map(values => values.map(escapeCsvValue).join(','))
      .join('\n');

    const date = new Date().toISOString().split('T')[0];
    downloadBlob(new Blob([content], { type: 'text/csv' }), `odysseus-reagent-reorder-${date}.csv`);
  }, [sortedRows]);

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
            {rows.length}{' '}
            <span className="text-foreground/45">
              {rows.length === 1 ? 'reagent' : 'reagents'} to reorder
            </span>
          </span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="h-3.5 w-3.5" />}
            onClick={handleExportCsv}
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
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
        aria-label="Reagent reorder list"
      />
    </BaseModal>
  );
}
