/**
 * Equipment Maintenance Alert Panel
 *
 * Equipment with maintenance overdue or falling due inside the alert window.
 */

import { useMemo } from 'react';

import { resolveMaintenanceDue } from '@domains/equipment/utils/maintenanceSchedule';
import { AlertPanel, type AlertCount } from '@shared/ui/components/inventory';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import type { EquipmentItem } from '@odysseus/shared-schemas';
import type { TableColumn } from '@shared/ui/primitives/table/types';

const ALERT_WINDOW_DAYS = 30;

interface MaintenanceAlertRow {
  id: string;
  name: string;
  categoryName: string;
  dueDate: string;
  daysUntil: number;
}

const columns: TableColumn<MaintenanceAlertRow>[] = [
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
      <span className="font-mono tracking-[0.02em] text-muted-foreground">{row.categoryName}</span>
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
];

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
  const rows = useMemo(() => {
    const alertRows: MaintenanceAlertRow[] = [];

    items.forEach(item => {
      if (item.status === 'decommissioned' || !item.nextMaintenanceDate) return;
      const due = resolveMaintenanceDue(item.nextMaintenanceDate);
      if (!due || due.daysUntil > ALERT_WINDOW_DAYS) return;

      alertRows.push({
        id: item.id,
        name: item.name,
        categoryName: categoryNameMap.get(item.categoryId) ?? '—',
        dueDate: due.dateStr,
        daysUntil: due.daysUntil,
      });
    });

    return alertRows;
  }, [items, categoryNameMap]);

  const overdueCount = rows.filter(r => r.daysUntil < 0).length;
  const counts: AlertCount[] = [
    { count: overdueCount, tone: 'danger', label: 'overdue' },
    { count: rows.length - overdueCount, tone: 'warning', label: 'due soon' },
  ];

  return (
    <AlertPanel
      label="Maintenance Alerts"
      counts={counts}
      columns={columns}
      rows={rows}
      defaultSort={{ columnId: 'daysUntil', direction: 'asc' }}
      rowTone={row => (row.daysUntil < 0 ? 'danger' : 'warning')}
      selectedItemId={selectedItemId}
      onSelectItem={onSelectItem}
      ariaLabel="Maintenance alerts"
    />
  );
}
