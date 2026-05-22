/**
 * Supply Low Stock Alert Panel
 *
 * Collapsible panel showing items below their reorder threshold
 * with a sortable table matching the equipment maintenance alert pattern.
 */

import { useState, useMemo, useEffect } from 'react';

import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

import { useSupplyReorderListQuery } from '@domains/supplies/hooks';
import { Button, Table } from '@shared/ui';
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
  onSelectItem: (id: string) => void;
}

export function SupplyLowStockAlertPanel({ onSelectItem }: SupplyLowStockAlertPanelProps) {
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

  return (
    <>
      <div className="rounded-lg border border-border mb-2 flex-shrink-0 overflow-hidden">
        <div
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={toggleExpanded}
          onKeyDown={e => {
            if (e.key === 'Enter') toggleExpanded();
          }}
          role="button"
          tabIndex={0}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <AlertTriangle size={14} className="text-warning-text" />
          <span className="text-xs font-semibold text-warning-text">
            Low Stock Alerts ({totalAlerts})
          </span>
          {!isExpanded && outOfStockCount > 0 && (
            <span className="text-xs text-danger-text font-medium ml-auto">
              {outOfStockCount} out of stock
            </span>
          )}
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
