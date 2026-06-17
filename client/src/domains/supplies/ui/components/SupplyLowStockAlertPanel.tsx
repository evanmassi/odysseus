/**
 * Supply Low Stock Alert Panel
 *
 * Collapsible panel showing items below their reorder threshold
 * with a sortable table matching the equipment maintenance alert pattern.
 */

import { useState, useMemo, useEffect } from 'react';

import { ChevronRight } from 'lucide-react';

import { useSupplyReorderListQuery } from '@domains/supplies/hooks';
import { Button, NubDivider, Table } from '@shared/ui';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import { SupplyReorderList } from './SupplyReorderList';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui/primitives/table/types';

interface LowStockRow {
  id: string;
  name: string;
  manufacturer: string;
  catalogNumber: string;
  stock: string;
  totalStock: number;
  threshold: number;
}

interface SupplyLowStockAlertPanelProps {
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
}

export function SupplyLowStockAlertPanel({
  selectedItemId,
  onSelectItem,
}: SupplyLowStockAlertPanelProps) {
  const { data: lowStockItems = [] } = useSupplyReorderListQuery();
  const [isExpanded, setIsExpanded] = useState(false);
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false);
  const [showReorderList, setShowReorderList] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    columnId: 'totalStock',
    direction: 'asc',
  });

  const totalAlerts = lowStockItems.length;
  const outOfStockCount = lowStockItems.filter(p => p.totalStock <= 0).length;

  useEffect(() => {
    if (totalAlerts > 0 && !manuallyCollapsed) {
      setIsExpanded(true);
    }
  }, [totalAlerts, manuallyCollapsed]);

  const rows: LowStockRow[] = useMemo(
    () =>
      lowStockItems.map((p: SupplyItemWithStock) => ({
        id: p.id,
        name: p.name,
        manufacturer: p.manufacturer ?? '—',
        catalogNumber: p.catalogNumber ?? '—',
        stock: `${p.totalStock} ${pluralizeUnit(p.stockUnit ?? 'unit', p.totalStock)}`,
        totalStock: p.totalStock,
        threshold: p.reorderThreshold ?? 0,
      })),
    [lowStockItems]
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
      return 0;
    });

    return sorted;
  }, [rows, sortConfig]);

  const columns: TableColumn<LowStockRow>[] = useMemo(
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
    ],
    []
  );

  if (totalAlerts === 0) return null;

  const toggleExpanded = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    setManuallyCollapsed(!next);
  };

  const lowCount = totalAlerts - outOfStockCount;
  const hasOutOfStock = outOfStockCount > 0;
  const stripeClass = hasOutOfStock
    ? 'bg-danger-bg shadow-[0_0_6px_-1px_hsl(var(--color-danger-bg)/0.6)]'
    : 'bg-warning-bg shadow-[0_0_6px_-1px_hsl(var(--color-warning-bg)/0.6)]';
  const labelClass = hasOutOfStock ? 'text-danger-text' : 'text-warning-text';

  return (
    <>
      <div className="mb-2 flex-shrink-0 overflow-hidden border border-line-faint">
        <div
          className="relative flex items-center gap-2 bg-shade/35 px-3 py-2 cursor-pointer transition-colors hover:bg-shade/45"
          onClick={toggleExpanded}
          onKeyDown={e => {
            if (e.key === 'Enter') toggleExpanded();
          }}
          role="button"
          tabIndex={0}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/[0.05]"
          />
          <ChevronRight
            size={11}
            className={`flex-shrink-0 text-foreground/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
          <span aria-hidden className={`h-[11px] w-0.5 flex-shrink-0 ${stripeClass}`} />
          <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${labelClass}`}>
            Low Stock Alerts
          </span>
          <span className="font-mono text-[10px] tracking-[0.04em] text-foreground/55">
            {totalAlerts}
          </span>
          <span className="ml-auto flex items-center gap-2 font-mono text-[10px] tracking-[0.04em]">
            {outOfStockCount > 0 && (
              <span className="text-danger-text">{outOfStockCount} out of stock</span>
            )}
            {outOfStockCount > 0 && lowCount > 0 && <span className="text-foreground/25">·</span>}
            {lowCount > 0 && <span className="text-warning-text">{lowCount} low</span>}
          </span>
          <NubDivider
            tone={hasOutOfStock ? 'danger' : 'warning'}
            className="absolute inset-x-0 -bottom-px"
          />
        </div>

        {isExpanded && (
          <>
            <Table
              chassis={false}
              columns={columns}
              data={sortedRows}
              hoverable
              sortable
              sortConfig={sortConfig}
              onSort={setSortConfig}
              onRowClick={row => onSelectItem(row.id)}
              selectedRows={selectedItemId ? [selectedItemId] : []}
              selectedRowGlow
              rowState={row => (row.totalStock <= 0 ? 'danger' : 'warning')}
              density="compact"
              className="text-xs"
              aria-label="Low stock alerts"
            />
            <div className="flex justify-center px-3 py-3">
              <Button variant="secondary" size="sm" onClick={() => setShowReorderList(true)}>
                View Full Reorder List
              </Button>
            </div>
          </>
        )}
      </div>

      <SupplyReorderList
        isOpen={showReorderList}
        onClose={() => setShowReorderList(false)}
        items={lowStockItems}
      />
    </>
  );
}
