/**
 * Equipment Maintenance Alert Panel
 *
 * Collapsible panel showing equipment with overdue or upcoming maintenance dates.
 */

import { useState, useMemo, useEffect } from 'react';

import { AlertTriangle, ChevronDown, ChevronRight, Wrench } from 'lucide-react';

import { Table } from '@shared/ui';
import { formatDateForDisplay, normalizeDateString } from '@shared/utils/dateFormatters';

import type { EquipmentItem } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui/primitives/table/types';

interface MaintenanceAlertRow {
  id: string;
  name: string;
  categoryName: string;
  dueDate: string;
  daysUntil: number;
}

interface EquipmentMaintenanceAlertPanelProps {
  items: EquipmentItem[];
  categoryNameMap: Map<string, string>;
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
}

export function EquipmentMaintenanceAlertPanel({
  items,
  categoryNameMap,
  selectedItemId,
  onSelectItem,
}: EquipmentMaintenanceAlertPanelProps) {
  const alertRows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows: MaintenanceAlertRow[] = [];

    items.forEach(item => {
      if (!item.nextMaintenanceDate || item.status === 'decommissioned') return;
      const dateStr = normalizeDateString(item.nextMaintenanceDate);
      if (!dateStr) return;
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const daysUntil = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 30) {
        rows.push({
          id: item.id,
          name: item.name,
          categoryName: categoryNameMap.get(item.categoryId) ?? '—',
          dueDate: dateStr,
          daysUntil,
        });
      }
    });

    rows.sort((a, b) => a.daysUntil - b.daysUntil);
    return rows;
  }, [items, categoryNameMap]);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    columnId: 'daysUntil',
    direction: 'asc',
  });

  const sortedRows = useMemo(() => {
    const sorted = [...alertRows];
    const { columnId, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      if (columnId === 'daysUntil') return (a.daysUntil - b.daysUntil) * multiplier;
      if (columnId === 'name') return a.name.localeCompare(b.name) * multiplier;
      if (columnId === 'categoryName')
        return a.categoryName.localeCompare(b.categoryName) * multiplier;
      if (columnId === 'dueDate') return a.dueDate.localeCompare(b.dueDate) * multiplier;
      return 0;
    });

    return sorted;
  }, [alertRows, sortConfig]);

  const overdueCount = alertRows.filter(r => r.daysUntil < 0).length;
  const totalAlerts = alertRows.length;
  const [isExpanded, setIsExpanded] = useState(totalAlerts > 0);
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false);

  useEffect(() => {
    if (totalAlerts > 0 && !manuallyCollapsed) {
      setIsExpanded(true);
    }
  }, [totalAlerts, manuallyCollapsed]);

  const columns: TableColumn<MaintenanceAlertRow>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        sortable: true,
        render: (_value, row) => <span className="font-medium">{row.name}</span>,
      },
      {
        id: 'categoryName',
        header: 'Category',
        sortable: true,
        render: (_value, row) => <span className="text-muted-foreground">{row.categoryName}</span>,
      },
      {
        id: 'dueDate',
        header: 'Due Date',
        sortable: true,
        render: (_value, row) => (
          <span
            className={`font-medium ${row.daysUntil < 0 ? 'text-danger-text' : 'text-warning-text'}`}
          >
            {formatDateForDisplay(row.dueDate)}
          </span>
        ),
      },
      {
        id: 'daysUntil',
        header: 'Status',
        sortable: true,
        render: (_value, row) => {
          if (row.daysUntil < 0) {
            return (
              <span className="inline-flex items-center gap-1 text-danger-text font-medium">
                <AlertTriangle size={12} />
                {Math.abs(row.daysUntil)} day{Math.abs(row.daysUntil) === 1 ? '' : 's'} overdue
              </span>
            );
          }
          return (
            <span className="text-warning-text font-medium">
              {row.daysUntil === 0
                ? 'Due today'
                : `${row.daysUntil} day${row.daysUntil === 1 ? '' : 's'}`}
            </span>
          );
        },
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
        <Wrench size={14} className="text-warning-text" />
        <span className="text-xs font-semibold text-warning-text">
          Maintenance Alerts ({totalAlerts})
        </span>
        {!isExpanded && overdueCount > 0 && (
          <span className="text-xs text-danger-text font-medium ml-auto">
            {overdueCount} overdue
          </span>
        )}
      </div>

      {isExpanded && (
        <Table
          columns={columns}
          data={sortedRows}
          size="sm"
          hoverable
          sortable
          sortConfig={sortConfig}
          onSort={setSortConfig}
          onRowClick={row => onSelectItem(row.id)}
          selectedRows={selectedItemId ? [selectedItemId] : []}
          rowClassName={row => (row.id === selectedItemId ? '!bg-accent' : '')}
          variant="borderless"
          density="compact"
          className="text-xs"
          aria-label="Maintenance alerts"
        />
      )}
    </div>
  );
}
