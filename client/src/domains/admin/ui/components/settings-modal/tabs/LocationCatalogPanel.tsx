/**
 * Location Catalog Panel
 *
 * The locations leaf of the catalog rail: the tree read-only, edited in its own modal.
 */

import { useMemo } from 'react';

import { MapPin } from 'lucide-react';

import { buildHierarchyOptions, Button, Table } from '@shared/ui';

import type { LabLocation } from '@odysseus/shared-schemas';
import type { TableColumn } from '@shared/ui';

interface LocationRow {
  id: string;
  name: string;
  depth: number;
  inside: string;
  description: string;
}

const COLUMNS: TableColumn<LocationRow>[] = [
  {
    id: 'name',
    header: 'Location',
    render: (_value, row) => (
      <span className="block truncate" style={{ paddingLeft: `${row.depth * 14}px` }}>
        {row.name}
      </span>
    ),
  },
  {
    id: 'inside',
    header: 'Inside',
    width: 180,
    render: (_value, row) => <span className="text-muted-foreground">{row.inside}</span>,
  },
  {
    id: 'description',
    header: 'Description',
    render: (_value, row) => <span className="text-muted-foreground">{row.description}</span>,
  },
];

interface LocationCatalogPanelProps {
  locations: LabLocation[];
  loading?: boolean;
  readOnly: boolean;
  onManage: () => void;
}

export function LocationCatalogPanel({
  locations,
  loading = false,
  readOnly,
  onManage,
}: LocationCatalogPanelProps) {
  const rows = useMemo<LocationRow[]>(() => {
    const byId = new Map(locations.map(location => [location.id, location]));

    return buildHierarchyOptions(locations).map(option => {
      const location = byId.get(String(option.value));
      const parent = location?.parentId ? byId.get(location.parentId) : undefined;

      return {
        id: String(option.value),
        name: option.label,
        depth: option.depth ?? 0,
        inside: parent?.name ?? '—',
        description: location?.description ?? '—',
      };
    });
  }, [locations]);

  return (
    <Table
      columns={COLUMNS}
      toolbar={{
        left: (
          <span className="type-label text-label-2xs tracking-label-wide text-foreground/40">
            used by equipment · supplies · reagents
          </span>
        ),
        right: (
          <Button
            variant="primary"
            size="sm"
            onClick={onManage}
            disabled={readOnly}
            leftIcon={<MapPin size={14} />}
          >
            Manage Locations
          </Button>
        ),
      }}
      data={rows}
      hoverable
      loading={loading}
      emptyMessage="No locations yet"
      loadingMessage="Loading locations..."
      aria-label="Locations list"
    />
  );
}
