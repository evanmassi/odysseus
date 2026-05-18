/**
 * Labs Panel
 *
 * Lab management panel — lab cards, creation, and drill-down into individual labs.
 */

import { useMemo, useState } from 'react';

import {
  ArrowRight,
  CircleCheckBig,
  Dna,
  OctagonX,
  FlaskConical,
  Plus,
  BeanOff,
  ShieldUser,
  Sprout,
  TestTube,
  TicketCheck,
  Copy,
  Power,
  RefreshCw,
  UsersRound,
} from 'lucide-react';

import { BracketedStamp, Button, CrtBackdrop, IdStamp, SectionHeader, StatCell } from '@shared/ui';
import { LabBadge, getLabBadgeTextClasses } from '@shared/ui/components/badges/LabBadge';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import {
  useCreateLabMutation,
  useDeactivateLabMutation,
  useActivateLabMutation,
  useCreateLabInviteCodeMutation,
} from '../../../hooks/useLabMutations';
import { useLabsQuery, useSystemOverviewQuery } from '../../../hooks/useLabQueries';

import type { InviteCodeData } from '@odysseus/shared-schemas';

// 48-hour window gives lab admins time to register without codes lingering
const LAB_ADMIN_CODE_EXPIRY_MS = 48 * 60 * 60 * 1000;

interface LabsPanelProps {
  onSelectLab: (labId: string) => void;
}

export function LabsPanel({ onSelectLab }: LabsPanelProps) {
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
        createResearcher: true,
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
    const statusBgVar = lab.isActive ? '--color-success-bg' : '--color-danger-bg';

    return (
      <div key={lab.id} className="relative pt-2">
        <div className="absolute top-0 left-6 z-10 flex h-7 items-center border-x border-t-2 border-foreground/10 border-t-transparent px-4">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5"
            style={{
              background: `linear-gradient(90deg, transparent 0%, hsl(var(${statusBgVar})/0.85) 14%, hsl(var(${statusBgVar})) 50%, hsl(var(${statusBgVar})/0.85) 86%, transparent 100%)`,
            }}
          />
          <span className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.22em] whitespace-nowrap uppercase">
            <span className="text-foreground">{lab.name}</span>
            <span className="text-foreground/40">·</span>
            <span
              className={`flex items-center gap-1.5 ${lab.isActive ? 'text-success-text' : 'text-danger-text'}`}
            >
              {lab.isActive ? <CircleCheckBig size={11} /> : <OctagonX size={11} />}
              {lab.isActive ? 'active' : 'deactivated'}
            </span>
            {lab.isDemo && (
              <>
                <span className="text-foreground/40">·</span>
                <span
                  className={`flex items-center gap-1.5 ${lab.isSeeded ? 'text-success-text' : 'text-warning-text'}`}
                >
                  {lab.isSeeded ? <Sprout size={11} /> : <BeanOff size={11} />}
                  {lab.isSeeded ? 'seeded' : 'not seeded'}
                </span>
              </>
            )}
          </span>
        </div>

        <CrtBackdrop size="lg" lighting="anchored">
          {!lab.isActive && (
            <span
              aria-hidden
              className="pointer-events-none absolute -right-2 -bottom-2 -rotate-6 font-mono text-[64px] font-semibold tracking-[0.10em] whitespace-nowrap text-danger-bg/5 uppercase select-none"
            >
              Deactivated
            </span>
          )}

          <div className="relative flex items-stretch gap-3 px-4 pt-7 pb-3">
            <div
              className={`flex shrink-0 flex-col items-center gap-2 ${getLabBadgeTextClasses(lab.id, lab.isDemo)}`}
            >
              <LabBadge
                labId={lab.id}
                labName={lab.name}
                size="md"
                isDemo={lab.isDemo}
                isActive={lab.isActive}
              />
              <span
                aria-hidden
                className="w-px flex-1"
                style={{
                  background:
                    'linear-gradient(to bottom, color-mix(in srgb, currentColor 30%, transparent), transparent)',
                }}
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="mb-1 grid grid-cols-[4fr_1.6fr] items-end">
                <div className="ml-2 flex min-w-0 flex-col gap-2">
                  <h3 className="font-display text-[28px] leading-none font-medium tracking-[-0.01em] text-foreground">
                    {lab.name}
                  </h3>
                  {stats && (
                    <IdStamp
                      parts={[
                        `${stats.tankCount} ${stats.tankCount === 1 ? 'tank' : 'tanks'}`,
                        `${stats.rackCount} ${stats.rackCount === 1 ? 'rack' : 'racks'}`,
                        `${stats.boxCount} ${stats.boxCount === 1 ? 'box' : 'boxes'}`,
                      ]}
                    />
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 px-4">
                  {lab.isActive ? (
                    <Button
                      variant="ghost-danger"
                      size="sm"
                      onClick={() => setDeactivateTarget(lab.id)}
                      leftIcon={<Power size={14} />}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleActivateLab(lab.id)}
                      isLoading={activateLabMutation.isPending}
                      leftIcon={<Power size={14} />}
                    >
                      Activate
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onSelectLab(lab.id)}
                    rightIcon={<ArrowRight size={14} />}
                  >
                    Open Lab
                  </Button>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-[repeat(4,1fr)_1.6fr] divide-x divide-line-soft [&>*:not(:first-child)]:[border-image:linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.13)_8%,hsl(var(--foreground)/0.13)_84%,transparent_100%)_1]">
                  <StatCell
                    label="Admins"
                    value={stats.adminCount}
                    icon={<ShieldUser size={11} />}
                  />
                  <StatCell label="Users" value={stats.userCount} icon={<UsersRound size={11} />} />
                  <StatCell
                    label="Researchers"
                    value={stats.researcherCount}
                    icon={<Dna size={11} />}
                  />
                  <StatCell label="Tubes" value={stats.tubeCount} icon={<TestTube size={11} />} />
                  <div className="flex flex-col gap-1 px-4 py-3.5">
                    <span className="flex items-center gap-2 font-mono text-[9.5px] tracking-[0.20em] text-muted-foreground uppercase">
                      <TicketCheck size={11} className="shrink-0" />
                      Lab Admin Code
                    </span>
                    <div className="flex items-center gap-2">
                      <code
                        className={`flex-1 truncate font-mono text-[15px] font-medium leading-none phosphor-text ${codes.length > 0 ? '' : 'tracking-widest text-foreground/25 select-none'}`}
                      >
                        {codes.length > 0 ? codes[codes.length - 1].code : '· · · · · · ·'}
                      </code>
                      <button
                        type="button"
                        aria-label="Copy to clipboard"
                        onClick={async () => {
                          if (codes.length === 0) return;
                          await navigator.clipboard.writeText(codes[codes.length - 1].code);
                          notifications.success('Copied');
                        }}
                        disabled={codes.length === 0}
                        className="shrink-0 text-foreground/40 transition-colors hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateLabAdminCode(lab.id)}
                      disabled={!lab.isActive || generatingCodeForLab === lab.id}
                      className="mt-0.5 text-left font-mono text-[10px] tracking-[0.1em] text-muted-foreground/60 uppercase transition-colors hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {codes.length > 0 ? 'Regenerate' : 'Generate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CrtBackdrop>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <BracketedStamp
        title="Labs"
        icon={<FlaskConical size={14} />}
        actions={
          <>
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
          </>
        }
      />

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
        <>
          {regularLabs.length > 0 && (
            <div>
              <SectionHeader
                title="Registered"
                meta={`${regularLabs.length} ${regularLabs.length === 1 ? 'record' : 'records'}`}
              />
              <div className="space-y-5">{regularLabs.map(lab => renderLabCard(lab))}</div>
            </div>
          )}

          {demoLabs.length > 0 && (
            <div>
              <SectionHeader
                title="Demo"
                meta={`${demoLabs.length} ${demoLabs.length === 1 ? 'record' : 'records'}`}
              />
              <div className="space-y-5">{demoLabs.map(lab => renderLabCard(lab))}</div>
            </div>
          )}
        </>
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
  );
}
