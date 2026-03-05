/**
 * Lab Users Panel
 *
 * Users table with status actions (approve, deactivate, suspend, delete) and confirmation dialogs.
 */

import { useState } from 'react';

import { Clock, Power, ShieldBan, Trash2, UserRoundCheck, UsersRound } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { Button, Chip, Table, Tooltip } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { notifications } from '@shared/utils';

import {
  useActivateLabUserMutation,
  useDeactivateLabUserMutation,
  useSuspendLabUserMutation,
  useDeleteLabUserMutation,
} from '../../../hooks/useLabQueries';
import { getRoleLabel } from '../../../utils/auditLogFormatters';

import type { LabDetailsUser } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui';

type UserAction = { type: 'delete' | 'deactivate' | 'suspend'; user: LabDetailsUser };

interface LabUsersPanelProps {
  labId: string;
  users: LabDetailsUser[];
  sortConfig: SortConfig | undefined;
  onSort: (config: SortConfig | undefined) => void;
}

export function LabUsersPanel({ labId, users, sortConfig, onSort }: LabUsersPanelProps) {
  const currentUserId = useAuthStore(s => s.user?.id);
  const deleteUserMutation = useDeleteLabUserMutation();
  const deactivateUserMutation = useDeactivateLabUserMutation();
  const suspendUserMutation = useSuspendLabUserMutation();

  const [userAction, setUserAction] = useState<UserAction | null>(null);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <UsersRound size={16} className="text-secondary-foreground" />
        <h3 className="text-sm font-semibold text-card-foreground">Users</h3>
      </div>
      <Table
        columns={getUserColumns(labId, setUserAction, currentUserId)}
        data={users}
        size="sm"
        rounded="lg"
        sortable
        sortConfig={sortConfig}
        onSort={onSort}
        hoverable={false}
        emptyMessage="No users in this lab"
        aria-label="Lab users"
      />

      <ConfirmDialog
        isOpen={userAction !== null}
        title={
          userAction?.type === 'delete'
            ? 'Delete User'
            : userAction?.type === 'suspend'
              ? 'Suspend User'
              : 'Deactivate User'
        }
        message={
          userAction?.type === 'delete'
            ? `Are you sure you want to delete "${userAction.user.username}"? This action cannot be undone.`
            : userAction?.type === 'suspend'
              ? `Are you sure you want to suspend "${userAction.user.username}"? They will no longer be able to log in. Only a system administrator can reverse this.`
              : `Are you sure you want to deactivate "${userAction?.user.username}"? They will no longer be able to log in. This can be reversed.`
        }
        confirmText={
          userAction?.type === 'delete'
            ? 'Delete'
            : userAction?.type === 'suspend'
              ? 'Suspend'
              : 'Deactivate'
        }
        variant="danger"
        isLoading={
          deleteUserMutation.isPending ||
          suspendUserMutation.isPending ||
          deactivateUserMutation.isPending
        }
        onConfirm={async () => {
          if (!userAction) return;
          const { type, user } = userAction;
          try {
            if (type === 'delete') {
              await deleteUserMutation.mutateAsync({ labId, userId: user.id });
              notifications.success(`${user.username} deleted`);
            } else if (type === 'suspend') {
              await suspendUserMutation.mutateAsync({ labId, userId: user.id });
              notifications.success(`${user.username} suspended`);
            } else {
              await deactivateUserMutation.mutateAsync({ labId, userId: user.id });
              notifications.success(`${user.username} deactivated`);
            }
          } catch {
            notifications.error(`Failed to ${type} user`);
          }
          setUserAction(null);
        }}
        onCancel={() => setUserAction(null)}
      />
    </div>
  );
}

function ActionsCell({
  user,
  labId,
  onUserAction,
  currentUserId,
}: {
  user: LabDetailsUser;
  labId: string;
  onUserAction: (action: UserAction) => void;
  currentUserId?: string;
}) {
  const activateUserMutation = useActivateLabUserMutation();
  const isSelf = user.id === currentUserId;

  const handleActivate = async () => {
    try {
      await activateUserMutation.mutateAsync({ labId, userId: user.id });
      notifications.success(`${user.username} activated`);
    } catch {
      notifications.error('Failed to activate user');
    }
  };

  return (
    <div className="flex items-center gap-1">
      {user.status === 'pending' && (
        <Tooltip content="Approve user">
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            onClick={handleActivate}
            disabled={activateUserMutation.isPending}
            aria-label="Approve user"
          >
            <UserRoundCheck size={16} className="text-success-text" />
          </Button>
        </Tooltip>
      )}
      {user.status === 'approved' && (
        <>
          <Tooltip content={isSelf ? 'Cannot deactivate yourself' : 'Deactivate user'}>
            <Button
              variant="ghost-danger"
              size="xs"
              iconOnly
              onClick={() => onUserAction({ type: 'deactivate', user })}
              disabled={isSelf}
              aria-label="Deactivate user"
            >
              <Power size={16} />
            </Button>
          </Tooltip>
          <Tooltip content={isSelf ? 'Cannot suspend yourself' : 'Suspend user'}>
            <Button
              variant="ghost-danger"
              size="xs"
              iconOnly
              onClick={() => onUserAction({ type: 'suspend', user })}
              disabled={isSelf}
              aria-label="Suspend user"
            >
              <ShieldBan size={16} />
            </Button>
          </Tooltip>
        </>
      )}
      {user.status === 'deactivated' && (
        <Tooltip content="Reactivate user">
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            onClick={handleActivate}
            disabled={activateUserMutation.isPending}
            aria-label="Reactivate user"
          >
            <UserRoundCheck size={16} className="text-success-text" />
          </Button>
        </Tooltip>
      )}
      {user.status === 'suspended' && (
        <Tooltip content="Unsuspend user">
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            onClick={handleActivate}
            disabled={activateUserMutation.isPending}
            aria-label="Unsuspend user"
          >
            <UserRoundCheck size={16} className="text-success-text" />
          </Button>
        </Tooltip>
      )}
      <Tooltip content={isSelf ? 'Cannot delete yourself' : 'Delete user'}>
        <Button
          variant="ghost-danger"
          size="xs"
          iconOnly
          onClick={() => onUserAction({ type: 'delete', user })}
          disabled={isSelf || activateUserMutation.isPending}
          aria-label="Delete user"
        >
          <Trash2 size={16} />
        </Button>
      </Tooltip>
    </div>
  );
}

function formatLastActivity(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getUserColumns(
  labId: string,
  onUserAction: (action: UserAction) => void,
  currentUserId?: string
): TableColumn[] {
  return [
    {
      id: 'lastName',
      header: 'User',
      sortable: true,
      render: (_value, row) => {
        const firstName = row['firstName'] as string | null;
        const lastName = row['lastName'] as string | null;
        const username = String(row['username']);
        const status = String(row['status']);
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Intentionally using || to treat empty strings as falsy
        const hasName = lastName || firstName;
        const displayName = hasName
          ? `${lastName ?? ''}${lastName && firstName ? ', ' : ''}${firstName ?? ''}`
          : username;

        const initials =
          firstName && lastName
            ? `${firstName[0]}${lastName[0]}`.toUpperCase()
            : username.slice(0, 2).toUpperCase();

        return (
          <div
            className={`flex items-center whitespace-nowrap gap-2 ${status !== 'approved' && status !== 'pending' ? 'opacity-60' : ''}`}
          >
            <UserBadge type="otherUser" initials={initials} username={username} size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-card-foreground">{displayName}</span>
                {status === 'pending' && (
                  <Tooltip content="Pending approval">
                    <Clock size={12} className="text-warning-text" />
                  </Tooltip>
                )}
                {status === 'deactivated' && (
                  <Tooltip content="Deactivated">
                    <Power size={12} className="text-danger-text" />
                  </Tooltip>
                )}
                {status === 'suspended' && (
                  <Tooltip content="Suspended">
                    <ShieldBan size={12} className="text-danger-text" />
                  </Tooltip>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{username}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'email',
      header: 'Email',
      sortable: true,
      render: (_value, row) => (
        <span className="text-muted-foreground">{String(row['email'] ?? '-')}</span>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sortable: true,
      render: (_value, row) => (
        <Chip color="default" size="sm">
          {getRoleLabel(String(row['role']))}
        </Chip>
      ),
    },
    {
      id: 'lastActivity',
      header: 'Last Active',
      sortable: true,
      render: (_value, row) => (
        <span className="text-muted-foreground">
          {formatLastActivity(String(row['lastActivity']))}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (_value, row) => (
        <ActionsCell
          user={row as unknown as LabDetailsUser}
          labId={labId}
          onUserAction={onUserAction}
          currentUserId={currentUserId}
        />
      ),
    },
  ];
}
