import { useMemo } from 'react';

import { useReagentItemsQuery } from '@domains/reagents/hooks';
import { resolveExpiryBadge } from '@domains/reagents/utils/reagentExpiry';
import { AlertPanel, type AlertCount, type AlertTone } from '@shared/ui/components/inventory';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { daysUntil } from '@shared/utils/dateExpiry';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import type { TableColumn } from '@shared/ui/primitives/table/types';

interface ExpiryRow {
  id: string;
  name: string;
  manufacturer: string;
  status: string;
  tone: AlertTone;
  expires: string;
  daysRemaining: number;
}

const columns: TableColumn<ExpiryRow>[] = [
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
    render: (_value, row) => <span className="text-muted-foreground">{row.manufacturer}</span>,
  },
  {
    id: 'expires',
    header: 'Soonest Expiry',
    sortable: true,
    render: (_value, row) => (
      <span className="font-mono tracking-[0.04em] text-muted-foreground">{row.expires}</span>
    ),
  },
  {
    id: 'daysRemaining',
    header: 'Status',
    sortable: true,
    render: (_value, row) => (
      <Chip color={row.tone} size="xs">
        {row.status}
      </Chip>
    ),
  },
];

interface ReagentExpiryAlertPanelProps {
  selectedItemId?: string;
  onSelectItem: (id: string) => void;
}

export function ReagentExpiryAlertPanel({
  selectedItemId,
  onSelectItem,
}: ReagentExpiryAlertPanelProps) {
  const { data: items = [] } = useReagentItemsQuery();

  const rows: ExpiryRow[] = useMemo(
    () =>
      items
        .filter(item => item.status !== 'archived')
        .flatMap(item => {
          const badge = resolveExpiryBadge(item);
          if (!badge) return [];
          return [
            {
              id: item.id,
              name: item.name,
              manufacturer: item.manufacturer ?? '—',
              status: badge.detail,
              tone: badge.tone,
              expires: item.soonestExpiration ? formatDateForDisplay(item.soonestExpiration) : '—',
              daysRemaining: item.soonestExpiration ? (daysUntil(item.soonestExpiration) ?? 0) : 0,
            },
          ];
        }),
    [items]
  );

  const expiredCount = rows.filter(row => row.tone === 'danger').length;
  const counts: AlertCount[] = [
    { count: expiredCount, tone: 'danger', label: 'holding expired stock' },
    { count: rows.length - expiredCount, tone: 'warning', label: 'expiring soon' },
  ];

  return (
    <AlertPanel
      label="Expiry Alerts"
      counts={counts}
      columns={columns}
      rows={rows}
      defaultSort={{ columnId: 'daysRemaining', direction: 'asc' }}
      rowTone={row => row.tone}
      selectedItemId={selectedItemId}
      onSelectItem={onSelectItem}
      ariaLabel="Expiry alerts"
    />
  );
}
