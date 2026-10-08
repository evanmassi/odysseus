import { useMemo } from 'react';

import { buildLocationPathMap, useLabLocationsQuery } from '@domains/lab-management';
import { useReagentItemsQuery } from '@domains/reagents/hooks';
import { resolveLotExpiry } from '@domains/reagents/utils/reagentExpiry';
import { TruncatedText } from '@shared/ui';
import {
  ALERT_TONE_TEXT,
  AlertPanel,
  type AlertCount,
  type AlertTone,
} from '@shared/ui/components/inventory';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import type { TableColumn } from '@shared/ui/primitives/table/types';

interface ExpiryRow {
  id: string;
  itemId: string;
  name: string;
  identity: string;
  lotNumber: string;
  location: string;
  expirationDate: string;
  status: string;
  tone: AlertTone;
  daysRemaining: number;
}

const SUBTEXT = 'mt-0.5 block font-mono text-data-sm tracking-[0.03em] text-muted-foreground';

const columns: TableColumn<ExpiryRow>[] = [
  {
    id: 'name',
    header: 'Reagent',
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
    id: 'lotNumber',
    header: 'Lot',
    width: '50%',
    truncates: true,
    sortable: true,
    render: (_value, row) => (
      <div className="min-w-0">
        <TruncatedText text={row.lotNumber} className="block font-mono tracking-[0.04em]" />
        <TruncatedText text={row.location} className={SUBTEXT} />
      </div>
    ),
  },
  {
    id: 'daysRemaining',
    header: 'Expires',
    width: '1%',
    sortable: true,
    render: (_value, row) => (
      <div className="whitespace-nowrap">
        <span className="block font-mono tracking-[0.04em] text-muted-foreground">
          {formatDateForDisplay(row.expirationDate)}
        </span>
        <span className={`mt-0.5 block text-data-sm ${ALERT_TONE_TEXT[row.tone]}`}>
          {row.status}
        </span>
      </div>
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
  const { data: locations = [] } = useLabLocationsQuery();
  const locationPathMap = useMemo(() => buildLocationPathMap(locations), [locations]);

  const rows: ExpiryRow[] = useMemo(
    () =>
      items
        .filter(item => item.status !== 'archived')
        .flatMap(item =>
          item.lotExpirations.flatMap(lot => {
            const expiry = resolveLotExpiry(lot.expirationDate, item.expiryWarningDays);
            if (!expiry) return [];
            return [
              {
                id: lot.id,
                itemId: item.id,
                name: item.name,
                identity: [item.manufacturer, item.catalogNumber].filter(Boolean).join(' · '),
                lotNumber: lot.lotNumber ?? 'No lot #',
                location: locationPathMap.get(lot.locationId) ?? '—',
                expirationDate: lot.expirationDate,
                status: expiry.detail,
                tone: expiry.tone,
                daysRemaining: expiry.days,
              },
            ];
          })
        ),
    [items, locationPathMap]
  );

  const expiredCount = rows.filter(row => row.tone === 'danger').length;
  const counts: AlertCount[] = [
    { count: expiredCount, tone: 'danger', label: 'expired' },
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
      getItemId={row => row.itemId}
      ariaLabel="Expiry alerts"
    />
  );
}
