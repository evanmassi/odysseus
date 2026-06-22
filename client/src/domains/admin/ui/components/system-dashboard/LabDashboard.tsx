/**
 * Lab Dashboard
 *
 * Drill-down view for a single lab: header, stat strip, demo settings, users, researchers, audit log.
 */

import { useState, useMemo } from 'react';

import {
  ArrowLeft,
  BeanOff,
  Check,
  ChevronDown,
  CircleCheckBig,
  Dna,
  OctagonX,
  RefreshCw,
  ShieldUser,
  Sprout,
  SquarePen,
  TestTubeDiagonal,
  UsersRound,
  X,
} from 'lucide-react';

import { useResolvedTheme } from '@shared/hooks';
import { Button, ConsolePanel, IdStamp, SectionHeader, StatCell, Well } from '@shared/ui';
import { LabBadge, getLabBadgeTextClasses } from '@shared/ui/components/badges/LabBadge';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import {
  useActivateLabMutation,
  useDeactivateLabMutation,
  useUpdateLabMutation,
} from '../../../hooks/useLabMutations';
import { useLabDetailsQuery } from '../../../hooks/useLabQueries';
import { AuditLogViewer } from '../settings-modal/AuditLogViewer';

import { LabDemoSettings } from './LabDemoSettings';
import { LabPowerToggle } from './LabPowerToggle';
import { LabResearchersPanel } from './LabResearchersPanel';
import { LabUsersPanel } from './LabUsersPanel';

import type { LabDetailsUser } from '@odysseus/shared-schemas';
import type { SortConfig } from '@shared/ui';

interface LabDashboardProps {
  labId: string;
  onBack: () => void;
}

export function LabDashboard({ labId, onBack }: LabDashboardProps) {
  const { data: details, isLoading, isFetching, refetch } = useLabDetailsQuery(labId);
  const updateLabMutation = useUpdateLabMutation();
  const activateLabMutation = useActivateLabMutation();
  const deactivateLabMutation = useDeactivateLabMutation();

  const [userSortConfig, setUserSortConfig] = useState<SortConfig | undefined>(undefined);
  const [researcherSortConfig, setResearcherSortConfig] = useState<SortConfig | undefined>(
    undefined
  );
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const users = useMemo(() => {
    const source = details?.users ?? [];
    if (!userSortConfig) return source;
    return [...source].sort((a, b) => {
      const { columnId, direction } = userSortConfig;
      const aVal = String(a[columnId as keyof LabDetailsUser] ?? '');
      const bVal = String(b[columnId as keyof LabDetailsUser] ?? '');
      const cmp = aVal.localeCompare(bVal);
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [details?.users, userSortConfig]);

  const sortedResearchers = useMemo(() => {
    const source = details?.researchers ?? [];
    if (!researcherSortConfig) return source;
    return [...source].sort((a, b) => {
      const { columnId, direction } = researcherSortConfig;
      if (columnId === 'tubeCount') {
        const diff = a.tubeCount - b.tubeCount;
        return direction === 'asc' ? diff : -diff;
      }
      const aVal = columnId === 'name' ? a.lastName : '';
      const bVal = columnId === 'name' ? b.lastName : '';
      const cmp = aVal.localeCompare(bVal);
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [details?.researchers, researcherSortConfig]);

  const isDark = useResolvedTheme() === 'dark';

  if (isLoading || !details) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
            Back to Labs
          </Button>
          <div className="text-center py-12 text-muted-foreground text-sm">
            Loading lab details...
          </div>
        </div>
      </div>
    );
  }

  const { lab, researcherCount, tubeCount, storageSummary } = details;
  const adminCount = users.filter(u => u.role === 'lab_admin').length;
  const assignedTubes = details.researchers.reduce((sum, r) => sum + r.tubeCount, 0);
  const tubesWithoutResearcher = tubeCount - assignedTubes;

  const statusVar = lab.isActive ? '--color-success-bg' : '--color-danger-bg';
  const statusTextClass = lab.isActive ? 'text-success-text' : 'text-danger-text';
  const statusColor = `hsl(var(${statusVar}))`;
  const identityTextClass = getLabBadgeTextClasses(labId, lab.isDemo);

  const handleRename = async () => {
    if (!newName.trim()) return;
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
      setShowDeactivate(false);
    } catch {
      notifications.error('Failed to deactivate lab');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
            Back to Labs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            disabled={isLoading}
            leftIcon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>

        <div className="relative pt-7">
          <div
            aria-hidden
            className="absolute inset-x-0 top-3 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 0%, hsl(var(${statusVar})/0.6) 9%, hsl(var(${statusVar})/0.6) 91%, transparent 100%)`,
              boxShadow: isDark ? `0 0 8px hsl(var(${statusVar})/0.4)` : undefined,
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
                    className={`flex items-center gap-1.5 ${details.isSeeded ? 'text-success-text' : 'text-warning-text'}`}
                  >
                    {details.isSeeded ? <Sprout size={11} /> : <BeanOff size={11} />}
                    {details.isSeeded ? 'seeded' : 'not seeded'}
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
                labId={labId}
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
                  filter: isDark
                    ? 'drop-shadow(0 0 3px currentColor) drop-shadow(0 0 10px color-mix(in srgb, currentColor 55%, transparent))'
                    : undefined,
                }}
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-stretch">
                <div className="flex min-w-0 flex-1 flex-col gap-2 px-5 pt-5 pb-4">
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="font-display text-[32px] font-normal leading-none tracking-[-0.015em] bg-transparent border-b border-transparent [border-image:linear-gradient(90deg,hsl(var(--foreground)/0.25)_0%,hsl(var(--foreground)/0.18)_55%,hsl(var(--foreground)/0.08)_88%,transparent_100%)_1] px-1 focus:outline-none focus:[border-image:linear-gradient(90deg,hsl(var(--primary)/0.7)_0%,hsl(var(--primary)/0.5)_70%,transparent_100%)_1] text-foreground"
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                        ref={(el: HTMLInputElement | null) => el?.focus()}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={handleRename}
                        isLoading={updateLabMutation.isPending}
                        aria-label="Save"
                      >
                        <Check size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={() => setIsRenaming(false)}
                        aria-label="Cancel"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h1 className="font-display text-[32px] font-normal leading-none tracking-[-0.015em] text-foreground">
                        {lab.name}
                      </h1>
                      <Button
                        variant="ghost"
                        size="xs"
                        iconOnly
                        onClick={() => {
                          setNewName(lab.name);
                          setIsRenaming(true);
                        }}
                        aria-label="Rename lab"
                      >
                        <SquarePen size={12} />
                      </Button>
                    </div>
                  )}
                  <IdStamp
                    parts={[
                      `/${lab.slug}`,
                      `${storageSummary.tankCount} ${storageSummary.tankCount === 1 ? 'tank' : 'tanks'} · ${storageSummary.rackCount} ${storageSummary.rackCount === 1 ? 'rack' : 'racks'} · ${storageSummary.boxCount} ${storageSummary.boxCount === 1 ? 'box' : 'boxes'}`,
                    ]}
                  />
                </div>
                <Well className="flex aspect-square shrink-0 items-center justify-center">
                  <LabPowerToggle
                    isActive={lab.isActive}
                    isLoading={activateLabMutation.isPending || deactivateLabMutation.isPending}
                    onActivate={handleActivate}
                    onDeactivate={() => setShowDeactivate(true)}
                  />
                </Well>
              </div>

              <div className="grid grid-cols-4 border-t border-line-faint divide-x divide-line-faint [&>*:not(:first-child)]:[border-image:linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.10)_10%,hsl(var(--foreground)/0.10)_86%,transparent_100%)_1]">
                <StatCell label="Admins" value={adminCount} icon={<ShieldUser size={11} />} />
                <StatCell label="Users" value={users.length} icon={<UsersRound size={11} />} />
                <StatCell label="Researchers" value={researcherCount} icon={<Dna size={11} />} />
                <StatCell
                  label="Tubes"
                  value={tubeCount}
                  footer={
                    tubesWithoutResearcher > 0 ? `${tubesWithoutResearcher} unassigned` : undefined
                  }
                  tone={tubesWithoutResearcher > 0 ? 'warning' : 'default'}
                  icon={<TestTubeDiagonal size={11} />}
                />
              </div>
            </div>
          </ConsolePanel>
        </div>

        {lab.isDemo && <LabDemoSettings labId={labId} isSeeded={details.isSeeded} />}

        <LabUsersPanel
          labId={labId}
          users={users}
          sortConfig={userSortConfig}
          onSort={setUserSortConfig}
        />

        <LabResearchersPanel
          researchers={sortedResearchers}
          sortConfig={researcherSortConfig}
          onSort={setResearcherSortConfig}
          onResearcherDeleted={() => void refetch()}
        />

        <ConsolePanel intensity="soft">
          <div className="p-4">
            <SectionHeader
              title="Audit Log"
              meta={
                <button
                  type="button"
                  onClick={() => setShowAudit(o => !o)}
                  className="inline-flex items-center gap-1 uppercase transition-colors hover:text-foreground/70"
                >
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${showAudit ? '' : '-rotate-90'}`}
                  />
                  {showAudit ? 'Hide' : 'Show'}
                </button>
              }
            />
            {showAudit && <AuditLogViewer labId={labId} readOnly hideHeader />}
          </div>
        </ConsolePanel>

        <ConfirmDialog
          isOpen={showDeactivate}
          title="Deactivate Lab"
          message="Deactivating a lab prevents all its users from logging in. Lab data is preserved. This can be reversed."
          confirmText="Deactivate"
          variant="danger"
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivate(false)}
        />
      </div>
    </div>
  );
}
