/**
 * Labs Panel
 *
 * Lab management panel — lab cards, creation, and drill-down into individual labs.
 */

import { useMemo, useState } from 'react';

import {
  CircleCheckBig,
  Dna,
  OctagonX,
  FlaskConical,
  Plus,
  BeanOff,
  ShieldUser,
  Sprout,
  TestTubeDiagonal,
  TicketCheck,
  Copy,
  RefreshCw,
  UsersRound,
} from 'lucide-react';

import { BracketedStamp, Button, ConsolePanel, IdStamp, SectionHeader, StatCell } from '@shared/ui';
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

import { LabPowerToggle } from './LabPowerToggle';

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
    const latestCode = codes[codes.length - 1]?.code;
    // Keep the unique segments unbreakable; only the fixed ODYSS- prefix may wrap.
    const codeSplitAt = latestCode ? latestCode.indexOf('-') + 1 : 0;
    const statusVar = lab.isActive ? '--color-success-bg' : '--color-danger-bg';
    const statusTextClass = lab.isActive ? 'text-success-text' : 'text-danger-text';
    const identityTextClass = getLabBadgeTextClasses(lab.id, lab.isDemo);

    const statusColor = `hsl(var(${statusVar}))`;

    return (
      <div key={lab.id} className="relative pt-7">
        <div
          aria-hidden
          className="absolute inset-x-0 top-3 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, hsl(var(${statusVar})/0.6) 9%, hsl(var(${statusVar})/0.6) 91%, transparent 100%)`,
            boxShadow: `0 0 8px hsl(var(${statusVar})/0.4)`,
          }}
        />
        <div className="absolute top-1.5 left-1/2 z-10 -translate-x-1/2 bg-page px-3">
          <span className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.22em] whitespace-nowrap uppercase">
            <span className="text-foreground">{lab.name}</span>
            <span className="text-foreground/35">{'//'}</span>
            <span className={`flex items-center gap-1.5 ${statusTextClass}`}>
              {lab.isActive ? <CircleCheckBig size={11} /> : <OctagonX size={11} />}
              {lab.isActive ? 'active' : 'deactivated'}
            </span>
            {lab.isDemo && (
              <>
                <span className="text-foreground/35">{'//'}</span>
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

        <ConsolePanel
          className={`flex items-stretch ${identityTextClass}`}
          statusColor={statusColor}
          identityColor="currentColor"
        >
          <div
            className={`flex w-14 shrink-0 flex-col items-center border-r border-line-soft pt-5 ${identityTextClass}`}
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
              className="mb-4 w-px flex-1"
              style={{
                background:
                  'linear-gradient(180deg, currentColor 0%, currentColor 24%, color-mix(in srgb, currentColor 45%, transparent) 60%, transparent 100%)',
                filter:
                  'drop-shadow(0 0 3px currentColor) drop-shadow(0 0 10px color-mix(in srgb, currentColor 55%, transparent))',
              }}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-stretch">
              <div className="flex min-w-0 flex-1 flex-col gap-2 px-5 pt-5 pb-4">
                <h3 className="font-display text-[28px] leading-none font-medium tracking-[-0.01em]">
                  <button
                    type="button"
                    onClick={() => onSelectLab(lab.id)}
                    className="cursor-pointer text-left text-foreground transition-[text-shadow] duration-200 outline-none hover:[text-shadow:0_0_2px_currentColor,0_0_14px_color-mix(in_srgb,currentColor_70%,transparent)] focus-visible:[text-shadow:0_0_2px_currentColor,0_0_14px_color-mix(in_srgb,currentColor_70%,transparent)]"
                  >
                    {lab.name}
                  </button>
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
              <div
                className="flex aspect-square shrink-0 items-center justify-center border-l border-line-soft"
                style={{ background: 'rgba(0,0,0,0.13)' }}
              >
                <LabPowerToggle
                  isActive={lab.isActive}
                  isLoading={activateLabMutation.isPending || deactivateLabMutation.isPending}
                  onActivate={() => handleActivateLab(lab.id)}
                  onDeactivate={() => setDeactivateTarget(lab.id)}
                />
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-[repeat(4,1fr)_1.6fr] border-t border-line-faint divide-x divide-line-faint [&>*:not(:first-child)]:[border-image:linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.10)_10%,hsl(var(--foreground)/0.10)_86%,transparent_100%)_1]">
                <StatCell label="Admins" value={stats.adminCount} icon={<ShieldUser size={11} />} />
                <StatCell label="Users" value={stats.userCount} icon={<UsersRound size={11} />} />
                <StatCell
                  label="Researchers"
                  value={stats.researcherCount}
                  icon={<Dna size={11} />}
                />
                <StatCell
                  label="Tubes"
                  value={stats.tubeCount}
                  icon={<TestTubeDiagonal size={11} />}
                />
                <div className="flex flex-col gap-1.5 px-4 py-3.5">
                  <span className="flex items-center gap-2 font-mono text-[9.5px] tracking-[0.20em] text-muted-foreground uppercase">
                    <TicketCheck size={11} className="shrink-0" />
                    Lab Admin Code
                  </span>
                  <div className="flex items-center border border-line-mid bg-black/25 py-1.5 pl-2.5 shadow-[inset_0_1px_3px_-1px_rgba(0,0,0,0.45)]">
                    <code
                      className={`mr-auto pr-2 font-mono text-[15px] font-medium leading-none phosphor-text ${latestCode ? 'text-foreground' : 'text-foreground/25 select-none'}`}
                    >
                      {latestCode ? (
                        <>
                          {latestCode.slice(0, codeSplitAt)}
                          <span className="whitespace-nowrap">{latestCode.slice(codeSplitAt)}</span>
                        </>
                      ) : (
                        <>
                          ODYSS-<span className="whitespace-nowrap">XXXX-XXXX</span>
                        </>
                      )}
                    </code>
                    <button
                      type="button"
                      aria-label="Copy to clipboard"
                      onClick={async () => {
                        if (!latestCode) return;
                        await navigator.clipboard.writeText(latestCode);
                        notifications.success('Copied');
                      }}
                      disabled={!latestCode}
                      className="flex shrink-0 items-center self-stretch border-l border-line-soft px-2 text-foreground/40 transition-colors hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateLabAdminCode(lab.id)}
                      disabled={!lab.isActive || generatingCodeForLab === lab.id}
                      className="flex shrink-0 items-center self-stretch border-l border-line-soft px-2.5 font-mono text-[10px] whitespace-nowrap tracking-[0.1em] text-muted-foreground/60 uppercase transition-colors hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {latestCode ? 'Regenerate' : 'Generate'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ConsolePanel>
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
