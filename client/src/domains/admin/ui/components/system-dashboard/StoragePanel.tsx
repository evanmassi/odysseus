/**
 * Storage Panel
 *
 * Cross-lab storage capacity and utilization analytics for system admins.
 */

import { useMemo, useState } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import { AlertTriangle, Box as BoxIcon, ChevronLeft, HardDrive, Rows3, Icon } from 'lucide-react';

import { Button, Chip, Table } from '@shared/ui';

import {
  useCrossLabStorageAnalyticsQuery,
  useLabStorageAnalyticsSystemQuery,
} from '../../../hooks/useStorageAnalyticsQueries';

import type { LabStorageSummary, TankUtilization, RackUtilization } from '@odysseus/shared-schemas';
import type { SortConfig, TableColumn } from '@shared/ui';

type LabSummaryRow = LabStorageSummary & { id: string };
type TankRow = TankUtilization & { id: string };
type RackRow = RackUtilization & { id: string };

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

  const selectedLabName = useMemo(() => {
    if (!selectedLabId || !crossLabData) return '';
    return crossLabData.labs.find(l => l.labId === selectedLabId)?.labName ?? '';
  }, [selectedLabId, crossLabData]);

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
      accessor: 'labName',
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
        labName={selectedLabName}
        onBack={() => setSelectedLabId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HardDrive size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold text-card-foreground">Storage Overview</h3>
        </div>
        <div className="rounded-lg bg-card p-3 w-fit">
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="info" size="sm" leftIcon={<HardDrive />}>
              {crossLabData?.totalPositions ?? 0} total positions
            </Chip>
            <Chip color="info" size="sm" leftIcon={<BoxIcon />}>
              {crossLabData?.totalOccupied ?? 0} occupied
            </Chip>
            <Chip
              color={(crossLabData?.utilizationPercent ?? 0) >= 90 ? 'warning' : 'info'}
              size="sm"
            >
              {crossLabData?.utilizationPercent ?? 0}% utilization
            </Chip>
          </div>
        </div>
      </div>

      <div>
        <div className="h-px bg-muted-foreground/60" />
      </div>

      {/* Per-Lab Table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Icon iconNode={refrigeratorFreezer} size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold text-card-foreground">Per-Lab Capacity</h3>
        </div>

        <Table<LabSummaryRow>
          columns={labColumns}
          data={sortedLabs.map(l => ({ ...l, id: l.labId }))}
          sortable
          sortConfig={labSortConfig}
          onSort={setLabSortConfig}
          hoverable
          loading={isLoading}
          size="sm"
          rounded="lg"
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
  onBack,
}: {
  labId: string;
  labName: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useLabStorageAnalyticsSystemQuery(labId);
  const [expandedTankId, setExpandedTankId] = useState<string | null>(null);

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ChevronLeft size={14} />}>
          All Labs
        </Button>
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
        <div className="flex items-center gap-2 mb-3">
          <Icon iconNode={refrigeratorFreezer} size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold text-card-foreground">Tanks</h3>
        </div>

        <Table<TankRow>
          columns={tankColumns}
          data={(data?.tanks ?? []).map(t => ({ ...t, id: t.tankId }))}
          hoverable
          loading={isLoading}
          size="sm"
          rounded="lg"
          emptyMessage="No tanks configured"
          aria-label="Per-tank utilization"
          onRowClick={row => setExpandedTankId(row.tankId === expandedTankId ? null : row.tankId)}
          rowClassName={row => (row.tankId === expandedTankId ? 'bg-muted/50' : '')}
        />
      </div>

      {/* Expanded Rack View */}
      {expandedTank && (
        <>
          <div>
            <div className="h-px bg-muted-foreground/60" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Rows3 size={18} className="text-muted-foreground" />
              <h3 className="text-lg font-semibold text-card-foreground">
                Racks in {expandedTank.tankName}
              </h3>
            </div>

            <Table<RackRow>
              columns={rackColumns}
              data={expandedTank.racks.map(r => ({ ...r, id: r.rackId }))}
              hoverable
              size="sm"
              rounded="lg"
              emptyMessage="No racks in this tank"
              aria-label={`Racks in ${expandedTank.tankName}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
