/**
 * Lab Researchers Panel
 *
 * Researchers table showing name, linked user, tube count, and delete action for orphaned researchers.
 */

import { useState } from 'react';

import { Dna, Trash2 } from 'lucide-react';

import { Button, Chip, Table } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { notifications } from '@shared/utils';

import { adminResearcherService } from '../../../services/AdminResearcherService';

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
  onResearcherDeleted?: () => void;
}

export function LabResearchersPanel({
  researchers,
  sortConfig,
  onSort,
  onResearcherDeleted,
}: LabResearchersPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<LabResearcher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await adminResearcherService.deleteResearcher(deleteTarget.id);
      notifications.success(
        `Researcher "${deleteTarget.firstName} ${deleteTarget.lastName}" deleted`
      );
      setDeleteTarget(null);
      onResearcherDeleted?.();
    } catch {
      notifications.error('Failed to delete researcher');
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = (researcher: LabResearcher) =>
    researcher.tubeCount === 0 && !researcher.linkedUser;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Dna size={16} className="text-secondary-foreground" />
        <h3 className="text-sm font-semibold text-card-foreground">Researchers</h3>
      </div>
      <Table
        columns={getResearcherColumns(canDelete, setDeleteTarget)}
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

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Researcher"
        message={`Delete "${deleteTarget?.firstName} ${deleteTarget?.lastName}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function getResearcherColumns(
  canDelete: (r: LabResearcher) => boolean,
  onDelete: (r: LabResearcher) => void
): TableColumn<LabResearcher>[] {
  return [
    {
      id: 'name',
      header: 'Researcher',
      sortable: true,
      render: (_value, row) => (
        <span>
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      id: 'linkedUser',
      header: 'Linked User',
      render: (_value, row) => (
        <span className="text-muted-foreground">{row.linkedUser?.username ?? '—'}</span>
      ),
    },
    {
      id: 'tubeCount',
      header: 'Tubes',
      sortable: true,
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
    {
      id: 'actions',
      header: '',
      render: (_value, row) =>
        canDelete(row) ? (
          <Tooltip content="Delete orphaned researcher">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row)}
              className="text-danger-text hover:text-danger-text"
            >
              <Trash2 size={14} />
            </Button>
          </Tooltip>
        ) : null,
    },
  ];
}
