import { useMemo } from 'react';

import { pluralizeUnit } from '@odysseus/shared-schemas';

import { resolveMaintenanceDue } from '@domains/equipment/utils/maintenanceSchedule';
import { buildLocationPathMap, useLabLocationsQuery } from '@domains/lab-management';
import { TruncatedText } from '@shared/ui';
import {
  ALERT_TONE_TEXT,
  AlertPanel,
  type AlertCount,
  type AlertTone,
} from '@shared/ui/components/inventory';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import type { EquipmentItem } from '@odysseus/shared-schemas';
import type { TableColumn } from '@shared/ui/primitives/table/types';

const ALERT_WINDOW_DAYS = 30;

const SUBTEXT = 'mt-0.5 block font-mono text-data-sm tracking-[0.03em] text-muted-foreground';

interface MaintenanceAlertRow {
  id: string;
  name: string;
  identity: string;
  location: string;
  dueDate: string;
  daysUntil: number;
  tone: AlertTone;
}

function describeDue(daysUntil: number): string {
  if (daysUntil === 0) return 'Due today';
  const days = Math.abs(daysUntil);
  const span = `${days} ${pluralizeUnit('day', days)}`;
  return daysUntil < 0 ? `Overdue ${span}` : `In ${span}`;
}

const columns: TableColumn<MaintenanceAlertRow>[] = [
  {
    id: 'name',
    header: 'Equipment',
    width: '50%',
    truncates: true,
    sortable: true,
    render: (_value, row) => (
      <div className="min-w-0">
        <TruncatedText text={row.name} className="block font-display font-medium" />
        {row.identity && <TruncatedText text={row.identity} className={SUBTEXT} />}
      </div>
    ),
  },
  {
    id: 'location',
    header: 'Location',
    width: '50%',
    truncates: true,
    sortable: true,
    render: (_value, row) => (
      <TruncatedText text={row.location} className="block text-muted-foreground" />
    ),
  },
  {
    id: 'daysUntil',
    header: 'Due',
    width: '1%',
    sortable: true,
    render: (_value, row) => (
      <div className="whitespace-nowrap">
        <span className="block font-mono tracking-[0.04em] text-muted-foreground">
          {formatDateForDisplay(row.dueDate)}
        </span>
        <span className={`mt-0.5 block text-data-sm ${ALERT_TONE_TEXT[row.tone]}`}>
          {describeDue(row.daysUntil)}
        </span>
      </div>
    ),
  },
];

interface EquipmentMaintenanceAlertPanelProps {
  items: EquipmentItem[];
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
}

export function EquipmentMaintenanceAlertPanel({
  items,
  selectedItemId,
  onSelectItem,
}: EquipmentMaintenanceAlertPanelProps) {
  const { data: locations = [] } = useLabLocationsQuery();
  const locationPathMap = useMemo(() => buildLocationPathMap(locations), [locations]);

  const rows: MaintenanceAlertRow[] = useMemo(
    () =>
      items.flatMap(item => {
        if (item.status === 'decommissioned' || !item.nextMaintenanceDate) return [];
        const due = resolveMaintenanceDue(item.nextMaintenanceDate);
        if (!due || due.daysUntil > ALERT_WINDOW_DAYS) return [];

        return [
          {
            id: item.id,
            name: item.name,
            identity: [item.assetTag, item.model].filter(Boolean).join(' · '),
            location: item.locationId ? (locationPathMap.get(item.locationId) ?? '—') : '—',
            dueDate: due.dateStr,
            daysUntil: due.daysUntil,
            tone: due.daysUntil < 0 ? 'danger' : 'warning',
          },
        ];
      }),
    [items, locationPathMap]
  );

  const overdueCount = rows.filter(row => row.tone === 'danger').length;
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
      rowTone={row => row.tone}
      selectedItemId={selectedItemId}
      onSelectItem={onSelectItem}
      ariaLabel="Maintenance alerts"
    />
  );
}
