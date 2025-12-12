/**
 * Researcher Management Tab Component
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
import { RefreshCw, AlertCircle, Trash2, Plus, BadgeCheck, BadgeX } from 'lucide-react';

import { logger } from '@shared/infrastructure/logger';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { ResearcherIcon } from '@shared/ui/components/icons';
import { notifications } from '@shared/utils';

import { adminService } from '../../../services/AdminService';
import { ResearcherModal } from '../ResearcherModal';

import type { AdminResearcher, CreateResearcherProfile } from '@odysseus/shared-schemas';

/**
 * ResearcherManagementTab Props Interface
 *
 * @interface ResearcherManagementTabProps
 */
export interface ResearcherManagementTabProps {
  /** Callback invoked when researcher list should be refreshed (after deletion, etc.) */
  onResearcherUpdate?: () => void;
}

/**
 * Researcher Management Tab Component
 *
 * Renders researcher management interface with table of researchers and deletion controls.
 * All researcher modifications (deletions) are performed via adminService.
 *
 * @param {ResearcherManagementTabProps} props - Component props
 * @returns {JSX.Element} Researcher management interface
 *
 * @example
 * ```tsx
 * <ResearcherManagementTab
 *   onResearcherUpdate={loadResearchers}
 * />
 * ```
 */
export function ResearcherManagementTab({ onResearcherUpdate }: ResearcherManagementTabProps) {
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
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
        <div className="flex items-center space-x-2">
          <ResearcherIcon size={22} className="text-gray-700" />
          <h3 className="text-xl font-semibold text-gray-900">Researcher Management</h3>
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
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                Researcher
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Position</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Tubes</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                Linked User
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {researchers.length > 0 ? (
              researchers.map(researcher => (
                <tr key={researcher.id} className="hover:bg-gray-50">
                  {/* Researcher Info Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                        <ResearcherIcon size={14} className="text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {researcher.lastName}, {researcher.firstName}
                        </div>
                        <div className="text-xs text-gray-500">{researcher.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Position Cell */}
                  <td className="px-3 py-2 whitespace-nowrap max-w-[150px]">
                    <div
                      className="text-sm text-gray-900 truncate"
                      title={researcher.position ?? undefined}
                    >
                      {researcher.position ?? '—'}
                    </div>
                    {researcher.department && (
                      <div className="text-xs text-gray-500 truncate" title={researcher.department}>
                        {researcher.department}
                      </div>
                    )}
                  </td>

                  {/* Tube Count Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        researcher.tubeCount === 0
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-frost text-action-hover border border-action/30'
                      }`}
                    >
                      {researcher.tubeCount}
                    </span>
                  </td>

                  {/* Linked User Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {researcher.linkedUserId ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {researcher.linkedUsername}
                        </div>
                        <div className="text-xs text-gray-500">Linked</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>

                  {/* Active Status Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {researcher.active ? (
                      <span title="Active">
                        <BadgeCheck size={18} className="text-green-600" />
                      </span>
                    ) : (
                      <span title="Inactive">
                        <BadgeX size={18} className="text-gray-400" />
                      </span>
                    )}
                  </td>

                  {/* Actions Cell */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() =>
                        deleteResearcher(
                          researcher.id,
                          `${researcher.lastName}, ${researcher.firstName}`
                        )
                      }
                      disabled={!canDelete(researcher) || deleting === researcher.id}
                      className="btn-danger-compact"
                      title={
                        !canDelete(researcher) ? getDeletionStatus(researcher) : 'Delete researcher'
                      }
                    >
                      {deleting === researcher.id ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">
                  {loading ? 'Loading researchers...' : 'No researchers found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Statistics Summary */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <span>Total Researchers:</span>
        <span className="font-semibold text-slate-700">{researchers.length}</span>
        <span className="text-slate-300">•</span>
        <span>With Tubes:</span>
        <span className="font-semibold text-slate-700">
          {researchers.filter(r => r.tubeCount > 0).length}
        </span>
        <span className="text-slate-300">•</span>
        <span>Linked to Users:</span>
        <span className="font-semibold text-slate-700">
          {researchers.filter(r => r.linkedUserId).length}
        </span>
      </div>

      {/* Safe Deletion Notice - Footnote */}
      <div className="p-2 bg-slate-50 rounded-lg">
        <div className="flex items-start space-x-1.5">
          <AlertCircle size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-snug">
            <strong className="text-slate-600">Safe Deletion:</strong> Researchers can only be
            deleted with zero tubes and no linked user.
          </p>
        </div>
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
