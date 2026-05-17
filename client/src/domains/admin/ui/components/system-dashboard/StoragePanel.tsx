/**
 * Storage Panel
 *
 * Cross-lab storage capacity and utilization analytics for system admins.
 */

import { useMemo, useState } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import {
  AlertTriangle,
  Box as BoxIcon,
  ChevronLeft,
  FlaskConical,
  HardDrive,
  Icon,
  RefreshCw,
  Rows3,
  TestTube,
} from 'lucide-react';

import { BracketedStamp, Button, Chip, IdStamp, SectionHeader, StatCell, Table } from '@shared/ui';
import { LabBadge, getLabBadgeTextClasses } from '@shared/ui/components/badges/LabBadge';

import { useLabsQuery, useSystemOverviewQuery } from '../../../hooks/useLabQueries';
import {
  useCrossLabStorageAnalyticsQuery,
  useLabStorageAnalyticsSystemQuery,
} from '../../../hooks/useStorageAnalyticsQueries';

import type {
  LabStorageSummary,
  TankUtilization,
  RackUtilization,
  BoxUtilization,
} from '@odysseus/shared-schemas';
import type { SortConfig, TableColumn } from '@shared/ui';

type LabSummaryRow = LabStorageSummary & { id: string };
type TankRow = TankUtilization & { id: string };
type RackRow = RackUtilization & { id: string };
type BoxRow = BoxUtilization & { id: string };

const NEAR_CAPACITY_THRESHOLD = 85;
const CRITICAL_CAPACITY_THRESHOLD = 95;

function UtilizationBar({ percent }: { percent: number }) {
  const tone =
    percent >= 90
      ? 'bg-danger-bg shadow-[0_0_6px_hsl(var(--color-danger-bg)/0.6)]'
      : percent >= 70
        ? 'bg-warning-bg shadow-[0_0_6px_hsl(var(--color-warning-bg)/0.6)]'
        : 'bg-success-bg shadow-[0_0_6px_hsl(var(--color-success-bg)/0.6)]';
  const clamped = Math.min(percent, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 border border-foreground/15 bg-foreground/[0.03]">
        <div className={`h-full bg-scanlines ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="font-mono text-[10px] tracking-[0.04em] text-foreground/70">{percent}%</span>
    </div>
  );
}

export function StoragePanel() {
  const {
    data: crossLabData,
    isLoading,
    isFetching: crossLabFetching,
    refetch: refetchCrossLab,
  } = useCrossLabStorageAnalyticsQuery();
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [labSortConfig, setLabSortConfig] = useState<SortConfig | undefined>({
    columnId: 'utilizationPercent',
    direction: 'desc',
  });

  const { data: labsData } = useLabsQuery();
  const { data: systemOverview } = useSystemOverviewQuery();

  const totalTanks = (systemOverview?.labStats ?? []).reduce((sum, lab) => sum + lab.tankCount, 0);

  const labMetaMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; slug: string; isDemo: boolean; isActive: boolean }
    >();
    for (const lab of labsData ?? []) {
      map.set(lab.id, {
        name: lab.name,
        slug: lab.slug,
        isDemo: lab.isDemo,
        isActive: lab.isActive,
      });
    }
    return map;
  }, [labsData]);

  const selectedLabMeta = selectedLabId ? labMetaMap.get(selectedLabId) : undefined;

  const nearCapacityCount = (crossLabData?.labs ?? []).filter(
    l => l.utilizationPercent >= NEAR_CAPACITY_THRESHOLD
  ).length;
  const criticalCapacityCount = (crossLabData?.labs ?? []).filter(
    l => l.utilizationPercent >= CRITICAL_CAPACITY_THRESHOLD
  ).length;
  const capacityTone =
    criticalCapacityCount > 0 ? 'danger' : nearCapacityCount > 0 ? 'warning' : 'success';

  const activeLabsInTable = (crossLabData?.labs ?? []).filter(
    l => labMetaMap.get(l.labId)?.isActive
  ).length;
  const inactiveLabsInTable = (crossLabData?.labs ?? []).length - activeLabsInTable;

  const sortedLabs = useMemo(() => {
    const labs = crossLabData?.labs ?? [];
    if (!labSortConfig) return labs;
    return [...labs].sort((a, b) => {
      const dir = labSortConfig.direction === 'asc' ? 1 : -1;
      switch (labSortConfig.columnId) {
        case 'labName':
          return dir * a.labName.localeCompare(b.labName);
        case 'totalPositions':
          return dir * (a.totalPositions - b.totalPositions);
        case 'totalOccupied':
          return dir * (a.totalOccupied - b.totalOccupied);
        case 'utilizationPercent':
          return dir * (a.utilizationPercent - b.utilizationPercent);
        default:
          return 0;
      }
    });
  }, [crossLabData, labSortConfig]);

  const labColumns: TableColumn<LabSummaryRow>[] = [
    {
      id: 'labName',
      header: 'Lab',
      sortable: true,
      render: (_val, row) => {
        const meta = labMetaMap.get(row.labId);
        return (
          <div className="flex items-center gap-2">
            <LabBadge
              labId={row.labId}
              labName={row.labName}
              size="sm"
              isDemo={meta?.isDemo}
              isActive={meta?.isActive}
            />
            <span>{row.labName}</span>
          </div>
        );
      },
    },
    {
      id: 'totalPositions',
      header: 'Total Positions',
      sortable: true,
      accessor: 'totalPositions',
    },
    {
      id: 'totalOccupied',
      header: 'Occupied',
      sortable: true,
      accessor: 'totalOccupied',
    },
    {
      id: 'utilizationPercent',
      header: 'Utilization',
      sortable: true,
      render: (_val, row) => <UtilizationBar percent={row.utilizationPercent} />,
    },
  ];

  if (selectedLabId) {
    return (
      <LabDrillDown
        labId={selectedLabId}
        labName={selectedLabMeta?.name ?? ''}
        labSlug={selectedLabMeta?.slug ?? ''}
        isDemo={selectedLabMeta?.isDemo ?? false}
        isActive={selectedLabMeta?.isActive ?? false}
        onBack={() => setSelectedLabId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <BracketedStamp
        title="Storage"
        icon={<HardDrive size={14} />}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetchCrossLab()}
            disabled={isLoading}
            leftIcon={<RefreshCw size={14} className={crossLabFetching ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        }
      />

      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-card bg-scanlines"
          style={{
            maskImage:
              'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent), linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent), linear-gradient(to bottom, transparent, black 16px, black calc(100% - 16px), transparent)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in',
          }}
        />
        <div className="relative flex divide-x divide-line-soft">
          <StatCell
            size="sm"
            label="Labs with Storage"
            value={crossLabData?.labs.length ?? 0}
            footer={`of ${labsData?.length ?? 0} total`}
            icon={<FlaskConical size={11} />}
            className="flex-1"
          />
          <StatCell
            size="sm"
            label="Tanks"
            value={totalTanks.toLocaleString()}
            icon={<Icon iconNode={refrigeratorFreezer} size={11} />}
            className="flex-1"
          />
          <StatCell
            size="sm"
            label="Total Positions"
            value={(crossLabData?.totalPositions ?? 0).toLocaleString()}
            icon={<TestTube size={11} />}
            className="flex-1"
          />
          <StatCell
            size="sm"
            label="Near Capacity"
            value={nearCapacityCount}
            tone={capacityTone}
            className="flex-1"
          />
        </div>
      </div>

      <div>
        <SectionHeader
          title="Lab Usage"
          meta={`${activeLabsInTable} active · ${inactiveLabsInTable} inactive`}
        />
        <Table<LabSummaryRow>
          columns={labColumns}
          data={sortedLabs.map(l => ({ ...l, id: l.labId }))}
          sortable
          sortConfig={labSortConfig}
          onSort={setLabSortConfig}
          hoverable
          loading={isLoading}
          emptyMessage="No labs with storage configured"
          aria-label="Per-lab storage utilization"
          onRowClick={row => setSelectedLabId(row.labId)}
        />
      </div>
    </div>
  );
}

function LabDrillDown({
  labId,
  labName,
  labSlug,
  isDemo,
  isActive,
  onBack,
}: {
  labId: string;
  labName: string;
  labSlug: string;
  isDemo: boolean;
  isActive: boolean;
  onBack: () => void;
}) {
  const { data, isLoading } = useLabStorageAnalyticsSystemQuery(labId);
  const [expandedTankId, setExpandedTankId] = useState<string | null>(null);
  const [expandedRackId, setExpandedRackId] = useState<string | null>(null);

  const utilizationPercent = data?.utilizationPercent ?? 0;
  const tankCount = data?.tanks?.length ?? 0;
  const rackCount = (data?.tanks ?? []).reduce((sum, t) => sum + t.racks.length, 0);
  const boxCount = (data?.tanks ?? []).reduce(
    (sum, t) => sum + t.racks.reduce((rSum, r) => rSum + r.boxes.length, 0),
    0
  );

  const expandedRowClass = [
    '[background-image:repeating-linear-gradient(to_bottom,rgba(0,0,0,0.12)_0,rgba(0,0,0,0.12)_1px,transparent_1px,transparent_3px),linear-gradient(180deg,hsl(var(--primary)/0.025),hsl(var(--primary)/0.025)),linear-gradient(90deg,hsl(var(--primary)/0.21)_0%,hsl(var(--primary)/0.13)_18%,hsl(var(--primary)/0.06)_48%,hsl(var(--primary)/0.02)_78%,hsl(var(--primary)/0)_100%)]',
    'shadow-[inset_3px_0_0_0_hsl(var(--primary)),inset_14px_0_36px_-10px_hsl(var(--primary)/0.43),inset_0_1px_0_hsl(var(--primary)/0.16),inset_0_-1px_0_hsl(var(--primary)/0.16),inset_0_10px_16px_-8px_hsl(var(--primary)/0.14),inset_0_-10px_16px_-8px_hsl(var(--primary)/0.14),0_0_32px_-4px_hsl(var(--primary)/0.20),0_0_80px_4px_hsl(var(--primary)/0.09)]',
    '[&>td]:!bg-transparent',
    '[&>td:first-child]:relative',
    '[&>td:first-child]:before:content-[""] [&>td:first-child]:before:absolute [&>td:first-child]:before:left-0 [&>td:first-child]:before:top-0 [&>td:first-child]:before:bottom-0 [&>td:first-child]:before:w-[3px] [&>td:first-child]:before:bg-primary [&>td:first-child]:before:pointer-events-none',
    '[&>td:first-child]:before:shadow-[0_0_6px_0_hsl(var(--primary)/0.50),0_0_24px_3px_hsl(var(--primary)/0.40),0_0_72px_10px_hsl(var(--primary)/0.19)]',
    '[&>td]:font-semibold',
    '[&>td]:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_35%,transparent)]',
  ].join(' ');

  const tankColumns: TableColumn<TankRow>[] = [
    {
      id: 'tankName',
      header: 'Tank',
      render: (_val, row) => (
        <div className="flex items-center gap-2">
          <Icon iconNode={refrigeratorFreezer} size={14} className="text-muted-foreground" />
          <span>{row.tankName}</span>
        </div>
      ),
    },
    {
      id: 'totalPositions',
      header: 'Total Positions',
      accessor: 'totalPositions',
    },
    {
      id: 'occupied',
      header: 'Occupied',
      accessor: 'occupied',
    },
    {
      id: 'utilizationPercent',
      header: 'Utilization',
      render: (_val, row) => <UtilizationBar percent={row.utilizationPercent} />,
    },
  ];

  const rackColumns: TableColumn<RackRow>[] = [
    {
      id: 'rackName',
      header: 'Rack',
      render: (_val, row) => (
        <div className="flex items-center gap-2">
          <Rows3 size={14} className="text-muted-foreground" />
          <span>{row.rackName}</span>
        </div>
      ),
    },
    {
      id: 'totalPositions',
      header: 'Positions',
      accessor: 'totalPositions',
    },
    {
      id: 'occupied',
      header: 'Occupied',
      accessor: 'occupied',
    },
    {
      id: 'utilizationPercent',
      header: 'Utilization',
      render: (_val, row) => <UtilizationBar percent={row.utilizationPercent} />,
    },
  ];

  const expandedTank = data?.tanks.find(t => t.tankId === expandedTankId);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ChevronLeft size={14} />}>
        All Labs
      </Button>

      <div className="flex items-stretch gap-3">
        <div
          className={`flex shrink-0 flex-col items-center gap-2 ${getLabBadgeTextClasses(labId, isDemo)}`}
        >
          <LabBadge labId={labId} labName={labName} size="md" isDemo={isDemo} isActive={isActive} />
          <span
            aria-hidden
            className="w-px flex-1"
            style={{
              background:
                'linear-gradient(to bottom, color-mix(in srgb, currentColor 30%, transparent), transparent)',
            }}
          />
        </div>
        <div className="flex min-w-0 flex-col justify-end gap-2">
          <h1 className="font-display text-[32px] font-normal leading-none tracking-[-0.015em] text-foreground">
            {labName}
          </h1>
          <IdStamp
            parts={[
              `/${labSlug}`,
              `${tankCount} ${tankCount === 1 ? 'tank' : 'tanks'} · ${rackCount} ${rackCount === 1 ? 'rack' : 'racks'} · ${boxCount} ${boxCount === 1 ? 'box' : 'boxes'}`,
              `${utilizationPercent}% utilization`,
            ]}
          />
        </div>
      </div>

      {data && data.nearCapacityBoxes.length > 0 && (
        <div>
          <SectionHeader
            title="Near Capacity"
            meta={`${data.nearCapacityBoxes.length} ${data.nearCapacityBoxes.length === 1 ? 'box' : 'boxes'}`}
          />
          <div className="flex flex-wrap items-center gap-2">
            {data.nearCapacityBoxes.map(box => (
              <Chip
                key={`${box.tankName}-${box.rackName}-${box.boxName}`}
                color="warning"
                size="sm"
                leftIcon={<AlertTriangle size={12} />}
              >
                {box.tankName} · {box.rackName} · {box.boxName}: {box.occupied}/{box.maxPositions} (
                {box.utilizationPercent}%)
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionHeader title="Tanks" meta={`${tankCount}`} />
        <Table<TankRow>
          columns={tankColumns}
          data={(data?.tanks ?? []).map(t => ({ ...t, id: t.tankId }))}
          hoverable
          loading={isLoading}
          emptyMessage="No tanks configured"
          aria-label="Per-tank utilization"
          onRowClick={row => {
            setExpandedTankId(row.tankId === expandedTankId ? null : row.tankId);
            setExpandedRackId(null);
          }}
          rowClassName={row => (row.tankId === expandedTankId ? expandedRowClass : '')}
        />
      </div>

      {expandedTank && (
        <>
          <div>
            <SectionHeader
              title="Racks"
              meta={`${expandedTank.racks.length} // ${expandedTank.tankName}`}
            />
            <Table<RackRow>
              columns={rackColumns}
              data={expandedTank.racks.map(r => ({ ...r, id: r.rackId }))}
              hoverable
              emptyMessage="No racks in this tank"
              aria-label={`Racks in ${expandedTank.tankName}`}
              onRowClick={row =>
                setExpandedRackId(row.rackId === expandedRackId ? null : row.rackId)
              }
              rowClassName={row => (row.rackId === expandedRackId ? expandedRowClass : '')}
            />
          </div>

          {expandedRackId && expandedTank.racks.find(r => r.rackId === expandedRackId) && (
            <div>
              <SectionHeader
                title="Boxes"
                meta={`${expandedTank.racks.find(r => r.rackId === expandedRackId)!.boxes.length} // ${expandedTank.tankName} // ${expandedTank.racks.find(r => r.rackId === expandedRackId)!.rackName}`}
              />
              <Table<BoxRow>
                columns={[
                  {
                    id: 'boxName',
                    header: 'Box',
                    render: (_val, row) => (
                      <div className="flex items-center gap-2">
                        <BoxIcon size={14} className="text-muted-foreground" />
                        <span>{row.boxName}</span>
                      </div>
                    ),
                  },
                  { id: 'maxPositions', header: 'Positions', accessor: 'maxPositions' },
                  { id: 'occupied', header: 'Occupied', accessor: 'occupied' },
                  {
                    id: 'utilizationPercent',
                    header: 'Utilization',
                    render: (_val, row) => <UtilizationBar percent={row.utilizationPercent} />,
                  },
                ]}
                data={expandedTank.racks
                  .find(r => r.rackId === expandedRackId)!
                  .boxes.map(b => ({ ...b, id: b.boxName }))}
                hoverable
                emptyMessage="No boxes in this rack"
                aria-label="Box utilization"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
