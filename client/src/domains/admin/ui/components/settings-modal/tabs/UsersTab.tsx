/**
 * Users Tab
 *
 * Admin interface for user management, role assignment, and researcher linking.
 */

import { useState, useMemo } from 'react';

import {
  ChevronDown,
  KeyRound,
  Link2,
  Power,
  RefreshCw,
  ShieldBan,
  ShieldUser,
  Trash2,
  Unlink2,
  UserRound,
  UserRoundCheck,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { Button, Chip, OverflowMenu, Table, Tooltip } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { formatRelativeTime, notifications } from '@shared/utils';

import { useCreateAndLinkResearcherMutation } from '../../../../hooks/useResearcherMutations';
import { useUnlinkedResearchersQuery } from '../../../../hooks/useUnlinkedResearchersQuery';
import {
  useActivateUserMutation,
  useDeactivateUserMutation,
  useDeleteUserMutation,
  useLinkResearcherToUserMutation,
  useUnlinkResearcherMutation,
  useUpdateUserRoleMutation,
} from '../../../../hooks/useUserMutations';
import { PasswordResetModal } from '../PasswordResetModal';
import { ResearcherModal } from '../ResearcherModal';

import type { AdminUser, CreateResearcherProfile, UserRole } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui';

interface UsersTabProps {
  users: AdminUser[];
  onUserUpdate: () => void;
  readOnly?: boolean;
}

export function UsersTab({ users = [], onUserUpdate, readOnly = false }: UsersTabProps) {
  // Modal state: separate data from visibility for exit animations
  const [researcherModalData, setResearcherModalData] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [isResearcherModalOpen, setIsResearcherModalOpen] = useState(false);
  const { data: unlinkedResearchers = [] } = useUnlinkedResearchersQuery(isResearcherModalOpen);

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
  const unlinkResearcherMutation = useUnlinkResearcherMutation();
  const updateUserRoleMutation = useUpdateUserRoleMutation();
  const linkResearcherMutation = useLinkResearcherToUserMutation();
  const createAndLinkMutation = useCreateAndLinkResearcherMutation();

  const updateUserRole = (userId: string, newRole: UserRole) => {
    updateUserRoleMutation.mutate(
      { userId, role: newRole },
      {
        onSuccess: () => {
          notifications.success(`User role updated to ${newRole}`);
        },
      }
    );
  };

  const handleDeleteUser = (userId: string, username: string) => {
    setConfirmDialog({ type: 'delete', userId, username });
  };

  const executeDeleteUser = (userId: string, username: string) => {
    deleteUserMutation.mutate(userId, {
      onSuccess: () => {
        notifications.success(`User "${username}" deleted successfully`);
        onUserUpdate();
      },
      onSettled: () => setConfirmDialog(null),
    });
  };

  const handleDeactivateUser = (userId: string, username: string) => {
    setConfirmDialog({ type: 'deactivate', userId, username });
  };

  const executeDeactivateUser = (userId: string, username: string) => {
    deactivateUserMutation.mutate(userId, {
      onSuccess: () => {
        notifications.success(`User "${username}" deactivated`);
        onUserUpdate();
      },
      onSettled: () => setConfirmDialog(null),
    });
  };

  const handleActivateUser = (userId: string, username: string) => {
    activateUserMutation.mutate(userId, {
      onSuccess: () => {
        notifications.success(`User "${username}" activated`);
        onUserUpdate();
      },
    });
  };

  const unlinkResearcher = (userId: string, username: string) => {
    setConfirmDialog({ type: 'unlink', userId, username });
  };

  const executeUnlinkResearcher = (userId: string, username: string) => {
    unlinkResearcherMutation.mutate(userId, {
      onSuccess: () => {
        notifications.success(`Researcher unlinked from "${username}"`);
        onUserUpdate();
      },
      onSettled: () => setConfirmDialog(null),
    });
  };

  const openLinkModal = (user: { id: string; username: string }) => {
    setResearcherModalData(user);
    setIsResearcherModalOpen(true);
  };

  const handleLinkExisting = async (researcherId: string) => {
    if (!researcherModalData) return;
    await linkResearcherMutation.mutateAsync({ userId: researcherModalData.id, researcherId });
  };

  const handleCreateAndLink = async (data: CreateResearcherProfile) => {
    if (!researcherModalData) return;
    await createAndLinkMutation.mutateAsync({ userId: researcherModalData.id, data });
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
          const dateA = a.lastActivity ? a.lastActivity.getTime() : 0;
          const dateB = b.lastActivity ? b.lastActivity.getTime() : 0;
          return (dateA - dateB) * direction;
        }
        default:
          return 0;
      }
    });
  }, [users, sortConfig]);

  const activeUsers = useMemo(
    () => sortedUsers.filter(u => u.status === 'approved'),
    [sortedUsers]
  );
  const inactiveUsers = useMemo(
    () => sortedUsers.filter(u => u.status === 'deactivated' || u.status === 'suspended'),
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
                <span className="font-sans text-body-sm font-medium text-card-foreground">
                  {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Intentionally using || to treat empty strings as falsy */}
                  {user.lastName || user.firstName
                    ? `${user.lastName ?? ''}${user.lastName && user.firstName ? ', ' : ''}${user.firstName ?? ''}`
                    : user.username}
                </span>
                {user.role === 'system_admin' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-label-2xs font-medium bg-action/10 text-action">
                    System Admin
                  </span>
                )}
                {user.role === 'lab_admin' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-label-2xs font-medium bg-muted text-secondary-foreground">
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
                    <span className="text-warning-text text-caption flex items-center gap-0.5">
                      ⚠️
                    </span>
                  </Tooltip>
                )}
              </div>
              <div className="text-caption text-muted-foreground">{user.username}</div>
              {user.email && (
                <div className="text-caption text-muted-foreground/70">{user.email}</div>
              )}
            </div>
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
              <div className="font-sans text-body-sm text-card-foreground truncate">
                {user.position}
              </div>
            </Tooltip>
          ) : (
            <div className="text-body-sm text-muted-foreground">—</div>
          )}
          {user.department && (
            <Tooltip content={user.department} side="bottom">
              <div className="font-sans text-caption text-muted-foreground truncate">
                {user.department}
              </div>
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
          const isDeactivated = user.researcherActive === false;
          return (
            <div className="flex flex-col gap-0.5">
              <div
                className={`flex items-center gap-1.5 text-body-sm whitespace-nowrap ${isDeactivated ? 'text-muted-foreground opacity-60' : 'text-card-foreground'}`}
              >
                <Link2
                  size={14}
                  className={`shrink-0 ${isDeactivated ? 'text-muted-foreground' : 'text-success-text'}`}
                />
                <span className="font-sans">{user.researcherName ?? 'Linked'}</span>
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
      id: 'lastActivity',
      header: 'Last Active',
      sortable: true,
      render: (_, user) => (
        <span className="text-body-sm text-muted-foreground whitespace-nowrap">
          {user.lastActivity ? formatRelativeTime(user.lastActivity) : 'Never'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      render: (_, user) => {
        if (readOnly) return null;
        const isSelf = user.id === currentUserId;
        const isSystemAdmin = user.role === 'system_admin';

        const items = [
          ...(isSystemAdmin || isSelf
            ? []
            : [
                {
                  icon: user.role === 'lab_admin' ? UserRound : ShieldUser,
                  label: user.role === 'lab_admin' ? 'Set as User' : 'Set as Lab Admin',
                  onClick: () =>
                    updateUserRole(user.id, user.role === 'lab_admin' ? 'user' : 'lab_admin'),
                },
              ]),
          {
            icon: KeyRound,
            label: 'Reset Password',
            onClick: () => {
              setPasswordResetModalData({ userId: user.id, username: user.username });
              setIsPasswordResetModalOpen(true);
            },
          },
          user.researcherId
            ? {
                icon: Unlink2,
                label: 'Unlink Researcher',
                onClick: () => unlinkResearcher(user.id, user.username),
              }
            : {
                icon: Link2,
                label: 'Link Researcher',
                onClick: () => openLinkModal({ id: user.id, username: user.username }),
              },
          ...(user.status === 'approved'
            ? [
                {
                  icon: Power,
                  label: 'Deactivate',
                  onClick: () => void handleDeactivateUser(user.id, user.username),
                  danger: true,
                  disabled: isSelf,
                },
              ]
            : []),
          ...(user.status === 'deactivated'
            ? [
                {
                  icon: UserRoundCheck,
                  label: 'Reactivate',
                  onClick: () => void handleActivateUser(user.id, user.username),
                },
              ]
            : []),
          {
            icon: Trash2,
            label: 'Delete',
            onClick: () => handleDeleteUser(user.id, user.username),
            danger: true,
            disabled: isSelf,
          },
        ];

        return (
          <OverflowMenu
            items={items}
            dividerBefore={['Reset Password', 'Deactivate', 'Reactivate']}
            size="md"
            aria-label={`Actions for ${user.username}`}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-2">
      <Table
        columns={readOnly ? userColumns.filter(c => c.id !== 'actions') : userColumns}
        data={activeUsers}
        hoverable
        sortable
        sortConfig={sortConfig}
        onSort={setSortConfig}
        emptyMessage="No users found"
        aria-label="Users list"
        toolbar={
          readOnly
            ? undefined
            : {
                right: (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onUserUpdate}
                    leftIcon={<RefreshCw size={14} />}
                  >
                    Refresh
                  </Button>
                ),
              }
        }
      />

      {inactiveUsers.length > 0 && (
        <div className="pt-3 border-t border-border">
          <button
            onClick={() => setShowInactive(prev => !prev)}
            className="flex items-center gap-1.5 text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                : unlinkResearcherMutation.isPending
          }
        />
      )}
    </div>
  );
}
