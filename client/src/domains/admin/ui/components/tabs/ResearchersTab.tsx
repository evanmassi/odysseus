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

import { useState, useEffect } from 'react';

import { sortByName } from '@odysseus/shared-schemas';
import { RefreshCw, Trash2, Plus, BadgeCheck, BadgeX, Info } from 'lucide-react';

import { logger } from '@shared/infrastructure/logger';
import { Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { ResearcherIcon } from '@shared/ui/components/icons';
import { notifications } from '@shared/utils';

import { adminService } from '../../../services/AdminService';
import { ResearcherModal } from '../ResearcherModal';

import type { AdminResearcher, CreateResearcherProfile } from '@odysseus/shared-schemas';

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

  return (
    <div className="space-y-2">
      {/* Header with Add and Refresh Buttons */}
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center space-x-2">
          <ResearcherIcon size={22} className="text-secondary-foreground" />
          <h3 className="text-xl font-semibold text-card-foreground">Researchers</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center space-x-2 text-sm"
          >
            <Plus size={14} />
            <span>Add Researcher</span>
          </button>
          <button
            onClick={loadResearchers}
            disabled={loading}
            className="btn-refresh flex items-center space-x-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Researchers Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-secondary-foreground">
                Researcher
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-secondary-foreground">
                Position
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-secondary-foreground">
                Tubes
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-secondary-foreground">
                Linked User
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-secondary-foreground">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-secondary-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {researchers.length > 0 ? (
              researchers.map(researcher => (
                <tr key={researcher.id} className="hover:bg-accent">
                  {/* Researcher Info Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center">
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
                  </td>

                  {/* Position Cell */}
                  <td className="px-3 py-2 whitespace-nowrap max-w-[150px]">
                    {researcher.position ? (
                      <Tooltip content={researcher.position} side="bottom">
                        <div className="text-sm text-card-foreground truncate">
                          {researcher.position}
                        </div>
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
                  </td>

                  {/* Tube Count Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        researcher.tubeCount === 0
                          ? 'bg-muted text-secondary-foreground'
                          : 'bg-muted text-action-hover border border-action/30'
                      }`}
                    >
                      {researcher.tubeCount}
                    </span>
                  </td>

                  {/* Linked User Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {researcher.linkedUserId ? (
                      <div>
                        <div className="text-sm font-medium text-card-foreground">
                          {researcher.linkedUsername}
                        </div>
                        <div className="text-xs text-muted-foreground">Linked</div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Active Status Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {researcher.active ? (
                      <Tooltip content="Active" side="bottom">
                        <span>
                          <BadgeCheck size={18} className="text-emerald-600" />
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip content="Inactive" side="bottom">
                        <span>
                          <BadgeX size={18} className="text-muted-foreground" />
                        </span>
                      </Tooltip>
                    )}
                  </td>

                  {/* Actions Cell */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                    <Tooltip
                      content={
                        !canDelete(researcher) ? getDeletionStatus(researcher) : 'Delete researcher'
                      }
                      side="bottom"
                    >
                      <button
                        onClick={() =>
                          deleteResearcher(
                            researcher.id,
                            `${researcher.lastName}, ${researcher.firstName}`
                          )
                        }
                        disabled={!canDelete(researcher) || deleting === researcher.id}
                        className="btn-danger-compact"
                      >
                        {deleting === researcher.id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {loading ? 'Loading researchers...' : 'No researchers found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
      <div className="flex items-center gap-2 px-3 py-2 bg-muted border-l-4 border-l-border rounded-lg shadow-sm">
        <Info size={16} className="text-muted-foreground flex-shrink-0" />
        <p className="text-xs text-secondary-foreground">
          Researchers can only be deleted with zero tubes and no linked user.
        </p>
      </div>

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
