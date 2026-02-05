/**
 * Users Tab Component
 *
 * Provides admin interface for managing users including:
 * - Viewing all users with details (username, role, last activity)
 * - Changing user roles (admin/user)
 * - Deleting users
 * - Creating invite codes for new users
 *
 * Part of the Admin Settings modal tab system.
 *
 * @module admin/ui/components/tabs
 */

import { useState, useEffect, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  UserRound,
  CheckCircle,
  XCircle,
  Clock,
  UserRoundCheck,
  Unlink2,
  Trash2,
  Link2,
  UsersRound,
  KeyRound,
} from 'lucide-react';

import { queryKeys } from '@app/queryKeys';
import { logger } from '@shared/infrastructure/logger';
import { Button, Chip, Select, Tooltip, Table } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { notifications } from '@shared/utils';

import { useDeleteUserMutation } from '../../../hooks/useUserMutations';
import { adminService } from '../../../services/AdminService';
import { PasswordResetModal } from '../PasswordResetModal';
import { ResearcherModal } from '../ResearcherModal';

import type { AdminUser, CreateResearcherProfile, AdminResearcher } from '@odysseus/shared-schemas';
import type { TableColumn, TableRow, SortConfig } from '@shared/ui';

// Role dropdown options
const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];

/**
 * UsersTab Props Interface
 *
 * @interface UsersTabProps
 */
export interface UsersTabProps {
  /** Array of users to display in the table */
  users: AdminUser[];

  /** Callback invoked when user list should be refreshed (after role change, deletion, etc.) */
  onUserUpdate: () => void;
}

/**
 * Users Tab Component
 *
 * Renders user management interface with table of users and invite code section.
 * All user modifications (role changes, deletions) are performed via adminService
 * and trigger onUserUpdate callback to refresh the list.
 *
 * @param {UsersTabProps} props - Component props
 * @returns {JSX.Element} User management interface
 *
 * @example
 * ```tsx
 * <UsersTab
 *   users={users}
 *   onUserUpdate={loadUsers}
 * />
 * ```
 */
export function UsersTab({ users = [], onUserUpdate }: UsersTabProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [_loadingPending, setLoadingPending] = useState(false);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  // Modal state: separate data from visibility for exit animations
  const [researcherModalData, setResearcherModalData] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [isResearcherModalOpen, setIsResearcherModalOpen] = useState(false);
  const [unlinkedResearchers, setUnlinkedResearchers] = useState<AdminResearcher[]>([]);

  const [passwordResetModalData, setPasswordResetModalData] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'delete' | 'reject' | 'unlink';
    userId: string;
    username: string;
  } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined);

  // Mutation hook for user deletion
  // Handles cache invalidation for users list and storage configuration
  const deleteUserMutation = useDeleteUserMutation();
  const queryClient = useQueryClient();

  /**
   * Load pending users on component mount and when user list updates
   */
  useEffect(() => {
    void loadPendingUsers();
  }, [users]);

  /**
   * Fetch all pending users awaiting approval
   */
  const loadPendingUsers = async () => {
    setLoadingPending(true);
    try {
      const response = await adminService.getPendingUsers();
      if (response.success) {
        setPendingUsers(response.users);
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to load pending users', { error });
    } finally {
      setLoadingPending(false);
    }
  };

  /**
   * Update user role (admin/user)
   * Shows loading state during update and refreshes list on success
   */
  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    setUpdating(userId);
    try {
      const response = await adminService.updateUserRole(userId, newRole);

      if (response.success) {
        notifications.success(`User role updated to ${newRole}`);
        onUserUpdate(); // Refresh user list
      } else {
        notifications.error('Failed to update user role');
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to update user role', { error });
      notifications.error('Failed to update user role');
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Delete user - opens confirmation dialog
   */
  const handleDeleteUser = (userId: string, username: string) => {
    setConfirmDialog({ type: 'delete', userId, username });
  };

  /**
   * Execute user deletion after confirmation
   * Uses mutation hook for proper cache invalidation (users list + storage config)
   */
  const executeDeleteUser = (userId: string, username: string) => {
    deleteUserMutation.mutate(userId, {
      onSuccess: () => {
        notifications.success(`User "${username}" deleted successfully`);
        setConfirmDialog(null);
        onUserUpdate();
      },
      onError: () => {
        notifications.error('Failed to delete user');
        setConfirmDialog(null);
      },
    });
  };

  /**
   * Approve pending user
   * User gains access to the system after approval
   */
  const approveUser = async (userId: string, username: string) => {
    setProcessingApproval(userId);
    try {
      const response = await adminService.approveUser(userId);

      if (response.success) {
        notifications.success(`User "${username}" approved successfully`);
        await loadPendingUsers();
        onUserUpdate();
        // Invalidate researchers cache - approving user also approves linked researcher
        void queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });
      } else {
        notifications.error('Failed to approve user');
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to approve user', { error });
      notifications.error('Failed to approve user');
    } finally {
      setProcessingApproval(null);
    }
  };

  /**
   * Reject pending user - opens confirmation dialog
   */
  const rejectUser = (userId: string, username: string) => {
    setConfirmDialog({ type: 'reject', userId, username });
  };

  /**
   * Execute user rejection after confirmation
   * User is denied access to the system
   */
  const executeRejectUser = async (userId: string, username: string) => {
    setProcessingApproval(userId);
    try {
      const response = await adminService.rejectUser(userId);

      if (response.success) {
        notifications.success(`User "${username}" rejected`);
        setConfirmDialog(null);
        await loadPendingUsers();
        onUserUpdate();
      } else {
        notifications.error('Failed to reject user');
        setConfirmDialog(null);
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to reject user', { error });
      notifications.error('Failed to reject user');
      setConfirmDialog(null);
    } finally {
      setProcessingApproval(null);
    }
  };

  /**
   * Unlink researcher profile from user - opens confirmation dialog
   */
  const unlinkResearcher = (userId: string, username: string) => {
    setConfirmDialog({ type: 'unlink', userId, username });
  };

  /**
   * Execute unlink after confirmation
   * Preserves researcher record for tube history
   */
  const executeUnlinkResearcher = async (userId: string, username: string) => {
    setUpdating(userId);
    try {
      const response = await adminService.unlinkResearcherFromUser(userId);

      if (response.success) {
        notifications.success(`Researcher unlinked from "${username}"`);
        setConfirmDialog(null);
        onUserUpdate();
      } else {
        notifications.error('Failed to unlink researcher');
        setConfirmDialog(null);
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to unlink researcher', { error });
      notifications.error('Failed to unlink researcher');
      setConfirmDialog(null);
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Open link researcher modal
   */
  const openLinkModal = async (user: { id: string; username: string }) => {
    setResearcherModalData(user);
    setIsResearcherModalOpen(true);
    // Load unlinked researchers
    try {
      const response = await adminService.getUnlinkedResearchers();
      if (response.success) {
        setUnlinkedResearchers(response.researchers);
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging needed for debugging production issues
      logger.error('Failed to load unlinked researchers', { error });
      notifications.error('Failed to load available researchers');
    }
  };

  /**
   * Link existing researcher to user
   */
  const handleLinkExisting = async (researcherId: string) => {
    if (!researcherModalData) return;

    await adminService.linkResearcherToUser(researcherModalData.id, researcherId);
    await onUserUpdate(); // Make sure to await the update
  };

  /**
   * Create new researcher and link to user
   */
  const handleCreateAndLink = async (data: CreateResearcherProfile) => {
    if (!researcherModalData) return;

    await adminService.createAndLinkResearcher(researcherModalData.id, data);
    await onUserUpdate(); // Make sure to await the update
  };

  /**
   * Sort users based on current sort configuration
   */
  const sortedUsers = useMemo(() => {
    if (!sortConfig) return users;

    return [...users].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      switch (sortConfig.columnId) {
        case 'user': {
          const nameA = (a.lastName ?? a.username).toLowerCase();
          const nameB = (b.lastName ?? b.username).toLowerCase();
          return nameA.localeCompare(nameB) * direction;
        }
        case 'role':
          return (a.role ?? 'user').localeCompare(b.role ?? 'user') * direction;
        case 'lastActivity': {
          const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          return (dateA - dateB) * direction;
        }
        default:
          return 0;
      }
    });
  }, [users, sortConfig]);

  // Define table columns
  const userColumns: TableColumn<TableRow>[] = [
    {
      id: 'user',
      header: 'User',
      sortable: true,
      render: (_, row) => {
        const user = row as unknown as AdminUser;
        return (
          <div className="flex items-center whitespace-nowrap">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center mr-2">
              <UserRound size={14} className="text-secondary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-card-foreground">
                  {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Intentionally using || to treat empty strings as falsy */}
                  {user.lastName || user.firstName
                    ? `${user.lastName ?? ''}${user.lastName && user.firstName ? ', ' : ''}${user.firstName ?? ''}`
                    : user.username}
                </span>
                {user.role === 'admin' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-secondary-foreground">
                    Admin
                  </span>
                )}
                {user.requirePasswordChange && (
                  <Tooltip content="Password change required on next login" side="bottom">
                    <span className="text-warning-text text-xs flex items-center gap-0.5">⚠️</span>
                  </Tooltip>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{user.username}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'role',
      header: 'Role',
      sortable: true,
      render: (_, row) => {
        const user = row as unknown as AdminUser;
        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="w-24">
              <Select
                value={user.role ?? 'user'}
                onChange={newValue => {
                  if (newValue && typeof newValue === 'string') {
                    void updateUserRole(user.id, newValue as 'admin' | 'user');
                  }
                }}
                options={ROLE_OPTIONS}
                disabled={updating === user.id}
                size="sm"
                fullWidth
              />
            </div>
            {updating === user.id && (
              <RefreshCw size={12} className="animate-spin text-muted-foreground" />
            )}
          </div>
        );
      },
    },
    {
      id: 'researcher',
      header: 'Researcher',
      render: (_, row) => {
        const user = row as unknown as AdminUser;
        if (user.researcherId) {
          return (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
              <span>Linked</span>
              <UserRoundCheck size={14} className="text-success-text flex-shrink-0" />
            </div>
          );
        }
        return (
          <Chip size="sm" color="default">
            None
          </Chip>
        );
      },
    },
    {
      id: 'lastActivity',
      header: 'Last Active',
      sortable: true,
      render: (_, row) => {
        const user = row as unknown as AdminUser;
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (_, row) => {
        const user = row as unknown as AdminUser;
        return (
          <div className="flex items-center gap-1 whitespace-nowrap text-sm font-medium">
            <Tooltip content="Reset password" side="bottom">
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                onClick={() => {
                  setPasswordResetModalData({ userId: user.id, username: user.username });
                  setIsPasswordResetModalOpen(true);
                }}
                aria-label="Reset password"
              >
                <KeyRound size={16} />
              </Button>
            </Tooltip>
            {user.researcherId ? (
              <Tooltip content="Unlink researcher" side="bottom">
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  onClick={() => unlinkResearcher(user.id, user.username)}
                  aria-label="Unlink researcher"
                >
                  <Unlink2 size={16} />
                </Button>
              </Tooltip>
            ) : (
              <Tooltip content="Link researcher" side="bottom">
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  onClick={() => openLinkModal({ id: user.id, username: user.username })}
                  aria-label="Link researcher"
                >
                  <Link2 size={16} />
                </Button>
              </Tooltip>
            )}
            <Tooltip content="Delete user" side="bottom">
              <Button
                variant="ghost-danger"
                size="xs"
                iconOnly
                onClick={() => handleDeleteUser(user.id, user.username)}
                isLoading={deleteUserMutation.isPending}
                aria-label="Delete user"
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
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center space-x-2">
          <UsersRound size={22} className="text-secondary-foreground" />
          <h3 className="text-xl font-semibold text-card-foreground">Users</h3>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            onUserUpdate();
            void loadPendingUsers();
          }}
          leftIcon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      {/* Pending Approvals Section */}
      {pendingUsers.length > 0 && (
        <div className="bg-muted border-l-4 border-l-warning-border rounded-lg shadow-sm p-3">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-warning-text flex-shrink-0" />
            <h4 className="text-sm font-medium text-warning-text">
              Pending Approvals ({pendingUsers.length})
            </h4>
          </div>

          <div className="space-y-2">
            {pendingUsers.map(user => (
              <div
                key={user.id}
                className="bg-card/70 rounded-md p-2.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-warning-light-hover flex items-center justify-center">
                    <UserRound size={14} className="text-warning-text" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-card-foreground">{user.username}</div>
                    <div className="text-xs text-muted-foreground">
                      Registered {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="success"
                    size="xs"
                    onClick={() => approveUser(user.id, user.username)}
                    isLoading={processingApproval === user.id}
                    leftIcon={<CheckCircle size={12} />}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() => rejectUser(user.id, user.username)}
                    disabled={processingApproval === user.id}
                    leftIcon={<XCircle size={12} />}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users Table */}
      <Table
        columns={userColumns}
        data={(sortedUsers ?? []) as TableRow[]}
        size="sm"
        variant="default"
        hoverable
        rounded="lg"
        sortable
        sortConfig={sortConfig}
        onSort={setSortConfig}
        emptyMessage="No users found"
        aria-label="Users list"
      />

      {/* Link Researcher Modal */}
      {researcherModalData && (
        <ResearcherModal
          isOpen={isResearcherModalOpen}
          onClose={() => {
            setIsResearcherModalOpen(false);
            setUnlinkedResearchers([]);
          }}
          mode="select-or-create"
          username={researcherModalData.username}
          unlinkedResearchers={unlinkedResearchers}
          onSuccess={() => {}}
          onCreateResearcher={handleCreateAndLink}
          onLinkExisting={handleLinkExisting}
        />
      )}

      {/* Password Reset Modal */}
      {passwordResetModalData && (
        <PasswordResetModal
          isOpen={isPasswordResetModalOpen}
          userId={passwordResetModalData.userId}
          username={passwordResetModalData.username}
          onClose={() => setIsPasswordResetModalOpen(false)}
          onSuccess={() => {
            setIsPasswordResetModalOpen(false);
            onUserUpdate();
          }}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          variant={confirmDialog.type === 'unlink' ? 'warning' : 'danger'}
          title={
            confirmDialog.type === 'delete'
              ? 'Delete User'
              : confirmDialog.type === 'reject'
                ? 'Reject User'
                : 'Unlink Researcher'
          }
          message={
            confirmDialog.type === 'delete'
              ? `Are you sure you want to delete user "${confirmDialog.username}"? This action cannot be undone.`
              : confirmDialog.type === 'reject'
                ? `Are you sure you want to reject user "${confirmDialog.username}"? They will not be able to access the system.`
                : `Unlink researcher profile from "${confirmDialog.username}"? The researcher record will be preserved for tube history.`
          }
          confirmText={
            confirmDialog.type === 'delete'
              ? 'Delete'
              : confirmDialog.type === 'reject'
                ? 'Reject'
                : 'Unlink'
          }
          onConfirm={() => {
            if (confirmDialog.type === 'delete') {
              executeDeleteUser(confirmDialog.userId, confirmDialog.username);
            } else if (confirmDialog.type === 'reject') {
              void executeRejectUser(confirmDialog.userId, confirmDialog.username);
            } else {
              void executeUnlinkResearcher(confirmDialog.userId, confirmDialog.username);
            }
          }}
          onCancel={() => setConfirmDialog(null)}
          isLoading={
            confirmDialog.type === 'delete'
              ? deleteUserMutation.isPending
              : confirmDialog.type === 'reject'
                ? processingApproval === confirmDialog.userId
                : updating === confirmDialog.userId
          }
        />
      )}
    </div>
  );
}
