/**
 * Lab Researchers Panel
 *
 * Researchers table with name, linked user, tube count, and delete action.
 */

import { useMemo, useState } from 'react';

import { ChevronDown, Dna, Link2, Trash2 } from 'lucide-react';

import { Button, Chip, Panel, PanelEdgeLabel, Table, Tooltip } from '@shared/ui';
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
    <>
      <Panel>
        <PanelEdgeLabel parts={['Researchers', `${activeResearchers.length} records`]} />
        <Table
          columns={columns}
          data={activeResearchers}
          sortable
          sortConfig={sortConfig}
          onSort={onSort}
          hoverable={false}
          emptyMessage="No researchers in this lab"
          aria-label="Lab researchers"
        />

        {inactiveResearchers.length > 0 && (
          <div className="pt-3 px-5 pb-5 border-t border-foreground/10 mt-3">
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
                  emptyMessage=""
                  aria-label="Inactive lab researchers"
                  className="opacity-60"
                />
              </div>
            )}
          </div>
        )}
      </Panel>

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
    </>
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
          const isDeactivated =
            row.linkedUser.status === 'deactivated' || row.linkedUser.status === 'suspended';
          return (
            <div className="flex flex-col gap-0.5">
              <div
                className={`flex items-center gap-1.5 text-sm whitespace-nowrap ${isDeactivated ? 'text-muted-foreground opacity-60' : 'text-card-foreground'}`}
              >
                <Link2
                  size={14}
                  className={`shrink-0 ${isDeactivated ? 'text-muted-foreground' : 'text-success-text'}`}
                />
                <span>{row.linkedUser.username}</span>
              </div>
              {isDeactivated && (
                <Chip size="sm" color="default" className="w-fit">
                  Deactivated
                </Chip>
              )}
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
