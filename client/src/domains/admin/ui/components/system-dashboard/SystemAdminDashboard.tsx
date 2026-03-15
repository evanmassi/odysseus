/**
 * System Admin Dashboard
 *
 * Landing page for system admins: lab overview, lab creation, and drill-down into individual labs.
 */

import { useMemo, useState } from 'react';

import {
  Activity,
  CircleAlert,
  CircleCheckBig,
  OctagonX,
  Clock,
  Dna,
  FlaskConical,
  LayoutDashboard,
  Plus,
  ShieldUser,
  BeanOff,
  Sprout,
  TestTube,
  UsersRound,
  TicketCheck,
  Copy,
  Power,
  RefreshCw,
} from 'lucide-react';

import { Button, Chip } from '@shared/ui';
import { LabBadge } from '@shared/ui/components/badges';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { notifications } from '@shared/utils';

import {
  useCreateLabMutation,
  useDeactivateLabMutation,
  useActivateLabMutation,
  useCreateLabInviteCodeMutation,
} from '../../../hooks/useLabMutations';
import { useLabsQuery, useSystemOverviewQuery } from '../../../hooks/useLabQueries';

import { LabDashboard } from './LabDashboard';

import type { InviteCodeData } from '@odysseus/shared-schemas';

// 48-hour window gives lab admins time to register without codes lingering
const LAB_ADMIN_CODE_EXPIRY_MS = 48 * 60 * 60 * 1000;

export function SystemAdminDashboard() {
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const { data: labs = [], isLoading, refetch } = useLabsQuery();
  const { data: overview, refetch: refetchOverview } = useSystemOverviewQuery();
  const createLabMutation = useCreateLabMutation();
  const deactivateLabMutation = useDeactivateLabMutation();
  const activateLabMutation = useActivateLabMutation();
  const createInviteCodeMutation = useCreateLabInviteCodeMutation();

  const regularLabs = useMemo(
    () => labs.filter(l => !l.isDemo).sort((a, b) => a.name.localeCompare(b.name)),
    [labs]
  );
  const demoLabs = useMemo(() => labs.filter(l => l.isDemo), [labs]);

  const [showCreateLab, setShowCreateLab] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);
  const [generatingCodeForLab, setGeneratingCodeForLab] = useState<string | null>(null);
  const [labInviteCodes, setLabInviteCodes] = useState<Record<string, InviteCodeData[]>>({});

  const handleRefresh = () => {
    void refetch();
    void refetchOverview();
  };

  const demoLabExists = labs.some(lab => lab.isDemo);

  const handleCreateDemoLab = async () => {
    try {
      await createLabMutation.mutateAsync({ name: 'Demo Lab', isDemo: true });
      notifications.success('Demo lab created');
    } catch {
      notifications.error('Failed to create demo lab');
    }
  };

  const handleCreateLab = async () => {
    if (!newLabName.trim()) return;

    try {
      await createLabMutation.mutateAsync({ name: newLabName.trim() });
      notifications.success(`Lab "${newLabName.trim()}" created`);
      setNewLabName('');
      setShowCreateLab(false);
    } catch {
      notifications.error('Failed to create lab');
    }
  };

  const handleDeactivateLab = async (labId: string) => {
    try {
      await deactivateLabMutation.mutateAsync(labId);
      notifications.success('Lab deactivated');
      setDeactivateTarget(null);
    } catch {
      notifications.error('Failed to deactivate lab');
    }
  };

  const handleActivateLab = async (labId: string) => {
    try {
      await activateLabMutation.mutateAsync(labId);
      notifications.success('Lab activated');
    } catch {
      notifications.error('Failed to activate lab');
    }
  };

  const handleGenerateLabAdminCode = async (labId: string) => {
    setGeneratingCodeForLab(labId);
    try {
      const expiresAt = new Date(Date.now() + LAB_ADMIN_CODE_EXPIRY_MS).toISOString();
      const code = await createInviteCodeMutation.mutateAsync({
        labId,
        role: 'lab_admin',
        maxUses: 1,
        expiresAt,
      });
      setLabInviteCodes(prev => ({
        ...prev,
        [labId]: [...(prev[labId] ?? []), code],
      }));
      await navigator.clipboard.writeText(code.code);
      notifications.success('Lab admin invite code created and copied to clipboard');
    } catch {
      notifications.error('Failed to generate invite code');
    } finally {
      setGeneratingCodeForLab(null);
    }
  };

  const getLabStats = (labId: string) => {
    return overview?.labStats.find(s => s.labId === labId);
  };

  const renderLabCard = (lab: (typeof labs)[number]) => {
    const stats = getLabStats(lab.id);
    const codes = labInviteCodes[lab.id] ?? [];

    return (
      <div
        key={lab.id}
        className={`px-4 py-3 rounded-lg space-y-2 cursor-pointer transition-colors outline outline-1 outline-offset-4 ${
          lab.isDemo
            ? 'bg-demo-light outline-demo-text/50 hover:bg-demo-light-hover'
            : 'bg-muted outline-secondary-foreground/50 hover:bg-muted-hover'
        }`}
        onClick={() => setSelectedLabId(lab.id)}
        onKeyDown={e => {
          if (e.key === 'Enter') setSelectedLabId(lab.id);
        }}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LabBadge labId={lab.id} labName={lab.name} size="md" isDemo={lab.isDemo} />
            <h4 className="text-sm font-semibold text-card-foreground">{lab.name}</h4>
          </div>
          <div className="flex items-center gap-1.5">
            {lab.isDemo && (
              <Chip
                color={lab.isSeeded ? 'success' : 'warning'}
                size="sm"
                leftIcon={lab.isSeeded ? <Sprout /> : <BeanOff />}
              >
                {lab.isSeeded ? 'Seeded' : 'Not Seeded'}
              </Chip>
            )}
            <Chip
              color={lab.isActive ? 'success' : 'danger'}
              size="sm"
              leftIcon={lab.isActive ? <CircleCheckBig /> : <OctagonX />}
            >
              {lab.isActive ? 'Active' : 'Deactivated'}
            </Chip>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {stats && (
              <>
                {stats.adminCount > 0 && (
                  <Chip color="info" size="sm" leftIcon={<ShieldUser />}>
                    {stats.adminCount} {stats.adminCount === 1 ? 'admin' : 'admins'}
                  </Chip>
                )}
                {stats.userCount > 0 && (
                  <Chip color="info" size="sm" leftIcon={<UsersRound />}>
                    {stats.userCount} {stats.userCount === 1 ? 'user' : 'users'}
                  </Chip>
                )}
                {stats.researcherCount > 0 && (
                  <Chip color="info" size="sm" leftIcon={<Dna />}>
                    {stats.researcherCount} {stats.researcherCount === 1 ? 'researcher' : 'researchers'}
                  </Chip>
                )}
                {stats.tubeCount > 0 && (
                  <Chip color="info" size="sm" leftIcon={<TestTube />}>
                    {stats.tubeCount} {stats.tubeCount === 1 ? 'tube' : 'tubes'}
                  </Chip>
                )}
              </>
            )}
          </div>
          <div
            className="flex items-center gap-2"
            role="presentation"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleGenerateLabAdminCode(lab.id)}
              isLoading={generatingCodeForLab === lab.id}
              leftIcon={<TicketCheck size={14} />}
              disabled={!lab.isActive}
            >
              Lab Admin Code
            </Button>
            {lab.isActive ? (
              <Tooltip content="Deactivate lab">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeactivateTarget(lab.id)}
                  className="text-danger-text hover:text-danger-text"
                >
                  <Power size={14} />
                </Button>
              </Tooltip>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleActivateLab(lab.id)}
                isLoading={activateLabMutation.isPending}
              >
                Activate
              </Button>
            )}
          </div>
        </div>

        {codes.length > 0 && (
          <div
            className="flex justify-end"
            role="presentation"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            <div className="space-y-1">
              {codes.map(code => (
                <div key={code.id} className="flex items-center gap-2 text-xs">
                  <code className="font-mono font-semibold bg-background px-2 py-0.5 rounded border border-border">
                    {code.code}
                  </code>
                  <Tooltip content="Copy to clipboard">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(code.code);
                        notifications.success('Copied');
                      }}
                    >
                      <Copy size={12} />
                    </Button>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (selectedLabId) {
    return <LabDashboard labId={selectedLabId} onBack={() => setSelectedLabId(null)} />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={18} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold text-card-foreground">Overview</h2>
        </div>

        {overview && (
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="info" size="sm" leftIcon={<FlaskConical />}>
              {overview.activeLabs} {overview.activeLabs === 1 ? 'lab' : 'labs'} active
              {overview.inactiveLabs > 0 && ` · ${overview.inactiveLabs} inactive`}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<Activity />}>
              {overview.activeUsersLast24h} {overview.activeUsersLast24h === 1 ? 'user' : 'users'}{' '}
              active today
            </Chip>
            <Chip
              color={overview.pendingApprovals > 0 ? 'warning' : 'success'}
              size="sm"
              leftIcon={overview.pendingApprovals > 0 ? <CircleAlert /> : <Clock />}
            >
              {overview.pendingApprovals} {overview.pendingApprovals === 1 ? 'user' : 'users'}{' '}
              pending
            </Chip>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-muted-foreground" />
            <h3 className="text-lg font-semibold text-card-foreground">Labs</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
            >
              Refresh
            </Button>
            {!demoLabExists && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCreateDemoLab}
                isLoading={createLabMutation.isPending}
                leftIcon={<Plus size={14} />}
              >
                Create Demo Lab
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateLab(true)}
              leftIcon={<Plus size={14} />}
            >
              Create Lab
            </Button>
          </div>
        </div>

        {showCreateLab && (
          <div className="p-3 bg-muted rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-card-foreground">New Lab</h4>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="new-lab-name" className="text-xs text-muted-foreground block mb-1">
                  Lab name
                </label>
                <input
                  id="new-lab-name"
                  type="text"
                  value={newLabName}
                  onChange={e => setNewLabName(e.target.value)}
                  placeholder="e.g., Smith Lab"
                  className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground"
                  maxLength={200}
                  onKeyDown={e => e.key === 'Enter' && handleCreateLab()}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCreateLab()}
                  isLoading={createLabMutation.isPending}
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateLab(false);
                    setNewLabName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading && labs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading labs...</div>
        ) : (
          <div className="space-y-5">
            {regularLabs.map(lab => renderLabCard(lab))}

            {demoLabs.length > 0 && regularLabs.length > 0 && (
              <div className="py-3">
                <div className="h-px bg-muted-foreground/60" />
              </div>
            )}

            {demoLabs.map(lab => renderLabCard(lab))}
          </div>
        )}

        <ConfirmDialog
          isOpen={deactivateTarget !== null}
          title="Deactivate Lab"
          message="Deactivating a lab prevents all its users from logging in. Lab data is preserved. This can be reversed."
          confirmText="Deactivate"
          variant="danger"
          onConfirm={() => deactivateTarget && handleDeactivateLab(deactivateTarget)}
          onCancel={() => setDeactivateTarget(null)}
        />
      </div>
    </div>
  );
}
