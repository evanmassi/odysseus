/**
 * Donor Table
 *
 * Searchable, sortable donor list with curation indicators.
 */

import { useState, useMemo } from 'react';

import { Plus } from 'lucide-react';

import { Button, Chip, ConsolePanel, ScrollArea, SearchInput, Table } from '@shared/ui';

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
                className="h-3 w-0.5 flex-shrink-0 bg-warning-bg shadow-[0_0_6px_1px_hsl(var(--color-warning-bg)/0.7)]"
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
            numeric
          >
            {row.tubeCount}
          </Chip>
        ),
      },
    ],
    []
  );

  return (
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-line-faint px-3 py-2">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search donors…"
          size="sm"
          className="flex-1"
          aria-label="Search donors"
        />
        {isAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAddDonor}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Donor
          </Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <Table
          chassis={false}
          columns={columns}
          data={sortedDonors}
          hoverable
          sortable
          sortConfig={sortConfig}
          onSort={setSortConfig}
          onRowClick={row => onSelectDonor(row.id)}
          selectedRows={selectedDonorId ? [selectedDonorId] : []}
          selectedRowGlow
          emptyMessage={isLoading ? 'Loading donors...' : 'No donors found'}
          aria-label="Donor registry"
        />
      </ScrollArea>
    </ConsolePanel>
  );
}
