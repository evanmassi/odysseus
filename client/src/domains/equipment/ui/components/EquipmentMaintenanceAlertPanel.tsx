/**
 * Equipment Maintenance Alert Panel
 *
 * Collapsible panel showing equipment with overdue or upcoming maintenance dates.
 */

import { useState, useMemo, useEffect } from 'react';

import { ChevronRight } from 'lucide-react';

import { NubDivider, Table } from '@shared/ui';
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
        render: (_value, row) => <span className="font-display font-medium">{row.name}</span>,
      },
      {
        id: 'categoryName',
        header: 'Category',
        sortable: true,
        render: (_value, row) => (
          <span className="font-mono tracking-[0.02em] text-muted-foreground">
            {row.categoryName}
          </span>
        ),
      },
      {
        id: 'dueDate',
        header: 'Due Date',
        sortable: true,
        render: (_value, row) => (
          <span
            className={`font-mono tracking-[0.04em] ${row.daysUntil < 0 ? 'text-danger-text' : 'text-warning-text'}`}
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
          const days = Math.abs(row.daysUntil);
          const label =
            row.daysUntil < 0
              ? `${days} day${days === 1 ? '' : 's'} overdue`
              : row.daysUntil === 0
                ? 'Due today'
                : `${row.daysUntil} day${row.daysUntil === 1 ? '' : 's'}`;
          return (
            <span
              className={`font-mono tracking-[0.04em] ${row.daysUntil < 0 ? 'text-danger-text' : 'text-warning-text'}`}
            >
              {label}
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

  const dueSoonCount = totalAlerts - overdueCount;
  const hasOverdue = overdueCount > 0;
  const stripeClass = hasOverdue
    ? 'bg-danger-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-danger-bg)/0.6)]'
    : 'bg-warning-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-warning-bg)/0.6)]';
  const labelClass = hasOverdue ? 'text-danger-text' : 'text-warning-text';

  return (
    <div className="mb-2 flex-shrink-0 overflow-hidden border border-line-faint">
      <div
        className="relative flex items-center gap-2 bg-[hsl(var(--primary)/0.07)] dark:bg-shade/35 px-3 py-2 cursor-pointer transition-[background-color,filter] hover:brightness-[0.97] dark:hover:brightness-100 dark:hover:bg-shade/45"
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
          Maintenance Alerts
        </span>
        <span className="font-mono text-[10px] tracking-[0.04em] text-foreground/55">
          {totalAlerts}
        </span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[10px] tracking-[0.04em]">
          {overdueCount > 0 && <span className="text-danger-text">{overdueCount} overdue</span>}
          {overdueCount > 0 && dueSoonCount > 0 && <span className="text-foreground/25">·</span>}
          {dueSoonCount > 0 && <span className="text-warning-text">{dueSoonCount} due soon</span>}
        </span>
        <NubDivider
          tone={hasOverdue ? 'danger' : 'warning'}
          className="absolute inset-x-0 -bottom-px"
        />
      </div>

      {isExpanded && (
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
          rowState={row => (row.daysUntil < 0 ? 'danger' : 'warning')}
          density="compact"
          className="text-xs"
          aria-label="Maintenance alerts"
        />
      )}
    </div>
  );
}
