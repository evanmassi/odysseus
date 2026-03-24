/**
 * Lab Researchers Panel
 *
 * Researchers table with name, linked user, tube count, and delete action.
 */

import { useMemo, useState } from 'react';

import { ChevronDown, Dna, Link2, Trash2 } from 'lucide-react';

import { Button, Chip, Table, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import { adminResearcherService } from '../../../services/AdminResearcherService';

import type { LabDetailsResearcher } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui';

interface LabResearchersPanelProps {
  researchers: LabDetailsResearcher[];
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
  const [deleteTarget, setDeleteTarget] = useState<LabDetailsResearcher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const activeResearchers = useMemo(() => researchers.filter(r => r.active), [researchers]);
  const inactiveResearchers = useMemo(() => researchers.filter(r => !r.active), [researchers]);

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

  const canDelete = (researcher: LabDetailsResearcher) =>
    researcher.tubeCount === 0 && !researcher.linkedUser;

  const columns = getResearcherColumns(canDelete, setDeleteTarget);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Dna size={18} className="text-muted-foreground" />
        <h3 className="text-lg font-semibold text-card-foreground">Researchers</h3>
      </div>
      <Table
        columns={columns}
        data={activeResearchers}
        size="sm"
        rounded="lg"
        sortable
        sortConfig={sortConfig}
        onSort={onSort}
        hoverable={false}
        emptyMessage="No researchers in this lab"
        aria-label="Lab researchers"
      />

      {inactiveResearchers.length > 0 && (
        <div className="pt-3 border-t border-border mt-3">
          <button
            onClick={() => setShowInactive(prev => !prev)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${showInactive ? 'rotate-0' : '-rotate-90'}`}
            />
            Inactive Researchers ({inactiveResearchers.length})
          </button>
          {showInactive && (
            <div className="mt-2">
              <Table
                columns={columns}
                data={inactiveResearchers}
                size="sm"
                rounded="lg"
                emptyMessage=""
                aria-label="Inactive lab researchers"
                className="opacity-60"
              />
            </div>
          )}
        </div>
      )}

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
  canDelete: (r: LabDetailsResearcher) => boolean,
  onDelete: (r: LabDetailsResearcher) => void
): TableColumn<LabDetailsResearcher>[] {
  return [
    {
      id: 'name',
      header: 'Researcher',
      sortable: true,
      render: (_value, row) => (
        <div className="flex items-center whitespace-nowrap">
          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center mr-2">
            <Dna size={14} className="text-secondary-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium text-card-foreground">
              {row.lastName}, {row.firstName}
            </div>
            {row.email && <div className="text-xs text-muted-foreground">{row.email}</div>}
          </div>
        </div>
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
      id: 'linkedUser',
      header: 'Linked User',
      render: (_value, row) => {
        if (row.linkedUser) {
          return (
            <div className="flex items-center gap-1.5 text-sm text-card-foreground whitespace-nowrap">
              <Link2 size={14} className="text-success-text shrink-0" />
              <span>{row.linkedUser.username}</span>
            </div>
          );
        }
        return (
          <Chip size="sm" color="outlined">
            None
          </Chip>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (_value, row) => {
        const deletable = canDelete(row);
        const reason = row.linkedUser
          ? 'Unlink user before deleting'
          : row.tubeCount > 0
            ? `Has ${row.tubeCount} tube${row.tubeCount === 1 ? '' : 's'}`
            : undefined;

        return (
          <Tooltip content={deletable ? 'Delete researcher' : reason}>
            <span>
              <Button
                variant="ghost-danger"
                size="xs"
                iconOnly
                onClick={() => deletable && onDelete(row)}
                disabled={!deletable}
                aria-label="Delete researcher"
              >
                <Trash2 size={16} />
              </Button>
            </span>
          </Tooltip>
        );
      },
    },
  ];
}
