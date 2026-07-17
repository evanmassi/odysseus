/**
 * Lab Users Panel
 *
 * Users table with status actions (approve, deactivate, suspend, delete) and confirmation dialogs.
 */

import { useMemo, useState } from 'react';

import { getPersonInitials, getPersonSortName } from '@odysseus/shared-schemas';
import { Power, ShieldBan, Trash2, UserRoundCheck } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { Chip, ConsolePanel, OverflowMenu, SectionHeader, Table, Tooltip } from '@shared/ui';
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
import { CollapsibleInactiveSection } from '../displays/CollapsibleInactiveSection';
import { LinkedPersonCell } from '../displays/LinkedPersonCell';

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

  const handleActivate = (user: LabDetailsUser) => {
    activateUserMutation.mutate(
      { labId, userId: user.id },
      { onSuccess: () => notifications.success(`${user.username} activated`) }
    );
  };

  const activeUsers = useMemo(() => users.filter(u => u.status === 'approved'), [users]);
  const inactiveUsers = useMemo(
    () => users.filter(u => u.status === 'deactivated' || u.status === 'suspended'),
    [users]
  );

  const columns = getUserColumns({
    onUserAction: setUserAction,
    onActivate: handleActivate,
    currentUserId,
  });

  return (
    <>
      <ConsolePanel intensity="soft">
        <div className="p-4">
          <SectionHeader title="Users" meta={`${activeUsers.length} records`} />
          <Table
            columns={columns}
            data={activeUsers}
            sortable
            sortConfig={sortConfig}
            onSort={onSort}
            emptyMessage="No users in this lab"
            aria-label="Lab users"
          />

          {inactiveUsers.length > 0 && (
            <CollapsibleInactiveSection
              label="Inactive Users"
              count={inactiveUsers.length}
              variant="stripe"
            >
              <Table
                columns={columns}
                data={inactiveUsers}
                emptyMessage=""
                aria-label="Inactive lab users"
                rowState={row => (row.status === 'suspended' ? 'danger' : 'muted')}
              />
            </CollapsibleInactiveSection>
          )}
        </div>
      </ConsolePanel>

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
        onConfirm={() => {
          if (!userAction) return;
          const { type, user } = userAction;
          const vars = { labId, userId: user.id };
          const onSettled = () => setUserAction(null);
          if (type === 'delete') {
            deleteUserMutation.mutate(vars, {
              onSuccess: () => notifications.success(`${user.username} deleted`),
              onSettled,
            });
          } else if (type === 'suspend') {
            suspendUserMutation.mutate(vars, {
              onSuccess: () => notifications.success(`${user.username} suspended`),
              onSettled,
            });
          } else {
            deactivateUserMutation.mutate(vars, {
              onSuccess: () => notifications.success(`${user.username} deactivated`),
              onSettled,
            });
          }
        }}
        onCancel={() => setUserAction(null)}
      />
    </>
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
        const displayName = getPersonSortName(row);
        const initials = getPersonInitials(row);

        return (
          <div className="flex items-center gap-3 whitespace-nowrap">
            <UserBadge type="otherUser" initials={initials} username={row.username} size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-body-sm font-medium text-foreground">
                  {displayName}
                </span>
                {row.status === 'deactivated' && (
                  <Tooltip content="Deactivated">
                    <Power size={12} className="text-foreground/50" />
                  </Tooltip>
                )}
                {row.status === 'suspended' && (
                  <Tooltip content="Suspended">
                    <ShieldBan size={12} className="text-danger-text" />
                  </Tooltip>
                )}
              </div>
              <div className="mt-0.5 font-mono text-data-sm tracking-[0.04em] text-foreground/55">
                {row.username}
              </div>
              {row.email && (
                <div className="font-mono text-data-sm tracking-[0.04em] text-foreground/40">
                  {row.email}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'position',
      header: 'Position',
      render: (_value, row) => (
        <div className="max-w-[150px] whitespace-nowrap">
          {row.position ? (
            <Tooltip content={row.position} side="bottom">
              <div className="font-sans truncate text-body-sm text-foreground">{row.position}</div>
            </Tooltip>
          ) : (
            <div className="font-mono text-data-sm text-foreground/30">—</div>
          )}
          {row.department && (
            <Tooltip content={row.department} side="bottom">
              <div className="truncate font-mono text-data-sm tracking-[0.04em] text-foreground/55">
                {row.department}
              </div>
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
      render: (_value, row) => (
        <LinkedPersonCell
          label={row.researcher ? row.researcher.name : null}
          deactivated={row.researcher ? !row.researcher.active : false}
          tone="console"
          sans
        />
      ),
    },
    {
      id: 'lastActivity',
      header: 'Last Active',
      sortable: true,
      render: (_value, row) => (
        <span className="whitespace-nowrap font-mono text-data-sm tracking-[0.04em] text-foreground/70">
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
