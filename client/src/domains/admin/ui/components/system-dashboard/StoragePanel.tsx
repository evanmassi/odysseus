import { useMemo, useState } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import {
  Box as BoxIcon,
  ChevronLeft,
  FlaskConical,
  HardDrive,
  Icon,
  RefreshCw,
  Rows3,
  TestTubeDiagonal,
} from 'lucide-react';

import {
  Button,
  Chip,
  ConsolePanel,
  IdStamp,
  PanelHeader,
  SectionHeader,
  StatCell,
  Table,
} from '@shared/ui';
import { LabBadge } from '@shared/ui/components/badges/LabBadge';

import { useLabsQuery, useSystemOverviewQuery } from '../../../hooks/useLabQueries';
import {
  useCrossLabStorageAnalyticsQuery,
  useLabStorageAnalyticsSystemQuery,
} from '../../../hooks/useStorageAnalyticsQueries';
import { UtilizationBar } from '../displays/UtilizationBar';

import { LabIdentityPanel } from './LabIdentityPanel';

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
      <ConsolePanel intensity="soft">
        <div className="flex-shrink-0">
          <PanelHeader title="Storage" icon={<HardDrive size={14} />} />
        </div>

        <div className="flex items-center justify-end gap-2 border-b border-line-faint px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetchCrossLab()}
            disabled={isLoading}
            leftIcon={<RefreshCw size={14} className={crossLabFetching ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>

        <div className="relative flex divide-x divide-line-soft [&>*:not(:first-child)]:[border-image:linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.14)_16%,hsl(var(--foreground)/0.14)_92%,transparent_100%)_1]">
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
            icon={<TestTubeDiagonal size={11} />}
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
      </ConsolePanel>

      <ConsolePanel intensity="soft">
        <div className="p-4">
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
      </ConsolePanel>
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

  const utilizationTone =
    utilizationPercent >= CRITICAL_CAPACITY_THRESHOLD
      ? 'danger'
      : utilizationPercent >= NEAR_CAPACITY_THRESHOLD
        ? 'warning'
        : 'default';

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
  const expandedRack = expandedTank?.racks.find(r => r.rackId === expandedRackId);

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ChevronLeft size={14} />}>
        All Labs
      </Button>

      <LabIdentityPanel labId={labId} labName={labName} isActive={isActive} isDemo={isDemo}>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 flex-col gap-2 px-5 pt-5 pb-4">
            <h1 className="font-display text-display leading-none font-normal tracking-[-0.015em] text-foreground">
              {labName}
            </h1>
            <IdStamp parts={[`/${labSlug}`]} />
          </div>

          <div className="grid grid-cols-4 border-t border-line-faint divide-x divide-line-faint [&>*:not(:first-child)]:[border-image:linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.10)_10%,hsl(var(--foreground)/0.10)_86%,transparent_100%)_1]">
            <StatCell
              label="Tanks"
              value={tankCount}
              icon={<Icon iconNode={refrigeratorFreezer} size={11} />}
            />
            <StatCell label="Racks" value={rackCount} icon={<Rows3 size={11} />} />
            <StatCell label="Boxes" value={boxCount} icon={<BoxIcon size={11} />} />
            <StatCell
              label="Utilization"
              value={utilizationPercent}
              unit="%"
              tone={utilizationTone}
              icon={<HardDrive size={11} />}
            />
          </div>
        </div>
      </LabIdentityPanel>

      {data && data.nearCapacityBoxes.length > 0 && (
        <ConsolePanel intensity="soft">
          <div className="p-4">
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
                >
                  {box.tankName} · {box.rackName} · {box.boxName}: {box.occupied}/{box.maxPositions}{' '}
                  ({box.utilizationPercent}%)
                </Chip>
              ))}
            </div>
          </div>
        </ConsolePanel>
      )}

      <ConsolePanel intensity="soft">
        <div className="p-4">
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
            selectedRows={expandedTankId ? [expandedTankId] : []}
            selectedRowGlow
          />
        </div>
      </ConsolePanel>

      {expandedTank && (
        <>
          <ConsolePanel intensity="soft">
            <div className="p-4">
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
                selectedRows={expandedRackId ? [expandedRackId] : []}
                selectedRowGlow
              />
            </div>
          </ConsolePanel>

          {expandedRack && (
            <ConsolePanel intensity="soft">
              <div className="p-4">
                <SectionHeader
                  title="Boxes"
                  meta={`${expandedRack.boxes.length} // ${expandedTank.tankName} // ${expandedRack.rackName}`}
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
                  data={expandedRack.boxes.map(b => ({ ...b, id: b.boxName }))}
                  hoverable
                  emptyMessage="No boxes in this rack"
                  aria-label="Box utilization"
                />
              </div>
            </ConsolePanel>
          )}
        </>
      )}
    </div>
  );
}
