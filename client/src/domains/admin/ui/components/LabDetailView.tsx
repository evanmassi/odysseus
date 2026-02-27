import { useState } from 'react';

import {
  ArrowLeft,
  Building2,
  Users,
  TestTubes,
  Dna,
  Database,
  Pencil,
  Check,
  X,
  UserCheck,
  UserX,
  RotateCcw,
} from 'lucide-react';

import { Button, Chip } from '@shared/ui';
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

  const { lab, users, researcherCount, tubeCount, storageSummary } = details;

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
            <Building2 size={24} className="text-secondary-foreground" />
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

        <div className="text-xs text-muted-foreground">Slug: {lab.slug}</div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-muted rounded-lg text-center">
            <Users size={16} className="mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold text-foreground">{users.length}</div>
            <div className="text-xs text-muted-foreground">Users</div>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <Dna size={16} className="mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold text-foreground">{researcherCount}</div>
            <div className="text-xs text-muted-foreground">Researchers</div>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <TestTubes size={16} className="mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold text-foreground">{tubeCount}</div>
            <div className="text-xs text-muted-foreground">Tubes</div>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <Database size={16} className="mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold text-foreground">
              {storageSummary.tankCount}T / {storageSummary.rackCount}R / {storageSummary.boxCount}B
            </div>
            <div className="text-xs text-muted-foreground">Storage</div>
          </div>
        </div>

        {/* Users Table */}
        <div>
          <h3 className="text-sm font-semibold text-card-foreground mb-3">Users</h3>
          {users.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No users in this lab
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Username</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Role</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Demo</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map(user => (
                    <UserRow key={user.id} user={user} labId={labId} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

function UserRow({ user, labId }: { user: LabDetailsUser; labId: string }) {
  const activateUserMutation = useActivateUserMutation();
  const deactivateUserMutation = useDeactivateUserMutation();
  const setDemoMutation = useSetUserDemoStatusMutation();

  const roleLabel =
    user.role === 'lab_admin'
      ? 'Lab Admin'
      : user.role === 'system_admin'
        ? 'System Admin'
        : 'User';
  const statusColor =
    user.status === 'approved' ? 'success' : user.status === 'pending' ? 'warning' : 'danger';

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

  const handleToggleDemo = async () => {
    try {
      await setDemoMutation.mutateAsync({ labId, userId: user.id, isDemo: !user.isDemo });
      notifications.success(`Demo status updated for ${user.username}`);
    } catch {
      notifications.error('Failed to update demo status');
    }
  };

  const isPending = activateUserMutation.isPending || deactivateUserMutation.isPending;

  return (
    <tr>
      <td className="px-3 py-2 text-foreground">{user.username}</td>
      <td className="px-3 py-2">
        <Chip color="default" size="sm">
          {roleLabel}
        </Chip>
      </td>
      <td className="px-3 py-2">
        <Chip color={statusColor} size="sm">
          {user.status}
        </Chip>
      </td>
      <td className="px-3 py-2">
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleToggleDemo}
          disabled={user.role !== 'user'}
          title={user.role !== 'user' ? 'Admins cannot be demo users' : `Toggle demo status`}
        >
          {user.isDemo ? (
            <Chip color="warning" size="sm">
              Demo
            </Chip>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </button>
      </td>
      <td className="px-3 py-2 text-right">
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
      </td>
    </tr>
  );
}
