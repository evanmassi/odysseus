/**
 * Lab Researchers Panel
 *
 * Researchers table with name, linked user, tube count, and delete action.
 */

import { useMemo, useState } from 'react';

import { ChevronDown, Link2, Trash2 } from 'lucide-react';

import { Button, Chip, SectionHeader, Table, Tooltip } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
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
      <div>
        <SectionHeader title="Researchers" meta={`${activeResearchers.length} records`} />
        <Table
          columns={columns}
          data={activeResearchers}
          sortable
          sortConfig={sortConfig}
          onSort={onSort}
          emptyMessage="No researchers in this lab"
          aria-label="Lab researchers"
        />

        {inactiveResearchers.length > 0 && (
          <div className="relative mt-3 pt-3 before:absolute before:inset-x-0 before:top-0 before:h-px before:content-[''] before:[background:linear-gradient(90deg,hsl(var(--foreground)/0.20)_0%,hsl(var(--foreground)/0.12)_55%,hsl(var(--foreground)/0.04)_88%,transparent_100%)]">
            <button
              onClick={() => setShowInactive(prev => !prev)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
                  rowState={() => 'muted'}
                />
              </div>
            )}
          </div>
        )}
      </div>

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
      render: (_value, row) => {
        const initials = `${row.firstName?.[0] ?? ''}${row.lastName?.[0] ?? ''}`.toUpperCase();
        return (
          <div className="flex items-center gap-3 whitespace-nowrap">
            <UserBadge
              type="otherUser"
              initials={initials}
              username={`${row.firstName} ${row.lastName}`}
              size="md"
            />
            <div>
              <div className="font-sans text-[13px] font-medium text-foreground">
                {row.lastName}, {row.firstName}
              </div>
              {row.email && (
                <div className="mt-0.5 font-mono text-[10.5px] tracking-[0.04em] text-foreground/40">
                  {row.email}
                </div>
              )}
            </div>
          </div>
        );
      },
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
          numeric
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
                className={`flex items-center gap-1.5 whitespace-nowrap text-[13px] ${isDeactivated ? 'text-foreground/50' : 'text-foreground'}`}
              >
                <Link2
                  size={14}
                  className={`shrink-0 ${isDeactivated ? 'text-foreground/30' : 'text-success-text'}`}
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
