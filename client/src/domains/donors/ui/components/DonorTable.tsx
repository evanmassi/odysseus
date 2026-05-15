/**
 * Donor Table
 *
 * Searchable, sortable donor list with curation indicators.
 */

import { useState, useMemo } from 'react';

import { Plus, Search } from 'lucide-react';

import { Button, Chip, ScrollArea, Table } from '@shared/ui';

import type { DonorWithTubeCount } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui/primitives/table/types';

interface DonorTableProps {
  donors: DonorWithTubeCount[];
  selectedDonorId?: string;
  onSelectDonor: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isAdmin: boolean;
  onAddDonor: () => void;
  isLoading: boolean;
}

export function DonorTable({
  donors,
  selectedDonorId,
  onSelectDonor,
  searchQuery,
  onSearchChange,
  isAdmin,
  onAddDonor,
  isLoading,
}: DonorTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    columnId: 'donorSourceId',
    direction: 'asc',
  });

  const filteredDonors = useMemo(() => {
    if (!searchQuery) return donors;
    // Strip spaces and # for flexible matching (e.g., "LP8", "LP#8", "LP #8" all match)
    const normalize = (s: string) => s.toLowerCase().replace(/[\s#]+/g, '');
    const q = normalize(searchQuery);
    return donors.filter(
      d =>
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR: need to match on either ID
        normalize(d.donorSourceId ?? '').includes(q) ||
        normalize(d.donorInternalId ?? '').includes(q)
    );
  }, [donors, searchQuery]);

  const sortedDonors = useMemo(() => {
    const sorted = [...filteredDonors];
    const { columnId, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (columnId === 'donorSourceId') {
        aVal = a.donorSourceId ?? '';
        bVal = b.donorSourceId ?? '';
      } else if (columnId === 'donorInternalId') {
        aVal = a.donorInternalId ?? '';
        bVal = b.donorInternalId ?? '';
      } else if (columnId === 'tubeCount') {
        return (a.tubeCount - b.tubeCount) * multiplier;
      }

      return String(aVal).localeCompare(String(bVal)) * multiplier;
    });

    return sorted;
  }, [filteredDonors, sortConfig]);

  const columns: TableColumn<DonorWithTubeCount>[] = useMemo(
    () => [
      {
        id: 'donorSourceId',
        header: 'Source ID',
        sortable: true,
        render: (_value, row) => (
          <div className="flex items-center gap-1.5">
            {!row.isCurated && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                title="Needs review — awaiting lab admin curation"
              />
            )}
            <span className="truncate">{row.donorSourceId ?? '—'}</span>
          </div>
        ),
      },
      {
        id: 'donorInternalId',
        header: 'Internal ID',
        sortable: true,
        render: (_value, row) => <span className="truncate">{row.donorInternalId ?? '—'}</span>,
      },
      {
        id: 'tubeCount',
        header: 'Tubes',
        sortable: true,
        align: 'left' as const,
        width: 65,
        render: (_value, row) => (
          <Chip
            size="sm"
            color={row.tubeCount > 0 ? 'primary' : 'default'}
            className={row.tubeCount > 0 ? 'border border-action' : 'border border-border'}
          >
            {row.tubeCount}
          </Chip>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-2 h-full pt-1 px-1">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="input-search w-full pl-8"
          />
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAddDonor}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Donor
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={sortedDonors}
          hoverable
          sortable
          sortConfig={sortConfig}
          onSort={setSortConfig}
          onRowClick={row => onSelectDonor(row.id)}
          selectedRows={selectedDonorId ? [selectedDonorId] : []}
          emptyMessage={isLoading ? 'Loading donors...' : 'No donors found'}
          aria-label="Donor registry"
          rowClassName={row => (row.id === selectedDonorId ? '!bg-accent' : '')}
        />
      </ScrollArea>
    </div>
  );
}
