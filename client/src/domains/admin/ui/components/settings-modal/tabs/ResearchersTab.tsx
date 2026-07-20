/**
 * Researchers Tab
 *
 * Admin interface for researcher profiles, status management, and deletion.
 */

import { useState, useEffect, useMemo, type ReactNode } from 'react';

import { sortByName } from '@odysseus/shared-schemas';
import { Dna, Link, Plus, Power, RefreshCw, TestTubeDiagonal, Trash2 } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { AlertBanner, Button, Chip, Tooltip, Table } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import { useAdminResearchersQuery } from '../../../../hooks/useAdminResearchersQuery';
import {
  useActivateResearcherMutation,
  useCreateResearcherMutation,
  useDeactivateResearcherMutation,
  useDeleteResearcherMutation,
} from '../../../../hooks/useResearcherMutations';
import { CollapsibleInactiveSection } from '../../displays/CollapsibleInactiveSection';
import { LinkedPersonCell } from '../../displays/LinkedPersonCell';
import { ResearcherModal } from '../ResearcherModal';

import { visibleColumns } from './columnVisibility';

import type { AdminResearcher, CreateResearcherProfile } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui';

interface ResearchersTabProps {
  onResearcherUpdate?: () => void;
  onTabFooter?: (footer: ReactNode) => void;
  readOnly?: boolean;
}

export function ResearchersTab({
  onResearcherUpdate,
  onTabFooter,
  readOnly = false,
}: ResearchersTabProps) {
  const { data, isLoading, isFetching, refetch } = useAdminResearchersQuery();
  const activateMutation = useActivateResearcherMutation();
  const createResearcherMutation = useCreateResearcherMutation();
  const deactivateMutation = useDeactivateResearcherMutation();
  const deleteMutation = useDeleteResearcherMutation();

  const researchers = useMemo(() => sortByName(data?.researchers ?? []), [data]);
  const totalTubeCount = data?.totalTubeCount ?? 0;

  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'delete' | 'deactivate';
    researcherId: string;
    researcherName: string;
  } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined);
  const currentUserId = useAuthStore(s => s.user?.id);

  const tubesWithoutResearcher =
    totalTubeCount - researchers.reduce((sum, r) => sum + r.tubeCount, 0);

  useEffect(() => {
    onTabFooter?.(
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Chip color="info" size="sm" lead={<Dna />}>
            {researchers.length} {researchers.length === 1 ? 'researcher' : 'researchers'}
          </Chip>
          <Chip color="info" size="sm" lead={<Link />}>
            {researchers.filter(r => r.linkedUserId).length} linked to users
          </Chip>
          <Chip color="info" size="sm" lead={<TestTubeDiagonal />}>
            {researchers.filter(r => r.tubeCount > 0).length}{' '}
            {researchers.filter(r => r.tubeCount > 0).length === 1 ? 'researcher' : 'researchers'}{' '}
            with tubes
          </Chip>
          {tubesWithoutResearcher > 0 && (
            <Chip color="warning" size="sm" lead={<TestTubeDiagonal />}>
              {tubesWithoutResearcher} {tubesWithoutResearcher === 1 ? 'tube' : 'tubes'} without
              researcher
            </Chip>
          )}
        </div>
        <AlertBanner variant="info" spacing="none" className="text-body-sm">
          Researchers can only be deleted with zero tubes and no linked user.
        </AlertBanner>
      </div>
    );
  }, [onTabFooter, researchers, tubesWithoutResearcher]);

  const deleteResearcher = (researcherId: string, researcherName: string) => {
    const researcher = researchers.find(r => r.id === researcherId);

    if (!researcher) {
      return;
    }

    // Check safety conditions
    if (researcher.tubeCount > 0) {
      notifications.error(`Cannot delete researcher with ${researcher.tubeCount} existing tubes`);
      return;
    }

    if (researcher.linkedUserId) {
      notifications.error(
        `Cannot delete researcher linked to user account "${researcher.linkedUsername}"`
      );
      return;
    }

    setConfirmDialog({ type: 'delete', researcherId, researcherName });
  };

  const handleToggleStatus = (researcher: AdminResearcher) => {
    if (researcher.active) {
      setConfirmDialog({
        type: 'deactivate',
        researcherId: researcher.id,
        researcherName: `${researcher.lastName}, ${researcher.firstName}`,
      });
      return;
    }

    setTogglingStatus(researcher.id);
    activateMutation.mutate(researcher.id, {
      onSuccess: () => {
        notifications.success(
          `Researcher "${researcher.lastName}, ${researcher.firstName}" reactivated`
        );
        onResearcherUpdate?.();
      },
      onSettled: () => {
        setTogglingStatus(null);
      },
    });
  };

  const executeDeactivateResearcher = (researcherId: string, researcherName: string) => {
    setTogglingStatus(researcherId);
    deactivateMutation.mutate(researcherId, {
      onSuccess: () => {
        notifications.success(`Researcher "${researcherName}" deactivated`);
        onResearcherUpdate?.();
      },
      onSettled: () => {
        setConfirmDialog(null);
        setTogglingStatus(null);
      },
    });
  };

  const executeDeleteResearcher = (researcherId: string, researcherName: string) => {
    setDeleting(researcherId);
    deleteMutation.mutate(researcherId, {
      onSuccess: () => {
        notifications.success(`Researcher "${researcherName}" deleted successfully`);
        onResearcherUpdate?.();
      },
      onSettled: () => {
        setConfirmDialog(null);
        setDeleting(null);
      },
    });
  };

  const canDelete = (researcher: AdminResearcher): boolean => {
    return researcher.tubeCount === 0 && !researcher.linkedUserId;
  };

  const getDeletionStatus = (researcher: AdminResearcher): string => {
    if (researcher.tubeCount > 0 && researcher.linkedUserId) {
      return `Has ${researcher.tubeCount} tubes and linked to user`;
    }
    if (researcher.tubeCount > 0) {
      return `Has ${researcher.tubeCount} tubes`;
    }
    if (researcher.linkedUserId) {
      return `Linked to user "${researcher.linkedUsername}"`;
    }
    return 'Can be deleted';
  };

  const handleCreateResearcher = async (data: CreateResearcherProfile) => {
    await createResearcherMutation.mutateAsync(data);
    onResearcherUpdate?.();
  };

  const sortedResearchers = useMemo(() => {
    if (!sortConfig) return researchers;

    return [...researchers].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      switch (sortConfig.columnId) {
        case 'researcher': {
          const nameA = `${a.lastName}, ${a.firstName}`.toLowerCase();
          const nameB = `${b.lastName}, ${b.firstName}`.toLowerCase();
          return nameA.localeCompare(nameB) * direction;
        }
        case 'tubes':
          return (a.tubeCount - b.tubeCount) * direction;
        default:
          return 0;
      }
    });
  }, [researchers, sortConfig]);

  const activeResearchers = useMemo(
    () => sortedResearchers.filter(r => r.active),
    [sortedResearchers]
  );
  const inactiveResearchers = useMemo(
    () => sortedResearchers.filter(r => !r.active),
    [sortedResearchers]
  );

  const researcherColumns: TableColumn<AdminResearcher>[] = [
    {
      id: 'researcher',
      header: 'Researcher',
      sortable: true,
      render: (_, researcher) => {
        return (
          <div className="flex items-center whitespace-nowrap">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center mr-2">
              <Dna size={14} className="text-secondary-foreground" />
            </div>
            <div>
              <div className="font-sans text-body-sm font-medium text-card-foreground">
                {researcher.lastName}, {researcher.firstName}
              </div>
              <div className="text-caption text-muted-foreground">{researcher.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'tubes',
      header: 'Tubes',
      sortable: true,
      render: (_, researcher) => {
        return (
          <Chip
            size="sm"
            color={researcher.tubeCount > 0 ? 'primary' : 'default'}
            className={researcher.tubeCount > 0 ? 'border border-action' : 'border border-border'}
            numeric
          >
            {researcher.tubeCount}
          </Chip>
        );
      },
    },
    {
      id: 'linkedUser',
      header: 'Linked User',
      render: (_, researcher) => (
        <LinkedPersonCell
          label={researcher.linkedUserId ? (researcher.linkedUsername ?? 'Linked') : null}
          deactivated={
            researcher.linkedUserStatus === 'deactivated' ||
            researcher.linkedUserStatus === 'suspended'
          }
          tone="card"
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (_, researcher) => {
        const isSelfResearcher = researcher.linkedUserId === currentUserId;
        return (
          <div className="flex items-center gap-1 whitespace-nowrap text-body-sm font-medium">
            <Tooltip
              content={
                isSelfResearcher
                  ? 'Cannot deactivate your own researcher profile'
                  : researcher.active
                    ? 'Deactivate researcher'
                    : 'Reactivate researcher'
              }
              side="bottom"
            >
              <Button
                variant="ghost-danger"
                size="xs"
                iconOnly
                onClick={() => handleToggleStatus(researcher)}
                disabled={isSelfResearcher || togglingStatus === researcher.id}
                isLoading={togglingStatus === researcher.id}
                aria-label={researcher.active ? 'Deactivate researcher' : 'Reactivate researcher'}
              >
                <Power size={16} />
              </Button>
            </Tooltip>
            <Tooltip
              content={!canDelete(researcher) ? getDeletionStatus(researcher) : 'Delete researcher'}
              side="bottom"
            >
              <Button
                variant="ghost-danger"
                size="xs"
                iconOnly
                onClick={() =>
                  deleteResearcher(researcher.id, `${researcher.lastName}, ${researcher.firstName}`)
                }
                disabled={!canDelete(researcher)}
                isLoading={deleting === researcher.id}
                aria-label="Delete researcher"
              >
                <Trash2 size={16} />
              </Button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-2">
      <Table
        columns={visibleColumns(researcherColumns, readOnly)}
        data={activeResearchers}
        hoverable
        sortable
        sortConfig={sortConfig}
        onSort={setSortConfig}
        loading={isLoading}
        emptyMessage="No researchers found"
        loadingMessage="Loading researchers..."
        aria-label="Researchers list"
        toolbar={
          readOnly
            ? undefined
            : {
                right: (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetch()}
                      isLoading={isFetching}
                      leftIcon={
                        <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                      }
                    >
                      Refresh
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowAddModal(true)}
                      leftIcon={<Plus size={14} />}
                    >
                      Add Researcher
                    </Button>
                  </>
                ),
              }
        }
      />

      {inactiveResearchers.length > 0 && (
        <CollapsibleInactiveSection
          label="Inactive Researchers"
          count={inactiveResearchers.length}
          variant="divider"
        >
          <Table
            columns={visibleColumns(researcherColumns, readOnly)}
            data={inactiveResearchers}
            emptyMessage=""
            aria-label="Inactive researchers"
            className="opacity-60"
          />
        </CollapsibleInactiveSection>
      )}

      <ResearcherModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="create-only"
        onSuccess={() => {}}
        onCreateResearcher={handleCreateResearcher}
        onLinkExisting={async () => {}}
      />

      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          variant="danger"
          title={confirmDialog.type === 'delete' ? 'Delete Researcher' : 'Deactivate Researcher'}
          message={
            confirmDialog.type === 'delete'
              ? `Are you sure you want to delete researcher "${confirmDialog.researcherName}"? This action cannot be undone.`
              : `Are you sure you want to deactivate researcher "${confirmDialog.researcherName}"? They will no longer appear in researcher dropdowns. This can be reversed.`
          }
          confirmText={confirmDialog.type === 'delete' ? 'Delete' : 'Deactivate'}
          onConfirm={() => {
            if (confirmDialog.type === 'delete') {
              executeDeleteResearcher(confirmDialog.researcherId, confirmDialog.researcherName);
            } else {
              executeDeactivateResearcher(confirmDialog.researcherId, confirmDialog.researcherName);
            }
          }}
          onCancel={() => setConfirmDialog(null)}
          isLoading={
            confirmDialog.type === 'delete'
              ? deleting === confirmDialog.researcherId
              : togglingStatus === confirmDialog.researcherId
          }
        />
      )}
    </div>
  );
}
