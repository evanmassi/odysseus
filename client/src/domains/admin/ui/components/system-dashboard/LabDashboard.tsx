/**
 * Lab Dashboard
 *
 * Drill-down view for a single lab: header, stat strip, demo settings, users, researchers, audit log.
 */

import { useState, useMemo } from 'react';

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Dna,
  RefreshCw,
  ShieldUser,
  SquarePen,
  TestTubeDiagonal,
  UsersRound,
  X,
} from 'lucide-react';

import { Button, ConsolePanel, IdStamp, SectionHeader, StatCell, Well } from '@shared/ui';
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
import { LabIdentityPanel } from './LabIdentityPanel';
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

  if (isLoading || !details) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
            Back to Labs
          </Button>
          <div className="text-center py-12 text-muted-foreground text-body-sm">
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

  const handleRename = () => {
    const name = newName.trim();
    if (!name) return;
    updateLabMutation.mutate(
      { id: labId, name },
      {
        onSuccess: () => {
          notifications.success('Lab renamed');
          setIsRenaming(false);
        },
      }
    );
  };

  const handleActivate = () => {
    activateLabMutation.mutate(labId, {
      onSuccess: () => notifications.success('Lab activated'),
    });
  };

  const handleDeactivate = () => {
    deactivateLabMutation.mutate(labId, {
      onSuccess: () => {
        notifications.success('Lab deactivated');
        setShowDeactivate(false);
      },
    });
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

        <LabIdentityPanel
          labId={labId}
          labName={lab.name}
          isActive={lab.isActive}
          isDemo={lab.isDemo}
          isSeeded={details.isSeeded}
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-stretch">
              <div className="flex min-w-0 flex-1 flex-col gap-2 px-5 pt-5 pb-4">
                {isRenaming ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="font-display text-display font-normal leading-none tracking-[-0.015em] bg-transparent border-b border-transparent [border-image:linear-gradient(90deg,hsl(var(--foreground)/0.25)_0%,hsl(var(--foreground)/0.18)_55%,hsl(var(--foreground)/0.08)_88%,transparent_100%)_1] px-1 focus:outline-none focus:[border-image:linear-gradient(90deg,hsl(var(--primary)/0.7)_0%,hsl(var(--primary)/0.5)_70%,transparent_100%)_1] text-foreground"
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
                    <h1 className="font-display text-display font-normal leading-none tracking-[-0.015em] text-foreground">
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
        </LabIdentityPanel>

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
