/**
 * Lab Users Panel
 *
 * Users table with status actions (approve, deactivate, suspend, delete) and confirmation dialogs.
 */

import { useMemo, useState } from 'react';

import {
  ChevronDown,
  Link2,
  Power,
  ShieldBan,
  Trash2,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { Chip, OverflowMenu, Table, Tooltip } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { formatRelativeTime, notifications } from '@shared/utils';

import {
  useActivateLabUserMutation,
  useDeactivateLabUserMutation,
  useSuspendLabUserMutation,
  useDeleteLabUserMutation,
} from '../../../hooks/useLabMutations';
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
  const activateUserMutation = useActivateLabUserMutation();

  const [userAction, setUserAction] = useState<UserAction | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const handleActivate = async (user: LabDetailsUser) => {
    try {
      await activateUserMutation.mutateAsync({ labId, userId: user.id });
      notifications.success(`${user.username} activated`);
    } catch {
      notifications.error('Failed to activate user');
    }
  };

  const activeUsers = useMemo(() => users.filter(u => u.status === 'approved'), [users]);
  const inactiveUsers = useMemo(
    () => users.filter(u => u.status === 'deactivated' || u.status === 'suspended'),
    [users]
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <UsersRound size={18} className="text-muted-foreground" />
        <h3 className="text-lg font-semibold text-card-foreground">Users</h3>
      </div>
      <Table
        columns={getUserColumns({
          onUserAction: setUserAction,
          onActivate: handleActivate,
          currentUserId,
        })}
        data={activeUsers}
        size="sm"
        rounded="lg"
        sortable
        sortConfig={sortConfig}
        onSort={onSort}
        hoverable={false}
        emptyMessage="No users in this lab"
        aria-label="Lab users"
      />

      {inactiveUsers.length > 0 && (
        <div className="pt-3 border-t border-border mt-3">
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
                columns={getUserColumns({
                  onUserAction: setUserAction,
                  onActivate: handleActivate,
                  currentUserId,
                })}
                data={inactiveUsers}
                size="sm"
                rounded="lg"
                emptyMessage=""
                aria-label="Inactive lab users"
                className="opacity-60"
              />
            </div>
          )}
        </div>
      )}

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

interface ColumnConfig {
  onUserAction: (action: UserAction) => void;
  onActivate: (user: LabDetailsUser) => void;
  currentUserId?: string;
}

function getUserColumns({
  onUserAction,
  onActivate,
  currentUserId,
}: ColumnConfig): TableColumn<LabDetailsUser>[] {
  return [
    {
      id: 'lastName',
      header: 'User',
      sortable: true,
      render: (_value, row) => {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Intentionally using || to treat empty strings as falsy
        const hasName = row.lastName || row.firstName;
        const displayName = hasName
          ? `${row.lastName ?? ''}${row.lastName && row.firstName ? ', ' : ''}${row.firstName ?? ''}`
          : row.username;

        const initials =
          row.firstName && row.lastName
            ? `${row.firstName[0]}${row.lastName[0]}`.toUpperCase()
            : row.username.slice(0, 2).toUpperCase();

        return (
          <div
            className={`flex items-center whitespace-nowrap gap-2 ${row.status !== 'approved' ? 'opacity-60' : ''}`}
          >
            <UserBadge type="otherUser" initials={initials} username={row.username} size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-card-foreground">{displayName}</span>
                {row.status === 'deactivated' && (
                  <Tooltip content="Deactivated">
                    <Power size={12} className="text-danger-text" />
                  </Tooltip>
                )}
                {row.status === 'suspended' && (
                  <Tooltip content="Suspended">
                    <ShieldBan size={12} className="text-danger-text" />
                  </Tooltip>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{row.username}</div>
              {row.email && <div className="text-[11px] text-muted-foreground/70">{row.email}</div>}
            </div>
          </div>
        );
      },
    },
    {
      id: 'position',
      header: 'Position',
      render: (_value, row) => (
        <div className="whitespace-nowrap max-w-[150px]">
          {row.position ? (
            <Tooltip content={row.position} side="bottom">
              <div className="text-sm text-card-foreground truncate">{row.position}</div>
            </Tooltip>
          ) : (
            <div className="text-sm text-muted-foreground">—</div>
          )}
          {row.department && (
            <Tooltip content={row.department} side="bottom">
              <div className="text-xs text-muted-foreground truncate">{row.department}</div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sortable: true,
      render: (_value, row) => (
        <Chip color="default" size="sm">
          {getRoleLabel(row.role)}
        </Chip>
      ),
    },
    {
      id: 'linkedResearcher',
      header: 'Linked Researcher',
      render: (_value, row) => {
        if (row.researcher) {
          const isDeactivated = !row.researcher.active;
          return (
            <div className="flex flex-col gap-0.5">
              <div
                className={`flex items-center gap-1.5 text-sm whitespace-nowrap ${isDeactivated ? 'text-muted-foreground opacity-60' : 'text-card-foreground'}`}
              >
                <Link2
                  size={14}
                  className={`shrink-0 ${isDeactivated ? 'text-muted-foreground' : 'text-success-text'}`}
                />
                <span>{row.researcher.name}</span>
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
      render: (_value, row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(row.lastActivity)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      render: (_value, row) => {
        const isSelf = row.id === currentUserId;

        const items = [
          ...(row.status === 'approved'
            ? [
                {
                  icon: Power,
                  label: 'Deactivate',
                  onClick: () => onUserAction({ type: 'deactivate' as const, user: row }),
                  danger: true,
                  disabled: isSelf,
                },
                {
                  icon: ShieldBan,
                  label: 'Suspend',
                  onClick: () => onUserAction({ type: 'suspend' as const, user: row }),
                  danger: true,
                  disabled: isSelf,
                },
              ]
            : []),
          ...(row.status === 'deactivated'
            ? [
                {
                  icon: UserRoundCheck,
                  label: 'Reactivate',
                  onClick: () => void onActivate(row),
                },
              ]
            : []),
          ...(row.status === 'suspended'
            ? [
                {
                  icon: UserRoundCheck,
                  label: 'Unsuspend',
                  onClick: () => void onActivate(row),
                },
              ]
            : []),
          {
            icon: Trash2,
            label: 'Delete',
            onClick: () => onUserAction({ type: 'delete' as const, user: row }),
            danger: true,
            disabled: isSelf,
          },
        ];

        return (
          <OverflowMenu
            items={items}
            dividerBefore={['Delete']}
            size="md"
            aria-label={`Actions for ${row.username}`}
          />
        );
      },
    },
  ];
}
