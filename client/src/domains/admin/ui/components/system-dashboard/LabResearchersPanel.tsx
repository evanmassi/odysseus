/**
 * Lab Researchers Panel
 *
 * Researchers table showing name, linked user, and tube count.
 */

import { Dna } from 'lucide-react';

import { Chip, Table } from '@shared/ui';

import type { TableColumn, SortConfig } from '@shared/ui';

interface LabResearcher {
  id: string;
  firstName: string;
  lastName: string;
  linkedUser: { id: string; username: string } | null;
  tubeCount: number;
}

interface LabResearchersPanelProps {
  researchers: LabResearcher[];
  sortConfig: SortConfig | undefined;
  onSort: (config: SortConfig | undefined) => void;
}

export function LabResearchersPanel({ researchers, sortConfig, onSort }: LabResearchersPanelProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Dna size={16} className="text-secondary-foreground" />
        <h3 className="text-sm font-semibold text-card-foreground">Researchers</h3>
      </div>
      <Table
        columns={getResearcherColumns()}
        data={researchers}
        size="sm"
        rounded="lg"
        sortable
        sortConfig={sortConfig}
        onSort={onSort}
        hoverable={false}
        emptyMessage="No researchers in this lab"
        aria-label="Lab researchers"
      />
    </div>
  );
}

function getResearcherColumns(): TableColumn[] {
  return [
    {
      id: 'name',
      header: 'Researcher',
      sortable: true,
      render: (_value, row) => (
        <span>
          {String(row['firstName'])} {String(row['lastName'])}
        </span>
      ),
    },
    {
      id: 'linkedUser',
      header: 'Linked User',
      render: (_value, row) => {
        const linkedUser = row['linkedUser'] as { id: string; username: string } | null;
        return <span className="text-muted-foreground">{linkedUser?.username ?? '—'}</span>;
      },
    },
    {
      id: 'tubeCount',
      header: 'Tubes',
      sortable: true,
      render: (_value, row) => {
        const tubeCount = row['tubeCount'] as number;
        return (
          <Chip
            size="sm"
            color={tubeCount > 0 ? 'primary' : 'default'}
            className={tubeCount > 0 ? 'border border-action' : 'border border-border'}
          >
            {tubeCount}
          </Chip>
        );
      },
    },
  ];
}
