/**
 * Lab Researchers Panel
 *
 * Researchers table with name, linked user, tube count, and delete action.
 */

import { useMemo, useState } from 'react';

import { Trash2 } from 'lucide-react';

import { Button, Chip, ConsolePanel, SectionHeader, Table, Tooltip } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import { useDeleteResearcherMutation } from '../../../hooks/useResearcherMutations';
import { CollapsibleInactiveSection } from '../displays/CollapsibleInactiveSection';
import { LinkedPersonCell } from '../displays/LinkedPersonCell';

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
  const deleteMutation = useDeleteResearcherMutation();

  const activeResearchers = useMemo(() => researchers.filter(r => r.active), [researchers]);
  const inactiveResearchers = useMemo(() => researchers.filter(r => !r.active), [researchers]);

  const handleDelete = () => {
    const target = deleteTarget;
    if (!target) return;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        notifications.success(`Researcher "${target.firstName} ${target.lastName}" deleted`);
        onResearcherDeleted?.();
      },
      onSettled: () => {
        setDeleteTarget(null);
      },
    });
  };

  const canDelete = (researcher: LabDetailsResearcher) =>
    researcher.tubeCount === 0 && !researcher.linkedUser;

  const columns = getResearcherColumns(canDelete, setDeleteTarget);

  return (
    <>
      <ConsolePanel intensity="soft">
        <div className="p-4">
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
            <CollapsibleInactiveSection
              label="Inactive Researchers"
              count={inactiveResearchers.length}
              variant="stripe"
            >
              <Table
                columns={columns}
                data={inactiveResearchers}
                emptyMessage=""
                aria-label="Inactive lab researchers"
                rowState={() => 'muted'}
              />
            </CollapsibleInactiveSection>
          )}
        </div>
      </ConsolePanel>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Researcher"
        message={`Delete "${deleteTarget?.firstName} ${deleteTarget?.lastName}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
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
              <div className="font-sans text-body-sm font-medium text-foreground">
                {row.lastName}, {row.firstName}
              </div>
              {row.email && (
                <div className="mt-0.5 font-mono text-data-sm tracking-[0.04em] text-foreground/40">
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
      render: (_value, row) => (
        <LinkedPersonCell
          label={row.linkedUser ? row.linkedUser.username : null}
          deactivated={
            row.linkedUser
              ? row.linkedUser.status === 'deactivated' || row.linkedUser.status === 'suspended'
              : false
          }
          tone="console"
        />
      ),
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
