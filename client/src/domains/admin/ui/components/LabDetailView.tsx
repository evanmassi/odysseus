import { useState } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import { DEMO_LIMITS_DEFAULTS } from '@odysseus/shared-schemas';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
  Activity,
  ArrowLeft,
  Box as BoxIcon,
  ChevronDown,
  Clock,
  Dna,
  Icon,
  Pencil,
  Power,
  Check,
  X,
  Rows3,
  Save,
  ShieldBan,
  ShieldUser,
  Sprout,
  TestTube,
  Trash2,
  UserRoundCheck,
  UsersRound,
  RotateCcw,
  TreeDeciduous,
} from 'lucide-react';

import { Button, Chip, NumberInput, Table, Tooltip } from '@shared/ui';
import { LabBadge } from '@shared/ui/components/badges/LabBadge';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { notifications } from '@shared/utils';

import {
  useLabDetailsQuery,
  useUpdateLabMutation,
  useActivateLabMutation,
  useDeactivateLabMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useSuspendUserMutation,
  useDeleteUserForLabMutation,
  useResetDemoDataMutation,
  useSeedDemoMutation,
  useUnseedDemoMutation,
  useDemoLimitsQuery,
  useUpdateDemoLimitsMutation,
} from '../../hooks/useSystemAdminQueries';

import { AuditLogViewer } from './AuditLogViewer';

import type { DemoLimits, LabDetailsUser } from '@odysseus/shared-schemas';
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
  const deleteUserMutation = useDeleteUserForLabMutation();
  const deactivateUserMutation = useDeactivateUserMutation();
  const suspendUserMutation = useSuspendUserMutation();
  const resetDemoMutation = useResetDemoDataMutation();
  const seedDemoMutation = useSeedDemoMutation();
  const unseedDemoMutation = useUnseedDemoMutation();
  const { data: demoLimits } = useDemoLimitsQuery(details?.lab.isDemo ? labId : null);
  const updateDemoLimitsMutation = useUpdateDemoLimitsMutation();

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<LabDetailsUser | null>(null);
  const [deactivateUserTarget, setDeactivateUserTarget] = useState<LabDetailsUser | null>(null);
  const [suspendUserTarget, setSuspendUserTarget] = useState<LabDetailsUser | null>(null);
  const [resetDemoConfirm, setResetDemoConfirm] = useState(false);
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [unseedConfirm, setUnseedConfirm] = useState(false);
  const [editedLimits, setEditedLimits] = useState<Partial<DemoLimits> | null>(null);
  const [userSortConfig, setUserSortConfig] = useState<SortConfig | undefined>(undefined);
  const [researcherSortConfig, setResearcherSortConfig] = useState<SortConfig | undefined>(
    undefined
  );

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

  const handleSeedDemo = async () => {
    try {
      await seedDemoMutation.mutateAsync(labId);
      notifications.success('Demo infrastructure seeded');
      setSeedConfirm(false);
    } catch {
      notifications.error('Failed to seed demo');
    }
  };

  const handleUnseedDemo = async () => {
    try {
      await unseedDemoMutation.mutateAsync(labId);
      notifications.success('Demo infrastructure unseeded');
      setUnseedConfirm(false);
    } catch {
      notifications.error('Failed to unseed demo');
    }
  };

  const handleSaveLimits = async () => {
    if (!editedLimits) return;
    try {
      await updateDemoLimitsMutation.mutateAsync({ labId, limits: editedLimits });
      notifications.success('Demo limits updated');
      setEditedLimits(null);
    } catch {
      notifications.error('Failed to update demo limits');
    }
  };

  if (isLoading || !details) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
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
    if (!userSortConfig) return 0;
    const { columnId, direction } = userSortConfig;
    const aVal = String(a[columnId as keyof LabDetailsUser] ?? '');
    const bVal = String(b[columnId as keyof LabDetailsUser] ?? '');
    const cmp = aVal.localeCompare(bVal);
    return direction === 'asc' ? cmp : -cmp;
  });

  const sortedResearchers = unsortedUsers
    .filter(u => u.researcher !== null)
    .sort((a, b) => {
      if (!researcherSortConfig) return 0;
      const { columnId, direction } = researcherSortConfig;
      let aVal: string;
      let bVal: string;
      if (columnId === 'researcherName') {
        aVal = a.researcher?.name ?? '';
        bVal = b.researcher?.name ?? '';
      } else if (columnId === 'tubeCount') {
        const diff = (a.researcher?.tubeCount ?? 0) - (b.researcher?.tubeCount ?? 0);
        return direction === 'asc' ? diff : -diff;
      } else if (columnId === 'lastActivity') {
        aVal = a.lastActivity;
        bVal = b.lastActivity;
      } else {
        aVal = String(a[columnId as keyof LabDetailsUser] ?? '');
        bVal = String(b[columnId as keyof LabDetailsUser] ?? '');
      }
      const cmp = aVal.localeCompare(bVal);
      return direction === 'asc' ? cmp : -cmp;
    });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
            Back
          </Button>
        </div>

        <div className="space-y-2 max-w-md">
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center gap-3">
              <LabBadge
                labId={labId}
                labName={lab.name}
                size="md"
                isDemo={lab.isDemo}
                isActive={lab.isActive}
              />
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
              {lab.isActive ? (
                <Button
                  variant="danger"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setDeactivateTarget(labId)}
                  leftIcon={<Power size={14} />}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="ml-auto"
                  onClick={handleActivate}
                  isLoading={activateLabMutation.isPending}
                >
                  Activate
                </Button>
              )}
            </div>
            {lab.isDemo && (
              <div className="flex items-center gap-2">
                <Chip color="default" size="sm">
                  Demo
                </Chip>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
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
        </div>

        {/* Demo Configuration */}
        {lab.isDemo && (
          <Collapsible.Root
            defaultOpen={false}
            className="rounded-lg border border-border bg-card max-w-md"
          >
            <Collapsible.Trigger className="flex w-full items-center justify-between p-3 cursor-pointer group">
              <div className="flex items-center gap-2">
                <ChevronDown
                  size={14}
                  className="text-secondary-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90"
                />
                <h3 className="text-sm font-semibold text-card-foreground">Demo Configuration</h3>
              </div>
              <Chip color={details.isSeeded ? 'success' : 'default'} size="sm">
                {details.isSeeded ? 'Seeded' : 'Not Seeded'}
              </Chip>
            </Collapsible.Trigger>
            <Collapsible.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
              <div className="px-3 pb-3 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                    <div>
                      <h5 className="text-sm font-medium text-card-foreground">Additional Tanks</h5>
                      <p className="text-xs text-secondary-foreground">
                        Max tanks beyond seeded baseline
                      </p>
                    </div>
                    <NumberInput
                      value={
                        editedLimits?.maxTanks ??
                        demoLimits?.maxTanks ??
                        DEMO_LIMITS_DEFAULTS.maxTanks
                      }
                      onChange={v => setEditedLimits(prev => ({ ...prev, maxTanks: v }))}
                      min={0}
                      max={50}
                      size="sm"
                      aria-label="Max additional tanks"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                    <div>
                      <h5 className="text-sm font-medium text-card-foreground">
                        Additional Racks per Tank
                      </h5>
                      <p className="text-xs text-secondary-foreground">
                        Max racks beyond seeded baseline
                      </p>
                    </div>
                    <NumberInput
                      value={
                        editedLimits?.maxRacksPerTank ??
                        demoLimits?.maxRacksPerTank ??
                        DEMO_LIMITS_DEFAULTS.maxRacksPerTank
                      }
                      onChange={v => setEditedLimits(prev => ({ ...prev, maxRacksPerTank: v }))}
                      min={0}
                      max={50}
                      size="sm"
                      aria-label="Max racks per tank"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                    <div>
                      <h5 className="text-sm font-medium text-card-foreground">
                        Additional Boxes per Rack
                      </h5>
                      <p className="text-xs text-secondary-foreground">
                        Max boxes beyond seeded baseline
                      </p>
                    </div>
                    <NumberInput
                      value={
                        editedLimits?.maxBoxesPerRack ??
                        demoLimits?.maxBoxesPerRack ??
                        DEMO_LIMITS_DEFAULTS.maxBoxesPerRack
                      }
                      onChange={v => setEditedLimits(prev => ({ ...prev, maxBoxesPerRack: v }))}
                      min={0}
                      max={26}
                      size="sm"
                      aria-label="Max boxes per rack"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  {editedLimits && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveLimits}
                      isLoading={updateDemoLimitsMutation.isPending}
                      leftIcon={<Save size={14} />}
                    >
                      Save Limits
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setResetDemoConfirm(true)}
                    leftIcon={<RotateCcw size={14} />}
                  >
                    Reset Demo
                  </Button>
                  {details.isSeeded ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setUnseedConfirm(true)}
                      leftIcon={<TreeDeciduous size={14} />}
                      isLoading={unseedDemoMutation.isPending}
                    >
                      Unseed
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSeedConfirm(true)}
                      leftIcon={<Sprout size={14} />}
                      isLoading={seedDemoMutation.isPending}
                    >
                      Seed Demo
                    </Button>
                  )}
                </div>
              </div>
            </Collapsible.Content>
          </Collapsible.Root>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-3">
              <UsersRound size={16} className="text-secondary-foreground" />
              <h3 className="text-sm font-semibold text-card-foreground">Users</h3>
            </div>
            <Table
              columns={getUserColumns(
                labId,
                setDeleteUserTarget,
                setDeactivateUserTarget,
                setSuspendUserTarget
              )}
              data={users}
              size="sm"
              rounded="lg"
              sortable
              sortConfig={userSortConfig}
              onSort={setUserSortConfig}
              hoverable={false}
              emptyMessage="No users in this lab"
              aria-label="Lab users"
            />
          </div>
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Dna size={16} className="text-secondary-foreground" />
              <h3 className="text-sm font-semibold text-card-foreground">Researchers</h3>
            </div>
            <Table
              columns={getResearcherColumns()}
              data={sortedResearchers}
              size="sm"
              rounded="lg"
              sortable
              sortConfig={researcherSortConfig}
              onSort={setResearcherSortConfig}
              hoverable={false}
              emptyMessage="No researchers in this lab"
              aria-label="Lab researchers"
            />
          </div>
        </div>

        <Collapsible.Root defaultOpen={false} className="rounded-lg border border-border bg-card">
          <Collapsible.Trigger className="flex w-full items-center justify-between p-3 cursor-pointer group">
            <div className="flex items-center gap-2">
              <ChevronDown
                size={14}
                className="text-secondary-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90"
              />
              <Activity size={16} className="text-secondary-foreground" />
              <h3 className="text-sm font-semibold text-card-foreground">Audit Log</h3>
            </div>
          </Collapsible.Trigger>
          <Collapsible.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
            <div className="px-3 pb-3">
              <AuditLogViewer labId={labId} readOnly />
            </div>
          </Collapsible.Content>
        </Collapsible.Root>

        <ConfirmDialog
          isOpen={deactivateUserTarget !== null}
          title="Deactivate User"
          message={`Are you sure you want to deactivate "${deactivateUserTarget?.username}"? They will no longer be able to log in. This can be reversed.`}
          confirmText="Deactivate"
          variant="danger"
          isLoading={deactivateUserMutation.isPending}
          onConfirm={async () => {
            if (!deactivateUserTarget) return;
            try {
              await deactivateUserMutation.mutateAsync({ labId, userId: deactivateUserTarget.id });
              notifications.success(`${deactivateUserTarget.username} deactivated`);
              setDeactivateUserTarget(null);
            } catch {
              notifications.error('Failed to deactivate user');
              setDeactivateUserTarget(null);
            }
          }}
          onCancel={() => setDeactivateUserTarget(null)}
        />

        <ConfirmDialog
          isOpen={suspendUserTarget !== null}
          title="Suspend User"
          message={`Are you sure you want to suspend "${suspendUserTarget?.username}"? They will no longer be able to log in. Only a system administrator can reverse this.`}
          confirmText="Suspend"
          variant="danger"
          isLoading={suspendUserMutation.isPending}
          onConfirm={async () => {
            if (!suspendUserTarget) return;
            try {
              await suspendUserMutation.mutateAsync({ labId, userId: suspendUserTarget.id });
              notifications.success(`${suspendUserTarget.username} suspended`);
              setSuspendUserTarget(null);
            } catch {
              notifications.error('Failed to suspend user');
              setSuspendUserTarget(null);
            }
          }}
          onCancel={() => setSuspendUserTarget(null)}
        />

        <ConfirmDialog
          isOpen={deleteUserTarget !== null}
          title="Delete User"
          message={`Are you sure you want to delete "${deleteUserTarget?.username}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          isLoading={deleteUserMutation.isPending}
          onConfirm={async () => {
            if (!deleteUserTarget) return;
            try {
              await deleteUserMutation.mutateAsync({ labId, userId: deleteUserTarget.id });
              notifications.success(`${deleteUserTarget.username} deleted`);
              setDeleteUserTarget(null);
            } catch {
              notifications.error('Failed to delete user');
              setDeleteUserTarget(null);
            }
          }}
          onCancel={() => setDeleteUserTarget(null)}
        />

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
          message="This will delete all tubes and remove all non-seeded infrastructure, returning to the clean seeded state. This cannot be undone."
          confirmText="Reset"
          variant="danger"
          isLoading={resetDemoMutation.isPending}
          onConfirm={handleResetDemo}
          onCancel={() => setResetDemoConfirm(false)}
        />

        <ConfirmDialog
          isOpen={seedConfirm}
          title="Seed Demo Infrastructure"
          message="This will mark all current tanks, racks, and boxes as protected. Demo lab admins will not be able to edit or delete seeded resources."
          confirmText="Seed"
          variant="warning"
          isLoading={seedDemoMutation.isPending}
          onConfirm={handleSeedDemo}
          onCancel={() => setSeedConfirm(false)}
        />

        <ConfirmDialog
          isOpen={unseedConfirm}
          title="Unseed Demo Infrastructure"
          message="This will remove protection from all resources, allowing demo lab admins to modify them. You can re-seed after making changes."
          confirmText="Unseed"
          variant="warning"
          isLoading={unseedDemoMutation.isPending}
          onConfirm={handleUnseedDemo}
          onCancel={() => setUnseedConfirm(false)}
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

function ActionsCell({
  user,
  labId,
  onDeleteUser,
  onDeactivateUser,
  onSuspendUser,
}: {
  user: LabDetailsUser;
  labId: string;
  onDeleteUser: (user: LabDetailsUser) => void;
  onDeactivateUser: (user: LabDetailsUser) => void;
  onSuspendUser: (user: LabDetailsUser) => void;
}) {
  const activateUserMutation = useActivateUserMutation();

  const handleActivate = async () => {
    try {
      await activateUserMutation.mutateAsync({ labId, userId: user.id });
      notifications.success(`${user.username} activated`);
    } catch {
      notifications.error('Failed to activate user');
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
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
          <Tooltip content="Deactivate user">
            <Button
              variant="ghost-danger"
              size="xs"
              iconOnly
              onClick={() => onDeactivateUser(user)}
              aria-label="Deactivate user"
            >
              <Power size={16} />
            </Button>
          </Tooltip>
          <Tooltip content="Suspend user">
            <Button
              variant="ghost-danger"
              size="xs"
              iconOnly
              onClick={() => onSuspendUser(user)}
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
            disabled={isPending}
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
            disabled={isPending}
            aria-label="Unsuspend user"
          >
            <UserRoundCheck size={16} className="text-success-text" />
          </Button>
        </Tooltip>
      )}
      <Tooltip content="Delete user">
        <Button
          variant="ghost-danger"
          size="xs"
          iconOnly
          onClick={() => onDeleteUser(user)}
          disabled={isPending}
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
  onDeleteUser: (user: LabDetailsUser) => void,
  onDeactivateUser: (user: LabDetailsUser) => void,
  onSuspendUser: (user: LabDetailsUser) => void
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
      header: '',
      align: 'right',
      render: (_value, row) => (
        <ActionsCell
          user={row as unknown as LabDetailsUser}
          labId={labId}
          onDeleteUser={onDeleteUser}
          onDeactivateUser={onDeactivateUser}
          onSuspendUser={onSuspendUser}
        />
      ),
    },
  ];
}

function getResearcherColumns(): TableColumn[] {
  return [
    {
      id: 'researcherName',
      header: 'Researcher',
      sortable: true,
      render: (_value, row) => {
        const researcher = row['researcher'] as { name: string; tubeCount: number } | null;
        return <span>{researcher?.name ?? '-'}</span>;
      },
    },
    {
      id: 'username',
      header: 'User',
      sortable: true,
      render: (_value, row) => (
        <span className="text-muted-foreground">{String(row['username'])}</span>
      ),
    },
    {
      id: 'tubeCount',
      header: 'Tubes',
      sortable: true,
      render: (_value, row) => {
        const researcher = row['researcher'] as { name: string; tubeCount: number } | null;
        if (!researcher) return <span className="text-muted-foreground">-</span>;
        return (
          <Chip
            size="sm"
            color={researcher.tubeCount > 0 ? 'primary' : 'default'}
            className={researcher.tubeCount > 0 ? 'border border-action' : 'border border-border'}
          >
            {researcher.tubeCount}
          </Chip>
        );
      },
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
  ];
}
