/**
 * Users Tab
 *
 * Admin interface for user management, role assignment, and researcher linking.
 */

import { useState, useMemo } from 'react';

import {
  ChevronDown,
  Link2,
  KeyRound,
  Power,
  RefreshCw,
  ShieldBan,
  Trash2,
  Unlink2,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { logger } from '@infra/logger';
import { Button, Chip, Select, Tooltip, Table } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { formatRelativeTime, notifications } from '@shared/utils';

import {
  useDeleteUserMutation,
  useDeactivateUserMutation,
  useActivateUserMutation,
} from '../../../../hooks/useUserMutations';
import { adminResearcherService } from '../../../../services/AdminResearcherService';
import { adminUserService } from '../../../../services/AdminUserService';
import { PasswordResetModal } from '../PasswordResetModal';
import { ResearcherModal } from '../ResearcherModal';

import type {
  AdminUser,
  CreateResearcherProfile,
  AdminResearcher,
  UserRole,
} from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'User' },
  { value: 'lab_admin', label: 'Lab Admin' },
];

export interface UsersTabProps {
  users: AdminUser[];
  onUserUpdate: () => void;
  readOnly?: boolean;
}

export function UsersTab({ users = [], onUserUpdate, readOnly = false }: UsersTabProps) {
  const [updating, setUpdating] = useState<string | null>(null);
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
    type: 'delete' | 'unlink' | 'deactivate';
    userId: string;
    username: string;
  } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined);
  const [showInactive, setShowInactive] = useState(false);

  const currentUserId = useAuthStore(s => s.user?.id);
  const deleteUserMutation = useDeleteUserMutation();
  const deactivateUserMutation = useDeactivateUserMutation();
  const activateUserMutation = useActivateUserMutation();
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    setUpdating(userId);
    try {
      await adminUserService.updateUserRole(userId, newRole);
      notifications.success(`User role updated to ${newRole}`);
      onUserUpdate();
    } catch (error) {
      logger.error('Failed to update user role', { error });
      const message = error instanceof Error ? error.message : 'Failed to update user role';
      notifications.error(message);
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteUser = (userId: string, username: string) => {
    setConfirmDialog({ type: 'delete', userId, username });
  };

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

  const handleDeactivateUser = (userId: string, username: string) => {
    setConfirmDialog({ type: 'deactivate', userId, username });
  };

  const executeDeactivateUser = async (userId: string, username: string) => {
    try {
      await deactivateUserMutation.mutateAsync(userId);
      notifications.success(`User "${username}" deactivated`);
      setConfirmDialog(null);
      onUserUpdate();
    } catch {
      notifications.error('Failed to deactivate user');
      setConfirmDialog(null);
    }
  };

  const handleActivateUser = async (userId: string, username: string) => {
    try {
      await activateUserMutation.mutateAsync(userId);
      notifications.success(`User "${username}" activated`);
      onUserUpdate();
    } catch {
      notifications.error('Failed to activate user');
    }
  };

  const unlinkResearcher = (userId: string, username: string) => {
    setConfirmDialog({ type: 'unlink', userId, username });
  };

  const executeUnlinkResearcher = async (userId: string, username: string) => {
    setUpdating(userId);
    try {
      await adminUserService.unlinkResearcherFromUser(userId);
      notifications.success(`Researcher unlinked from "${username}"`);
      setConfirmDialog(null);
      onUserUpdate();
    } catch (error) {
      logger.error('Failed to unlink researcher', { error });
      notifications.error('Failed to unlink researcher');
      setConfirmDialog(null);
    } finally {
      setUpdating(null);
    }
  };

  const openLinkModal = async (user: { id: string; username: string }) => {
    setResearcherModalData(user);
    setIsResearcherModalOpen(true);
    try {
      const researchers = await adminResearcherService.getUnlinkedResearchers();
      setUnlinkedResearchers(researchers);
    } catch (error) {
      logger.error('Failed to load unlinked researchers', { error });
      notifications.error('Failed to load available researchers');
    }
  };

  const handleLinkExisting = async (researcherId: string) => {
    if (!researcherModalData) return;

    await adminUserService.linkResearcherToUser(researcherModalData.id, researcherId);
    await onUserUpdate(); // Make sure to await the update
  };

  const handleCreateAndLink = async (data: CreateResearcherProfile) => {
    if (!researcherModalData) return;

    await adminResearcherService.createAndLinkResearcher(researcherModalData.id, data);
    await onUserUpdate(); // Make sure to await the update
  };

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

  const activeUsers = useMemo(
    () => (sortedUsers ?? []).filter(u => u.status === 'approved'),
    [sortedUsers]
  );
  const inactiveUsers = useMemo(
    () => (sortedUsers ?? []).filter(u => u.status === 'deactivated' || u.status === 'suspended'),
    [sortedUsers]
  );

  const userColumns: TableColumn<AdminUser>[] = [
    {
      id: 'user',
      header: 'User',
      sortable: true,
      render: (_, user) => {
        const initials =
          user.firstName && user.lastName
            ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
            : user.username.slice(0, 2).toUpperCase();

        return (
          <div
            className={`flex items-center whitespace-nowrap gap-2 ${user.status !== 'approved' ? 'opacity-60' : ''}`}
          >
            <UserBadge type="otherUser" initials={initials} username={user.username} size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-card-foreground">
                  {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Intentionally using || to treat empty strings as falsy */}
                  {user.lastName || user.firstName
                    ? `${user.lastName ?? ''}${user.lastName && user.firstName ? ', ' : ''}${user.firstName ?? ''}`
                    : user.username}
                </span>
                {user.role === 'system_admin' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-action/10 text-action">
                    System Admin
                  </span>
                )}
                {user.role === 'lab_admin' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-secondary-foreground">
                    Lab Admin
                  </span>
                )}
                {user.status === 'deactivated' && (
                  <Tooltip content="Deactivated" side="bottom">
                    <Power size={12} className="text-danger-text" />
                  </Tooltip>
                )}
                {user.status === 'suspended' && (
                  <Tooltip content="Suspended by system admin" side="bottom">
                    <ShieldBan size={12} className="text-danger-text" />
                  </Tooltip>
                )}
                {user.requirePasswordChange && (
                  <Tooltip content="Password change required on next login" side="bottom">
                    <span className="text-warning-text text-xs flex items-center gap-0.5">⚠️</span>
                  </Tooltip>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{user.username}</div>
              {user.email && (
                <div className="text-[11px] text-muted-foreground/70">{user.email}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'role',
      header: 'Role',
      sortable: true,
      render: (_, user) => {
        const isDisabled =
          readOnly ||
          updating === user.id ||
          user.role === 'system_admin' ||
          user.id === currentUserId;
        return (
          <div
            className={`flex items-center gap-2 whitespace-nowrap ${isDisabled ? 'opacity-50' : ''}`}
          >
            <div className="w-28">
              <Select
                value={user.role ?? 'user'}
                onChange={newValue => {
                  if (newValue && typeof newValue === 'string') {
                    void updateUserRole(user.id, newValue as UserRole);
                  }
                }}
                options={ROLE_OPTIONS}
                disabled={isDisabled}
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
      id: 'position',
      header: 'Position',
      render: (_, user) => (
        <div className="whitespace-nowrap max-w-[150px]">
          {user.position ? (
            <Tooltip content={user.position} side="bottom">
              <div className="text-sm text-card-foreground truncate">{user.position}</div>
            </Tooltip>
          ) : (
            <div className="text-sm text-muted-foreground">—</div>
          )}
          {user.department && (
            <Tooltip content={user.department} side="bottom">
              <div className="text-xs text-muted-foreground truncate">{user.department}</div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      id: 'linkedResearcher',
      header: 'Linked Researcher',
      render: (_, user) => {
        if (user.researcherId) {
          return (
            <div className="flex items-center gap-1.5 text-sm text-card-foreground whitespace-nowrap">
              <Link2 size={14} className="text-success-text shrink-0" />
              <span>{user.researcherName ?? 'Linked'}</span>
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
      id: 'lastActivity',
      header: 'Last Active',
      sortable: true,
      render: (_, user) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {user.lastActivity ? formatRelativeTime(user.lastActivity) : 'Never'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (_, user) => {
        const isSelf = user.id === currentUserId;
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
            {user.status === 'approved' && (
              <Tooltip
                content={isSelf ? 'Cannot deactivate yourself' : 'Deactivate user'}
                side="bottom"
              >
                <Button
                  variant="ghost-danger"
                  size="xs"
                  iconOnly
                  onClick={() => void handleDeactivateUser(user.id, user.username)}
                  disabled={isSelf || deactivateUserMutation.isPending}
                  aria-label="Deactivate user"
                >
                  <Power size={16} />
                </Button>
              </Tooltip>
            )}
            {user.status === 'deactivated' && (
              <Tooltip content="Reactivate user" side="bottom">
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  onClick={() => void handleActivateUser(user.id, user.username)}
                  disabled={activateUserMutation.isPending}
                  aria-label="Reactivate user"
                >
                  <UserRoundCheck size={16} className="text-success-text" />
                </Button>
              </Tooltip>
            )}
            {user.status === 'suspended' && (
              <Tooltip content="Suspended by system admin" side="bottom">
                <ShieldBan size={16} className="text-danger-text" />
              </Tooltip>
            )}
            <Tooltip content={isSelf ? 'Cannot delete yourself' : 'Delete user'} side="bottom">
              <Button
                variant="ghost-danger"
                size="xs"
                iconOnly
                onClick={() => handleDeleteUser(user.id, user.username)}
                disabled={isSelf}
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
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center space-x-2">
          <UsersRound size={22} className="text-secondary-foreground" />
          <h3 className="text-xl font-semibold text-card-foreground">Users</h3>
        </div>
        {!readOnly && (
          <Button variant="secondary" onClick={onUserUpdate} leftIcon={<RefreshCw size={14} />}>
            Refresh
          </Button>
        )}
      </div>

      <Table
        columns={readOnly ? userColumns.filter(c => c.id !== 'actions') : userColumns}
        data={activeUsers}
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

      {inactiveUsers.length > 0 && (
        <div className="pt-3 border-t border-border">
          <button
            onClick={() => setShowInactive(prev => !prev)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${showInactive ? 'rotate-0' : '-rotate-90'}`}
            />
            Inactive Users ({inactiveUsers.length})
          </button>
          {showInactive && (
            <div className="mt-2">
              <Table
                columns={readOnly ? userColumns.filter(c => c.id !== 'actions') : userColumns}
                data={inactiveUsers}
                size="sm"
                variant="default"
                rounded="lg"
                emptyMessage=""
                aria-label="Inactive users"
                className="opacity-60"
              />
            </div>
          )}
        </div>
      )}

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

      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          variant={confirmDialog.type === 'unlink' ? 'warning' : 'danger'}
          title={
            confirmDialog.type === 'delete'
              ? 'Delete User'
              : confirmDialog.type === 'deactivate'
                ? 'Deactivate User'
                : 'Unlink Researcher'
          }
          message={
            confirmDialog.type === 'delete'
              ? `Are you sure you want to delete user "${confirmDialog.username}"? This action cannot be undone.`
              : confirmDialog.type === 'deactivate'
                ? `Are you sure you want to deactivate "${confirmDialog.username}"? They will no longer be able to log in. This can be reversed.`
                : `Unlink researcher profile from "${confirmDialog.username}"? The researcher record will be preserved for tube history.`
          }
          confirmText={
            confirmDialog.type === 'delete'
              ? 'Delete'
              : confirmDialog.type === 'deactivate'
                ? 'Deactivate'
                : 'Unlink'
          }
          onConfirm={() => {
            if (confirmDialog.type === 'delete') {
              executeDeleteUser(confirmDialog.userId, confirmDialog.username);
            } else if (confirmDialog.type === 'deactivate') {
              void executeDeactivateUser(confirmDialog.userId, confirmDialog.username);
            } else {
              void executeUnlinkResearcher(confirmDialog.userId, confirmDialog.username);
            }
          }}
          onCancel={() => setConfirmDialog(null)}
          isLoading={
            confirmDialog.type === 'delete'
              ? deleteUserMutation.isPending
              : confirmDialog.type === 'deactivate'
                ? deactivateUserMutation.isPending
                : updating === confirmDialog.userId
          }
        />
      )}
    </div>
  );
}
