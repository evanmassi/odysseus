/**
 * User Management Tab Component
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

import { useState, useEffect } from 'react';
import { RefreshCw, UserRound, CheckCircle, XCircle, Clock, UserRoundCheck, Unlink2, Trash2, Link2, UsersRound, KeyRound } from 'lucide-react';
import { adminService } from '../../../services/AdminService';
import { notifications } from '@shared/utils';
import type { AdminUser, CreateResearcherProfile, AdminResearcher } from '@odysseus/shared-schemas';
import { ResearcherModal } from '../ResearcherModal';
import { PasswordResetModal } from '../PasswordResetModal';

/**
 * UserManagementTab Props Interface
 *
 * @interface UserManagementTabProps
 */
export interface UserManagementTabProps {
  /** Array of users to display in the table */
  users: AdminUser[];

  /** Callback invoked when user list should be refreshed (after role change, deletion, etc.) */
  onUserUpdate: () => void;

  /** Current invite code for new users */
  inviteCode: string;

  /** Callback invoked to create new invite code */
  onCreateInvite: (role: 'admin' | 'user') => void;
}

/**
 * User Management Tab Component
 *
 * Renders user management interface with table of users and invite code section.
 * All user modifications (role changes, deletions) are performed via adminService
 * and trigger onUserUpdate callback to refresh the list.
 *
 * @param {UserManagementTabProps} props - Component props
 * @returns {JSX.Element} User management interface
 *
 * @example
 * ```tsx
 * <UserManagementTab
 *   users={users}
 *   onUserUpdate={loadUsers}
 *   inviteCode={inviteCode}
 *   onCreateInvite={createInviteCode}
 * />
 * ```
 */
export function UserManagementTab({
  users = [],
  onUserUpdate,
  inviteCode,
  onCreateInvite,
}: UserManagementTabProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  const [linkingUser, setLinkingUser] = useState<{ id: string; username: string } | null>(null);
  const [unlinkedResearchers, setUnlinkedResearchers] = useState<AdminResearcher[]>([]);
  const [passwordResetModal, setPasswordResetModal] = useState<{ userId: string; username: string } | null>(null);

  /**
   * Load pending users on component mount and when user list updates
   */
  useEffect(() => {
    loadPendingUsers();
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
      console.error('Failed to load pending users:', error);
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
      console.error('Failed to update user role:', error);
      notifications.error('Failed to update user role');
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Delete user with confirmation
   * Prompts for confirmation before deletion and refreshes list on success
   */
  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await adminService.deleteUser(userId);

      if (response.success) {
        notifications.success(`User "${username}" deleted successfully`);
        onUserUpdate();
      } else {
        notifications.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      notifications.error('Failed to delete user');
    }
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
      } else {
        notifications.error('Failed to approve user');
      }
    } catch (error) {
      console.error('Failed to approve user:', error);
      notifications.error('Failed to approve user');
    } finally {
      setProcessingApproval(null);
    }
  };

  /**
   * Reject pending user
   * User is denied access to the system
   */
  const rejectUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to reject user "${username}"? They will not be able to access the system.`)) {
      return;
    }

    setProcessingApproval(userId);
    try {
      const response = await adminService.rejectUser(userId);

      if (response.success) {
        notifications.success(`User "${username}" rejected`);
        await loadPendingUsers();
        onUserUpdate();
      } else {
        notifications.error('Failed to reject user');
      }
    } catch (error) {
      console.error('Failed to reject user:', error);
      notifications.error('Failed to reject user');
    } finally {
      setProcessingApproval(null);
    }
  };

  /**
   * Unlink researcher profile from user
   * Preserves researcher record for tube history
   */
  const unlinkResearcher = async (userId: string, username: string) => {
    if (!confirm(`Unlink researcher profile from "${username}"? The researcher record will be preserved for tube history.`)) {
      return;
    }

    setUpdating(userId);
    try {
      const response = await adminService.unlinkResearcherFromUser(userId);

      if (response.success) {
        notifications.success(`Researcher unlinked from "${username}"`);
        onUserUpdate();
      } else {
        notifications.error('Failed to unlink researcher');
      }
    } catch (error) {
      console.error('Failed to unlink researcher:', error);
      notifications.error('Failed to unlink researcher');
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Open link researcher modal
   */
  const openLinkModal = async (user: { id: string; username: string }) => {
    setLinkingUser(user);
    // Load unlinked researchers
    try {
      const response = await adminService.getUnlinkedResearchers();
      if (response.success) {
        setUnlinkedResearchers(response.researchers);
      }
    } catch (error) {
      console.error('Failed to load unlinked researchers:', error);
      notifications.error('Failed to load available researchers');
    }
  };

  /**
   * Link existing researcher to user
   */
  const handleLinkExisting = async (researcherId: string) => {
    if (!linkingUser) return;

    console.log('[DEBUG] Linking researcher to user:', {
      userId: linkingUser.id,
      username: linkingUser.username,
      researcherId
    });

    await adminService.linkResearcherToUser(linkingUser.id, researcherId);
    await onUserUpdate(); // Make sure to await the update
  };

  /**
   * Create new researcher and link to user
   */
  const handleCreateAndLink = async (data: CreateResearcherProfile) => {
    if (!linkingUser) return;

    console.log('[DEBUG] Creating and linking researcher to user:', {
      userId: linkingUser.id,
      username: linkingUser.username,
      researcherData: data
    });

    await adminService.createAndLinkResearcher(linkingUser.id, data);
    await onUserUpdate(); // Make sure to await the update
  };

  return (
    <div className="space-y-2">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
        <div className="flex items-center space-x-2">
          <UsersRound size={22} className="text-gray-700" />
          <h3 className="text-xl font-semibold text-gray-900">User Management</h3>
        </div>
        <button
          onClick={() => {
            onUserUpdate();
            loadPendingUsers();
          }}
          className="btn-refresh flex items-center space-x-2"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Pending Approvals Section */}
      {pendingUsers.length > 0 && (
        <div className="alert-warning p-2">
          <div className="flex items-center space-x-1.5 mb-2">
            <Clock size={14} className="alert-warning-icon" />
            <h4 className="text-xs font-semibold alert-warning-heading">
              Pending Approvals ({pendingUsers.length})
            </h4>
          </div>

          <div className="space-y-2">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white border border-warning-border rounded-lg p-2 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-warning-light flex items-center justify-center">
                    <UserRound size={14} className="alert-warning-icon" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    <div className="text-xs text-gray-500">
                      Registered {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => approveUser(user.id, user.username)}
                    disabled={processingApproval === user.id}
                    className="btn-approve-compact flex items-center space-x-1"
                  >
                    {processingApproval === user.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle size={12} />
                    )}
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => rejectUser(user.id, user.username)}
                    disabled={processingApproval === user.id}
                    className="btn-danger-compact flex items-center space-x-1"
                  >
                    {processingApproval === user.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <XCircle size={12} />
                    )}
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Linked Researcher
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Active
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(users?.length ?? 0) > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  {/* User Info Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                        <UserRound size={14} className="text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-900">{user.username}</span>
                          {user.requirePasswordChange && (
                            <span
                              className="text-warning-text text-xs flex items-center gap-0.5"
                              title="Password change required on next login"
                            >
                              ⚠️
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">{user.id}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role Select Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <select
                      value={user.role || 'user'}
                      onChange={(e) => updateUserRole(user.id, e.target.value as 'admin' | 'user')}
                      disabled={updating === user.id}
                      className="select-sm px-1.5 py-0.5"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    {updating === user.id && (
                      <RefreshCw size={12} className="inline ml-2 animate-spin text-gray-400" />
                    )}
                  </td>

                  {/* Researcher Status Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {user.researcherId ? (
                      <div className="flex items-center space-x-1 text-sm text-gray-900">
                        <span>Linked</span>
                        <UserRoundCheck size={14} className="text-green-600 flex-shrink-0" />
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        None
                      </span>
                    )}
                  </td>

                  {/* Last Activity Cell */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never'}
                  </td>

                  {/* Actions Cell */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPasswordResetModal({ userId: user.id, username: user.username })}
                        className="btn-password-compact flex items-center space-x-1"
                        title="Reset password"
                      >
                        <KeyRound size={12} />
                        <span>Reset Password</span>
                      </button>
                      {user.researcherId ? (
                        <button
                          onClick={() => unlinkResearcher(user.id, user.username)}
                          className="btn-primary-compact flex items-center space-x-1"
                        >
                          <Unlink2 size={12} />
                          <span>Unlink</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openLinkModal({ id: user.id, username: user.username })}
                          className="btn-primary-compact flex items-center space-x-1"
                        >
                          <Link2 size={12} />
                          <span>Link</span>
                        </button>
                      )}
                      <button
                        onClick={() => deleteUser(user.id, user.username)}
                        className="btn-danger-compact flex items-center space-x-1"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Section */}
      <div className="bg-gray-50 p-2.5 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Invite New Users</h4>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => onCreateInvite('user')}
            className="btn btn-secondary text-xs"
          >
            Create User Invite
          </button>
          <button
            onClick={() => onCreateInvite('admin')}
            className="btn btn-secondary text-xs"
          >
            Create Admin Invite
          </button>
        </div>

        {inviteCode && (
          <div className="bg-white border border-gray-200 rounded p-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-900">Latest Invite Code:</div>
                <div className="text-base font-mono text-blue-600">{inviteCode}</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  Share this code with colleagues to invite them to your workspace
                </div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(inviteCode)}
                className="btn btn-secondary text-xs"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Link Researcher Modal */}
      {linkingUser && (
        <ResearcherModal
          isOpen={true}
          onClose={() => {
            setLinkingUser(null);
            setUnlinkedResearchers([]);
          }}
          mode="select-or-create"
          userId={linkingUser.id}
          username={linkingUser.username}
          unlinkedResearchers={unlinkedResearchers}
          onSuccess={() => {}}
          onCreateResearcher={handleCreateAndLink}
          onLinkExisting={handleLinkExisting}
        />
      )}

      {/* Password Reset Modal */}
      {passwordResetModal && (
        <PasswordResetModal
          userId={passwordResetModal.userId}
          username={passwordResetModal.username}
          onClose={() => setPasswordResetModal(null)}
          onSuccess={() => {
            setPasswordResetModal(null);
            onUserUpdate();
          }}
        />
      )}
    </div>
  );
}
