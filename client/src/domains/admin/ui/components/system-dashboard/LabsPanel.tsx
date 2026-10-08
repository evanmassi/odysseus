import { useMemo, useState } from 'react';

import {
  ArrowRight,
  Copy,
  Dna,
  FlaskConical,
  ShieldUser,
  TestTubeDiagonal,
  TicketCheck,
  UsersRound,
} from 'lucide-react';

import { logger } from '@infra/logger';
import {
  Button,
  ConsolePanel,
  IdStamp,
  Input,
  SectionHeader,
  StatCell,
  Subsection,
  Well,
} from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { MS_PER_HOUR, notifications } from '@shared/utils';

import {
  useCreateLabMutation,
  useDeactivateLabMutation,
  useActivateLabMutation,
  useCreateLabInviteCodeMutation,
} from '../../../hooks/useLabMutations';
import { useLabsQuery, useSystemOverviewQuery } from '../../../hooks/useLabQueries';

import { LabIdentityPanel } from './LabIdentityPanel';
import { LabPowerToggle } from './LabPowerToggle';

const LAB_ADMIN_CODE_EXPIRY_MS = 48 * MS_PER_HOUR;

interface LabsPanelProps {
  onSelectLab: (labId: string) => void;
  isCreatingLab: boolean;
  onCloseCreateLab: () => void;
}

export function LabsPanel({ onSelectLab, isCreatingLab, onCloseCreateLab }: LabsPanelProps) {
  const { data: labs = [], isLoading } = useLabsQuery();
  const { data: overview } = useSystemOverviewQuery();
  const createLabMutation = useCreateLabMutation();
  const deactivateLabMutation = useDeactivateLabMutation();
  const activateLabMutation = useActivateLabMutation();
  const createInviteCodeMutation = useCreateLabInviteCodeMutation();

  const regularLabs = useMemo(
    () => labs.filter(l => !l.isDemo).sort((a, b) => a.name.localeCompare(b.name)),
    [labs]
  );
  const demoLabs = useMemo(() => labs.filter(l => l.isDemo), [labs]);

  const [newLabName, setNewLabName] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);
  const [generatingCodeForLab, setGeneratingCodeForLab] = useState<string | null>(null);
  const [labInviteCodes, setLabInviteCodes] = useState<Record<string, string>>({});

  const handleCreateLab = () => {
    const name = newLabName.trim();
    if (!name) return;
    if (createLabMutation.isPending) return;
    createLabMutation.mutate(
      { name },
      {
        onSuccess: () => {
          notifications.success(`Lab "${name}" created`);
          setNewLabName('');
          onCloseCreateLab();
        },
      }
    );
  };

  const handleDeactivateLab = (labId: string) => {
    deactivateLabMutation.mutate(labId, {
      onSuccess: () => {
        notifications.success('Lab deactivated');
        setDeactivateTarget(null);
      },
    });
  };

  const handleActivateLab = (labId: string) => {
    activateLabMutation.mutate(labId, {
      onSuccess: () => notifications.success('Lab activated'),
    });
  };

  const handleGenerateLabAdminCode = (labId: string) => {
    setGeneratingCodeForLab(labId);
    const expiresAt = new Date(Date.now() + LAB_ADMIN_CODE_EXPIRY_MS).toISOString();
    createInviteCodeMutation.mutate(
      { labId, role: 'lab_admin', createResearcher: true, maxUses: 1, expiresAt },
      {
        onSuccess: async code => {
          setLabInviteCodes(prev => ({ ...prev, [labId]: code.code }));
          try {
            await navigator.clipboard.writeText(code.code);
            notifications.success('Lab admin invite code created and copied to clipboard');
          } catch (error) {
            logger.error('Failed to copy invite code to clipboard', { error });
            notifications.success('Lab admin invite code created. Copy it from the card below.');
          }
        },
        onSettled: () => setGeneratingCodeForLab(null),
      }
    );
  };

  const getLabStats = (labId: string) => {
    return overview?.labStats.find(s => s.labId === labId);
  };

  const renderLabCard = (lab: (typeof labs)[number]) => {
    const stats = getLabStats(lab.id);
    const latestCode = labInviteCodes[lab.id];
    const codeSplitAt = latestCode ? latestCode.indexOf('-') + 1 : 0;

    return (
      <LabIdentityPanel
        key={lab.id}
        labId={lab.id}
        labName={lab.name}
        isActive={lab.isActive}
        isDemo={lab.isDemo}
        isSeeded={lab.isSeeded ?? false}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-stretch">
            <div className="flex min-w-0 flex-1 flex-col gap-2 px-5 pt-5 pb-4">
              <h3 className="font-display text-display leading-none font-medium tracking-[-0.01em]">
                <button
                  type="button"
                  onClick={() => onSelectLab(lab.id)}
                  className="group/open flex cursor-pointer items-center gap-3 text-left text-foreground/85 outline-none transition-colors duration-500 hover:text-primary hover:duration-75 focus-visible:text-primary focus-visible:duration-75 dark:hover:text-foreground dark:focus-visible:text-foreground"
                >
                  <span>{lab.name}</span>
                  <ArrowRight
                    size={20}
                    className="text-muted-foreground transition-[color,transform] duration-200 group-hover/open:translate-x-1 group-hover/open:text-primary group-focus-visible/open:translate-x-1 group-focus-visible/open:text-primary"
                  />
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
            <Well className="flex w-28 shrink-0 items-center justify-center">
              <LabPowerToggle
                isActive={lab.isActive}
                isLoading={
                  (activateLabMutation.isPending && activateLabMutation.variables === lab.id) ||
                  (deactivateLabMutation.isPending && deactivateLabMutation.variables === lab.id)
                }
                onActivate={() => handleActivateLab(lab.id)}
                onDeactivate={() => setDeactivateTarget(lab.id)}
              />
            </Well>
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
                <span className="flex items-center gap-2 type-label text-label-2xs tracking-label-wide text-muted-foreground">
                  <TicketCheck size={11} className="shrink-0" />
                  Lab Admin Code
                </span>
                <div className="flex items-center py-1.5">
                  <code
                    className={`mr-auto pr-2 font-mono text-data-lg font-medium leading-none ${latestCode ? 'text-foreground' : 'text-foreground/25 select-none'}`}
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
                      try {
                        await navigator.clipboard.writeText(latestCode);
                        notifications.success('Copied');
                      } catch (error) {
                        logger.error('Failed to copy invite code to clipboard', { error });
                        notifications.error('Failed to copy. Select the code and copy manually.');
                      }
                    }}
                    disabled={!latestCode}
                    className="flex shrink-0 items-center self-stretch px-2 text-foreground/40 transition-colors hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateLabAdminCode(lab.id)}
                    disabled={!lab.isActive || generatingCodeForLab === lab.id}
                    className="flex shrink-0 items-center self-stretch px-2.5 type-label text-label-2xs whitespace-nowrap tracking-meta text-muted-foreground/60 transition-colors hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {latestCode ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </LabIdentityPanel>
    );
  };

  return (
    <div className="space-y-4">
      {isCreatingLab && (
        <ConsolePanel intensity="soft">
          <div className="p-4">
            <SectionHeader title="New Lab" icon={<FlaskConical size={13} />} />
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label
                  htmlFor="new-lab-name"
                  className="mb-1.5 block type-label text-label-2xs tracking-label-wide text-muted-foreground"
                >
                  Lab name
                </label>
                <Input
                  id="new-lab-name"
                  size="sm"
                  fullWidth
                  value={newLabName}
                  onValueChange={setNewLabName}
                  onKeyDown={e => e.key === 'Enter' && handleCreateLab()}
                  placeholder="e.g., Smith Lab"
                  maxLength={200}
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- reveal-on-demand form; focus its only field
                  autoFocus
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
                    onCloseCreateLab();
                    setNewLabName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </ConsolePanel>
      )}

      {isLoading && labs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-body-sm">Loading labs...</div>
      ) : (
        <div>
          {regularLabs.length > 0 && (
            <Subsection
              title="Registered"
              meta={`${regularLabs.length} ${regularLabs.length === 1 ? 'record' : 'records'}`}
              isCompact
            >
              <div className="space-y-5 pt-2">{regularLabs.map(lab => renderLabCard(lab))}</div>
            </Subsection>
          )}

          {demoLabs.length > 0 && (
            <Subsection
              title="Demo"
              meta={`${demoLabs.length} ${demoLabs.length === 1 ? 'record' : 'records'}`}
              isCompact
            >
              <div className="space-y-5 pt-2">{demoLabs.map(lab => renderLabCard(lab))}</div>
            </Subsection>
          )}
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
  );
}
