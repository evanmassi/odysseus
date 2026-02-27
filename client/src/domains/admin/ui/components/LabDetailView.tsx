import { useState } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import {
  ArrowLeft,
  Box as BoxIcon,
  Dna,
  Icon,
  Pencil,
  Check,
  X,
  Rows3,
  ShieldUser,
  TestTube,
  UserCheck,
  UserX,
  UsersRound,
  RotateCcw,
} from 'lucide-react';

import { Button, Chip, Table } from '@shared/ui';
import { LabBadge } from '@shared/ui/components/badges/LabBadge';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { notifications } from '@shared/utils';

import {
  useLabDetailsQuery,
  useUpdateLabMutation,
  useActivateLabMutation,
  useDeactivateLabMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useSetUserDemoStatusMutation,
  useResetDemoDataMutation,
} from '../../hooks/useSystemAdminQueries';

import type { LabDetailsUser } from '@odysseus/shared-schemas';
import type { TableColumn, SortConfig } from '@shared/ui';

interface LabDetailViewProps {
  labId: string;
  onBack: () => void;
}

export function LabDetailView({ labId, onBack }: LabDetailViewProps) {
  const { data: details, isLoading } = useLabDetailsQuery(labId);
  const updateLabMutation = useUpdateLabMutation();
  const activateLabMutation = useActivateLabMutation();
  const deactivateLabMutation = useDeactivateLabMutation();
  const resetDemoMutation = useResetDemoDataMutation();

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);
  const [resetDemoConfirm, setResetDemoConfirm] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined);

  const handleRename = async () => {
    if (!newName.trim() || !details) return;
    try {
      await updateLabMutation.mutateAsync({ id: labId, name: newName.trim() });
      notifications.success('Lab renamed');
      setIsRenaming(false);
    } catch {
      notifications.error('Failed to rename lab');
    }
  };

  const handleActivate = async () => {
    try {
      await activateLabMutation.mutateAsync(labId);
      notifications.success('Lab activated');
    } catch {
      notifications.error('Failed to activate lab');
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateLabMutation.mutateAsync(labId);
      notifications.success('Lab deactivated');
      setDeactivateTarget(null);
    } catch {
      notifications.error('Failed to deactivate lab');
    }
  };

  const handleResetDemo = async () => {
    try {
      await resetDemoMutation.mutateAsync(labId);
      notifications.success('Demo data reset');
      setResetDemoConfirm(false);
    } catch {
      notifications.error('Failed to reset demo data');
    }
  };

  if (isLoading || !details) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
            Back
          </Button>
          <div className="text-center py-12 text-muted-foreground text-sm">
            Loading lab details...
          </div>
        </div>
      </div>
    );
  }

  const { lab, users: unsortedUsers, researcherCount, tubeCount, storageSummary } = details;

  const users = [...unsortedUsers].sort((a, b) => {
    if (!sortConfig) return 0;
    const { columnId, direction } = sortConfig;
    const aVal = String(a[columnId as keyof LabDetailsUser] ?? '');
    const bVal = String(b[columnId as keyof LabDetailsUser] ?? '');
    const cmp = aVal.localeCompare(bVal);
    return direction === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
            Back
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LabBadge labId={labId} labName={lab.name} size="md" />
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="px-2 py-1 text-lg font-semibold border border-border rounded bg-background text-foreground"
                  onKeyDown={e => e.key === 'Enter' && handleRename()}
                  ref={(el: HTMLInputElement | null) => el?.focus()}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRename}
                  isLoading={updateLabMutation.isPending}
                >
                  <Check size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsRenaming(false)}>
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-card-foreground">{lab.name}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewName(lab.name);
                    setIsRenaming(true);
                  }}
                >
                  <Pencil size={12} />
                </Button>
              </div>
            )}
            <Chip color={lab.isActive ? 'success' : 'default'} size="sm">
              {lab.isActive ? 'Active' : 'Inactive'}
            </Chip>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setResetDemoConfirm(true)}
              leftIcon={<RotateCcw size={14} />}
            >
              Reset Demo
            </Button>
            {lab.isActive ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeactivateTarget(labId)}
                className="text-danger-text"
              >
                Deactivate
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleActivate}
                isLoading={activateLabMutation.isPending}
              >
                Activate
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="info" size="sm" leftIcon={<ShieldUser />}>
              {users.filter(u => u.role === 'lab_admin').length}{' '}
              {users.filter(u => u.role === 'lab_admin').length === 1 ? 'admin' : 'admins'}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<UsersRound />}>
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<Dna />}>
              {researcherCount} {researcherCount === 1 ? 'researcher' : 'researchers'}
            </Chip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              color="info"
              size="sm"
              leftIcon={<Icon iconNode={refrigeratorFreezer} size={12} />}
            >
              {storageSummary.tankCount} {storageSummary.tankCount === 1 ? 'tank' : 'tanks'}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<Rows3 />}>
              {storageSummary.rackCount} {storageSummary.rackCount === 1 ? 'rack' : 'racks'}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<BoxIcon />}>
              {storageSummary.boxCount} {storageSummary.boxCount === 1 ? 'box' : 'boxes'}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<TestTube />}>
              {tubeCount} {tubeCount === 1 ? 'tube' : 'tubes'}
            </Chip>
          </div>
        </div>

        {/* Users Table */}
        <div>
          <h3 className="text-sm font-semibold text-card-foreground mb-3">Users</h3>
          <Table
            columns={getUserColumns(labId)}
            data={users}
            size="sm"
            rounded="lg"
            sortable
            sortConfig={sortConfig}
            onSort={setSortConfig}
            hoverable={false}
            emptyMessage="No users in this lab"
            aria-label="Lab users"
          />
        </div>

        <ConfirmDialog
          isOpen={deactivateTarget !== null}
          title="Deactivate Lab"
          message="Deactivating a lab prevents all its users from logging in. Lab data is preserved. This can be reversed."
          confirmText="Deactivate"
          variant="danger"
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivateTarget(null)}
        />

        <ConfirmDialog
          isOpen={resetDemoConfirm}
          title="Reset Demo Data"
          message="This will delete all tubes in demo tanks for this lab. This cannot be undone."
          confirmText="Reset"
          variant="danger"
          onConfirm={handleResetDemo}
          onCancel={() => setResetDemoConfirm(false)}
        />
      </div>
    </div>
  );
}

function getRoleLabel(role: string) {
  if (role === 'lab_admin') return 'Lab Admin';
  if (role === 'system_admin') return 'System Admin';
  return 'User';
}

function getStatusColor(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
}

function DemoCell({ user, labId }: { user: LabDetailsUser; labId: string }) {
  const setDemoMutation = useSetUserDemoStatusMutation();

  const handleToggle = async () => {
    try {
      await setDemoMutation.mutateAsync({ labId, userId: user.id, isDemo: !user.isDemo });
      notifications.success(`Demo status updated for ${user.username}`);
    } catch {
      notifications.error('Failed to update demo status');
    }
  };

  return (
    <button
      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      onClick={handleToggle}
      disabled={user.role !== 'user'}
      title={user.role !== 'user' ? 'Admins cannot be demo users' : 'Toggle demo status'}
    >
      {user.isDemo ? (
        <Chip color="warning" size="sm">
          Demo
        </Chip>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </button>
  );
}

function ActionsCell({ user, labId }: { user: LabDetailsUser; labId: string }) {
  const activateUserMutation = useActivateUserMutation();
  const deactivateUserMutation = useDeactivateUserMutation();
  const isPending = activateUserMutation.isPending || deactivateUserMutation.isPending;

  const handleActivate = async () => {
    try {
      await activateUserMutation.mutateAsync({ labId, userId: user.id });
      notifications.success(`${user.username} activated`);
    } catch {
      notifications.error('Failed to activate user');
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateUserMutation.mutateAsync({ labId, userId: user.id });
      notifications.success(`${user.username} deactivated`);
    } catch {
      notifications.error('Failed to deactivate user');
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {user.status !== 'approved' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleActivate}
          disabled={isPending}
          title="Approve user"
        >
          <UserCheck size={14} className="text-success-text" />
        </Button>
      )}
      {user.status === 'approved' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeactivate}
          disabled={isPending}
          title="Reject user"
        >
          <UserX size={14} className="text-danger-text" />
        </Button>
      )}
    </div>
  );
}

function getUserColumns(labId: string): TableColumn[] {
  return [
    {
      id: 'username',
      header: 'Username',
      accessor: 'username',
      sortable: true,
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
      id: 'status',
      header: 'Status',
      sortable: true,
      render: (_value, row) => (
        <Chip color={getStatusColor(String(row['status']))} size="sm">
          {String(row['status'])}
        </Chip>
      ),
    },
    {
      id: 'demo',
      header: 'Demo',
      render: (_value, row) => <DemoCell user={row as unknown as LabDetailsUser} labId={labId} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_value, row) => (
        <ActionsCell user={row as unknown as LabDetailsUser} labId={labId} />
      ),
    },
  ];
}
