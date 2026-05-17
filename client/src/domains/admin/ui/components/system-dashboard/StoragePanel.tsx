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
  Rows3,
  TestTube,
} from 'lucide-react';

import { BracketedStamp, Button, Chip, SectionHeader, StatCell, Table } from '@shared/ui';
import { LabBadge } from '@shared/ui/components/badges';

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
  const color = percent >= 90 ? 'bg-danger-bg' : percent >= 70 ? 'bg-warning-bg' : 'bg-success-bg';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{percent}%</span>
    </div>
  );
}

export function StoragePanel() {
  const { data: crossLabData, isLoading } = useCrossLabStorageAnalyticsQuery();
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [labSortConfig, setLabSortConfig] = useState<SortConfig | undefined>({
    columnId: 'utilizationPercent',
    direction: 'desc',
  });

  const { data: labsData } = useLabsQuery();
  const { data: systemOverview } = useSystemOverviewQuery();

  const totalTanks = (systemOverview?.labStats ?? []).reduce((sum, lab) => sum + lab.tankCount, 0);

  const labMetaMap = useMemo(() => {
    const map = new Map<string, { name: string; isDemo: boolean; isActive: boolean }>();
    for (const lab of labsData ?? []) {
      map.set(lab.id, { name: lab.name, isDemo: lab.isDemo, isActive: lab.isActive });
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
        isDemo={selectedLabMeta?.isDemo ?? false}
        onBack={() => setSelectedLabId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <BracketedStamp title="Storage" icon={<HardDrive size={14} />} />

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
  isDemo,
  onBack,
}: {
  labId: string;
  labName: string;
  isDemo: boolean;
  onBack: () => void;
}) {
  const { data, isLoading } = useLabStorageAnalyticsSystemQuery(labId);
  const [expandedTankId, setExpandedTankId] = useState<string | null>(null);
  const [expandedRackId, setExpandedRackId] = useState<string | null>(null);

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

      <div className="flex items-center gap-2">
        <LabBadge labId={labId} labName={labName} size="md" isDemo={isDemo} />
        <h3 className="text-lg font-semibold text-card-foreground">{labName}</h3>
      </div>

      {/* Near-capacity warnings */}
      {data && data.nearCapacityBoxes.length > 0 && (
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
      )}

      {/* Overview chips */}
      <div className="rounded-lg bg-card p-3 w-fit">
        <div className="flex flex-wrap items-center gap-2">
          <Chip color="info" size="sm" leftIcon={<HardDrive />}>
            {data?.totalPositions ?? 0} total positions
          </Chip>
          <Chip color="info" size="sm" leftIcon={<BoxIcon />}>
            {data?.totalOccupied ?? 0} occupied
          </Chip>
          <Chip color={(data?.utilizationPercent ?? 0) >= 90 ? 'warning' : 'info'} size="sm">
            {data?.utilizationPercent ?? 0}% utilization
          </Chip>
        </div>
      </div>

      <div>
        <div className="h-px bg-muted-foreground/60" />
      </div>

      {/* Per-Tank Table */}
      <div>
        <SectionHeader title="Tanks" meta={`${data?.tanks?.length ?? 0} records`} />
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
          rowClassName={row => (row.tankId === expandedTankId ? 'bg-muted/50' : '')}
        />
      </div>

      {/* Expanded Rack View */}
      {expandedTank && (
        <>
          <div>
            <SectionHeader
              title={`Racks in ${expandedTank.tankName}`}
              meta={`${expandedTank.racks.length} records`}
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
              rowClassName={row => (row.rackId === expandedRackId ? 'bg-muted/50' : '')}
            />
          </div>

          {expandedRackId && expandedTank.racks.find(r => r.rackId === expandedRackId) && (
            <div>
              <SectionHeader
                title={`Boxes in ${expandedTank.racks.find(r => r.rackId === expandedRackId)!.rackName}`}
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
