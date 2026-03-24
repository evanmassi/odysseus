/**
 * Researchers Tab
 *
 * Admin interface for researcher profiles, status management, and deletion.
 */

import React, { useState, useEffect, useMemo } from 'react';

import { sortByName } from '@odysseus/shared-schemas';
import {
  RefreshCw,
  Trash2,
  Plus,
  CircleCheckBig,
  OctagonX,
  Clock,
  Dna,
  TestTube,
  Link,
  Power,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { logger } from '@infra/logger';
import { AlertBanner, Button, Chip, Tooltip, Table } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import { adminResearcherService } from '../../../../services/AdminResearcherService';
import { ResearcherModal } from '../ResearcherModal';

import type { AdminResearcher, CreateResearcherProfile } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui';

export interface ResearchersTabProps {
  onResearcherUpdate?: () => void;
  onTabFooter?: (footer: React.ReactNode) => void;
  readOnly?: boolean;
}

export function ResearchersTab({
  onResearcherUpdate,
  onTabFooter,
  readOnly = false,
}: ResearchersTabProps) {
  const [researchers, setResearchers] = useState<AdminResearcher[]>([]);
  const [totalTubeCount, setTotalTubeCount] = useState(0);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    void loadResearchers();
  }, []);

  const tubesWithoutResearcher =
    totalTubeCount - researchers.reduce((sum, r) => sum + r.tubeCount, 0);

  useEffect(() => {
    onTabFooter?.(
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Chip color="info" size="sm" leftIcon={<Dna />}>
            {researchers.length} {researchers.length === 1 ? 'researcher' : 'researchers'}
          </Chip>
          <Chip color="info" size="sm" leftIcon={<Link />}>
            {researchers.filter(r => r.linkedUserId).length} linked to users
          </Chip>
          <Chip color="info" size="sm" leftIcon={<TestTube />}>
            {researchers.filter(r => r.tubeCount > 0).length}{' '}
            {researchers.filter(r => r.tubeCount > 0).length === 1 ? 'researcher' : 'researchers'}{' '}
            with tubes
          </Chip>
          {tubesWithoutResearcher > 0 && (
            <Chip color="warning" size="sm" leftIcon={<TestTube />}>
              {tubesWithoutResearcher} {tubesWithoutResearcher === 1 ? 'tube' : 'tubes'} without
              researcher
            </Chip>
          )}
          {researchers.filter(r => r.approvalStatus === 'pending').length > 0 && (
            <Chip color="warning" size="sm" leftIcon={<Clock />}>
              {researchers.filter(r => r.approvalStatus === 'pending').length} pending approval
            </Chip>
          )}
        </div>
        <AlertBanner variant="info" spacing="none" className="text-xs">
          Researchers can only be deleted with zero tubes and no linked user.
        </AlertBanner>
      </div>
    );
  }, [onTabFooter, researchers, tubesWithoutResearcher]);

  const loadResearchers = async () => {
    setLoading(true);
    try {
      const data = await adminResearcherService.getResearchers();
      setResearchers(sortByName(data.researchers));
      setTotalTubeCount(data.totalTubeCount ?? 0);
    } catch (error) {
      logger.error('Failed to load researchers', { error });
      notifications.error('Failed to load researchers');
    } finally {
      setLoading(false);
    }
  };

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

  const handleToggleStatus = async (researcher: AdminResearcher) => {
    if (researcher.active) {
      setConfirmDialog({
        type: 'deactivate',
        researcherId: researcher.id,
        researcherName: `${researcher.lastName}, ${researcher.firstName}`,
      });
      return;
    }

    setTogglingStatus(researcher.id);
    try {
      await adminResearcherService.activateResearcher(researcher.id);
      notifications.success(
        `Researcher "${researcher.lastName}, ${researcher.firstName}" reactivated`
      );
      await loadResearchers();
      onResearcherUpdate?.();
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to activate researcher';
      notifications.error(errorMessage);
    } finally {
      setTogglingStatus(null);
    }
  };

  const executeDeactivateResearcher = async (researcherId: string, researcherName: string) => {
    setTogglingStatus(researcherId);
    try {
      await adminResearcherService.deactivateResearcher(researcherId);
      notifications.success(`Researcher "${researcherName}" deactivated`);
      setConfirmDialog(null);
      await loadResearchers();
      onResearcherUpdate?.();
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to deactivate researcher';
      notifications.error(errorMessage);
      setConfirmDialog(null);
    } finally {
      setTogglingStatus(null);
    }
  };

  const executeDeleteResearcher = async (researcherId: string, researcherName: string) => {
    setDeleting(researcherId);
    try {
      await adminResearcherService.deleteResearcher(researcherId);
      notifications.success(`Researcher "${researcherName}" deleted successfully`);
      setConfirmDialog(null);
      await loadResearchers();
      onResearcherUpdate?.();
    } catch (error: unknown) {
      logger.error('Failed to delete researcher', { error });

      // Extract error message from API response
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to delete researcher';
      notifications.error(errorMessage);
      setConfirmDialog(null);
    } finally {
      setDeleting(null);
    }
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
    await adminResearcherService.createResearcher(data);
    await loadResearchers();
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
        case 'status':
          return ((a.active ? 1 : 0) - (b.active ? 1 : 0)) * direction;
        default:
          return 0;
      }
    });
  }, [researchers, sortConfig]);

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
              <div className="text-sm font-medium text-card-foreground">
                {researcher.lastName}, {researcher.firstName}
              </div>
              <div className="text-xs text-muted-foreground">{researcher.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'position',
      header: 'Position',
      render: (_, researcher) => {
        return (
          <div className="whitespace-nowrap max-w-[150px]">
            {researcher.position ? (
              <Tooltip content={researcher.position} side="bottom">
                <div className="text-sm text-card-foreground truncate">{researcher.position}</div>
              </Tooltip>
            ) : (
              <div className="text-sm text-card-foreground truncate">—</div>
            )}
            {researcher.department && (
              <Tooltip content={researcher.department} side="bottom">
                <div className="text-xs text-muted-foreground truncate">
                  {researcher.department}
                </div>
              </Tooltip>
            )}
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
          >
            {researcher.tubeCount}
          </Chip>
        );
      },
    },
    {
      id: 'linkedUser',
      header: 'Linked User',
      render: (_, researcher) => {
        if (researcher.linkedUserId) {
          return (
            <div className="whitespace-nowrap">
              <div className="text-sm font-medium text-card-foreground">
                {researcher.linkedUsername}
              </div>
              <div className="text-xs text-muted-foreground">Linked</div>
            </div>
          );
        }
        return <span className="text-sm text-muted-foreground whitespace-nowrap">—</span>;
      },
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      render: (_, researcher) => {
        // Pending approval takes precedence (researcher not yet vetted)
        if (researcher.approvalStatus === 'pending') {
          return (
            <Tooltip content="Pending Approval - Linked user not yet approved" side="bottom">
              <span className="whitespace-nowrap">
                <Clock size={18} className="text-warning-text" />
              </span>
            </Tooltip>
          );
        }

        if (researcher.active) {
          return (
            <Tooltip content="Active" side="bottom">
              <span className="whitespace-nowrap">
                <CircleCheckBig size={18} className="text-success-text" />
              </span>
            </Tooltip>
          );
        }
        return (
          <Tooltip content="Deactivated" side="bottom">
            <span className="whitespace-nowrap">
              <OctagonX size={18} className="text-danger-text" />
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (_, researcher) => {
        const isSelfResearcher = researcher.linkedUserId === currentUserId;
        return (
          <div className="flex items-center gap-1 whitespace-nowrap text-sm font-medium">
            <Tooltip
              content={
                researcher.approvalStatus === 'pending'
                  ? 'Cannot toggle pending researcher'
                  : isSelfResearcher
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
                onClick={() => void handleToggleStatus(researcher)}
                disabled={
                  researcher.approvalStatus === 'pending' ||
                  isSelfResearcher ||
                  togglingStatus === researcher.id
                }
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
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center space-x-2">
          <Dna size={22} className="text-secondary-foreground" />
          <h3 className="text-xl font-semibold text-card-foreground">Researchers</h3>
        </div>
        {!readOnly && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadResearchers}
              isLoading={loading}
              leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
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
          </div>
        )}
      </div>

      <Table
        columns={readOnly ? researcherColumns.filter(c => c.id !== 'actions') : researcherColumns}
        data={sortedResearchers}
        size="sm"
        variant="default"
        hoverable
        rounded="lg"
        sortable
        sortConfig={sortConfig}
        onSort={setSortConfig}
        loading={loading}
        emptyMessage="No researchers found"
        loadingMessage="Loading researchers..."
        aria-label="Researchers list"
      />

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
              void executeDeleteResearcher(
                confirmDialog.researcherId,
                confirmDialog.researcherName
              );
            } else {
              void executeDeactivateResearcher(
                confirmDialog.researcherId,
                confirmDialog.researcherName
              );
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
