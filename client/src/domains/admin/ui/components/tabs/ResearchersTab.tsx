/**
 * Researchers Tab Component
 *
 * Provides admin interface for managing researcher profiles including:
 * - Viewing all researchers with metadata (tube counts, linked users)
 * - Deleting orphaned researchers (zero tubes + no linked user)
 * - Visual indicators for deletion eligibility
 *
 * Part of the Admin Settings modal tab system.
 *
 * @module admin/ui/components/tabs
 */

import { useState, useEffect, useMemo } from 'react';

import { sortByName } from '@odysseus/shared-schemas';
import { RefreshCw, Trash2, Plus, BadgeCheck, BadgeX } from 'lucide-react';

import { logger } from '@shared/infrastructure/logger';
import { AlertBanner, Button, Chip, Tooltip, Table } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { ResearcherIcon } from '@shared/ui/components/icons';
import { notifications } from '@shared/utils';

import { adminService } from '../../../services/AdminService';
import { ResearcherModal } from '../ResearcherModal';

import type { AdminResearcher, CreateResearcherProfile } from '@odysseus/shared-schemas';
import type { TableColumn, TableRow, SortConfig } from '@shared/ui';

/**
 * ResearchersTab Props Interface
 *
 * @interface ResearchersTabProps
 */
export interface ResearchersTabProps {
  /** Callback invoked when researcher list should be refreshed (after deletion, etc.) */
  onResearcherUpdate?: () => void;
}

/**
 * Researchers Tab Component
 *
 * Renders researcher management interface with table of researchers and deletion controls.
 * All researcher modifications (deletions) are performed via adminService.
 *
 * @param {ResearchersTabProps} props - Component props
 * @returns {JSX.Element} Researcher management interface
 *
 * @example
 * ```tsx
 * <ResearchersTab
 *   onResearcherUpdate={loadResearchers}
 * />
 * ```
 */
export function ResearchersTab({ onResearcherUpdate }: ResearchersTabProps) {
  const [researchers, setResearchers] = useState<AdminResearcher[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    researcherId: string;
    researcherName: string;
  } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined);

  /**
   * Load researchers on component mount
   */
  useEffect(() => {
    void loadResearchers();
  }, []);

  /**
   * Fetch all researchers with metadata
   */
  const loadResearchers = async () => {
    setLoading(true);
    try {
      const response = await adminService.getResearchers();
      if (response.success) {
        setResearchers(sortByName(response.researchers));
      }
    } catch (error) {
      logger.error('Failed to load researchers', { error });
      notifications.error('Failed to load researchers');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete researcher - opens confirmation dialog
   * Only allowed if researcher has zero tubes AND no linked user
   */
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

    setConfirmDialog({ researcherId, researcherName });
  };

  /**
   * Execute researcher deletion after confirmation
   */
  const executeDeleteResearcher = async (researcherId: string, researcherName: string) => {
    setDeleting(researcherId);
    try {
      const response = await adminService.deleteResearcher(researcherId);

      if (response.success) {
        notifications.success(`Researcher "${researcherName}" deleted successfully`);
        setConfirmDialog(null);
        await loadResearchers();
        onResearcherUpdate?.();
      } else {
        notifications.error('Failed to delete researcher');
        setConfirmDialog(null);
      }
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

  /**
   * Check if researcher can be safely deleted
   */
  const canDelete = (researcher: AdminResearcher): boolean => {
    return researcher.tubeCount === 0 && !researcher.linkedUserId;
  };

  /**
   * Get deletion status message
   */
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

  /**
   * Create new researcher
   */
  const handleCreateResearcher = async (data: CreateResearcherProfile) => {
    await adminService.createResearcher(data);
    await loadResearchers();
    onResearcherUpdate?.();
  };

  /**
   * Sort researchers based on current sort configuration
   */
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

  // Define table columns
  const researcherColumns: TableColumn<TableRow>[] = [
    {
      id: 'researcher',
      header: 'Researcher',
      sortable: true,
      render: (_, row) => {
        const researcher = row as unknown as AdminResearcher;
        return (
          <div className="flex items-center whitespace-nowrap">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center mr-2">
              <ResearcherIcon size={14} className="text-secondary-foreground" />
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
      render: (_, row) => {
        const researcher = row as unknown as AdminResearcher;
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
      render: (_, row) => {
        const researcher = row as unknown as AdminResearcher;
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
      render: (_, row) => {
        const researcher = row as unknown as AdminResearcher;
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
      render: (_, row) => {
        const researcher = row as unknown as AdminResearcher;
        if (researcher.active) {
          return (
            <Tooltip content="Active" side="bottom">
              <span className="whitespace-nowrap">
                <BadgeCheck size={18} className="text-success-text" />
              </span>
            </Tooltip>
          );
        }
        return (
          <Tooltip content="Inactive" side="bottom">
            <span className="whitespace-nowrap">
              <BadgeX size={18} className="text-muted-foreground" />
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (_, row) => {
        const researcher = row as unknown as AdminResearcher;
        return (
          <div className="whitespace-nowrap text-sm font-medium">
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
      {/* Header with Add and Refresh Buttons */}
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center space-x-2">
          <ResearcherIcon size={22} className="text-secondary-foreground" />
          <h3 className="text-xl font-semibold text-card-foreground">Researchers</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus size={14} />}
          >
            Add Researcher
          </Button>
          <Button
            variant="secondary"
            onClick={loadResearchers}
            isLoading={loading}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Researchers Table */}
      <Table
        columns={researcherColumns}
        data={sortedResearchers as TableRow[]}
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

      {/* Statistics Summary */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>Total Researchers:</span>
        <span className="font-semibold text-secondary-foreground">{researchers.length}</span>
        <span className="text-border">•</span>
        <span>With Tubes:</span>
        <span className="font-semibold text-secondary-foreground">
          {researchers.filter(r => r.tubeCount > 0).length}
        </span>
        <span className="text-border">•</span>
        <span>Linked to Users:</span>
        <span className="font-semibold text-secondary-foreground">
          {researchers.filter(r => r.linkedUserId).length}
        </span>
      </div>

      {/* Safe Deletion Notice - Footnote */}
      <AlertBanner variant="info" spacing="none" className="text-xs">
        Researchers can only be deleted with zero tubes and no linked user.
      </AlertBanner>

      {/* Add Researcher Modal */}
      <ResearcherModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="create-only"
        onSuccess={() => {}}
        onCreateResearcher={handleCreateResearcher}
        onLinkExisting={async () => {}}
      />

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          variant="danger"
          title="Delete Researcher"
          message={`Are you sure you want to delete researcher "${confirmDialog.researcherName}"? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={() => {
            void executeDeleteResearcher(confirmDialog.researcherId, confirmDialog.researcherName);
          }}
          onCancel={() => setConfirmDialog(null)}
          isLoading={deleting === confirmDialog.researcherId}
        />
      )}
    </div>
  );
}
